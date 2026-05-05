package com.traffic.generator.executor;

import com.traffic.generator.dto.TrafficProgress;
import com.traffic.generator.dto.TrafficRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class HttpRequestExecutor {

    private static final Logger log = LoggerFactory.getLogger(HttpRequestExecutor.class);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);

    private final HttpClient httpClient;

    public HttpRequestExecutor() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public void execute(TrafficRequest request, TrafficProgress progress, AtomicBoolean cancelled) {
        int totalRequests = request.getTotalRequests();
        int concurrency = request.getConcurrency();
        boolean rampUp = request.isRampUp();
        int rampUpSteps = request.getRampUpSteps();

        ExecutorService executor = Executors.newCachedThreadPool();
        long startTime = System.currentTimeMillis();

        try {
            if (rampUp && rampUpSteps > 1) {
                executeWithRampUp(request, progress, cancelled, executor, startTime, totalRequests, concurrency, rampUpSteps);
            } else {
                executeFlat(request, progress, cancelled, executor, startTime, totalRequests, concurrency);
            }

            if (!cancelled.get()) {
                progress.setStatus("COMPLETED");
            }
            progress.setElapsedTimeMs(System.currentTimeMillis() - startTime);
            progress.updateTps(startTime);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            progress.setStatus("FAILED");
        } finally {
            executor.shutdown();
        }
    }

    private void executeFlat(TrafficRequest request, TrafficProgress progress, AtomicBoolean cancelled,
                             ExecutorService executor, long startTime, int totalRequests, int concurrency) throws InterruptedException {
        Semaphore semaphore = new Semaphore(concurrency);
        progress.setCurrentConcurrency(concurrency);

        sendBatch(request, progress, cancelled, executor, semaphore, startTime, totalRequests);
        waitForCompletion(semaphore, concurrency);
    }

    private void executeWithRampUp(TrafficRequest request, TrafficProgress progress, AtomicBoolean cancelled,
                                   ExecutorService executor, long startTime, int totalRequests, int maxConcurrency, int steps) throws InterruptedException {
        int requestsPerStep = totalRequests / steps;
        int remainingRequests = totalRequests;

        for (int step = 1; step <= steps && !cancelled.get(); step++) {
            int stepConcurrency = (int) Math.ceil((double) maxConcurrency * step / steps);
            int stepRequests = (step == steps) ? remainingRequests : requestsPerStep;
            remainingRequests -= stepRequests;

            Semaphore semaphore = new Semaphore(stepConcurrency);
            progress.setCurrentConcurrency(stepConcurrency);
            log.info("Ramp-up step {}/{}: concurrency={}, requests={}", step, steps, stepConcurrency, stepRequests);

            sendBatch(request, progress, cancelled, executor, semaphore, startTime, stepRequests);
            waitForCompletion(semaphore, stepConcurrency);
        }
    }

    private void sendBatch(TrafficRequest request, TrafficProgress progress, AtomicBoolean cancelled,
                           ExecutorService executor, Semaphore semaphore, long startTime, int count) throws InterruptedException {
        for (int i = 0; i < count; i++) {
            if (cancelled.get()) {
                progress.setStatus("STOPPED");
                break;
            }

            semaphore.acquire();
            executor.submit(() -> {
                try {
                    if (cancelled.get()) return;

                    long reqStart = System.currentTimeMillis();
                    int statusCode = sendRequest(request);
                    long responseTime = System.currentTimeMillis() - reqStart;

                    synchronized (progress) {
                        if (statusCode >= 400) {
                            progress.incrementFail();
                        } else {
                            progress.incrementSuccess();
                        }
                        progress.recordResponseTime(responseTime);
                        progress.recordStatusCode(statusCode);
                        progress.setElapsedTimeMs(System.currentTimeMillis() - startTime);
                        progress.updateTps(startTime);
                    }
                } catch (Exception e) {
                    synchronized (progress) {
                        progress.incrementFail();
                        progress.setElapsedTimeMs(System.currentTimeMillis() - startTime);
                        progress.updateTps(startTime);
                    }
                    log.warn("Request failed: {}", e.getMessage());
                } finally {
                    semaphore.release();
                }
            });
        }
    }

    private void waitForCompletion(Semaphore semaphore, int permits) throws InterruptedException {
        for (int i = 0; i < permits; i++) {
            semaphore.acquire();
        }
    }

    private int sendRequest(TrafficRequest request) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(request.getTargetUrl()))
                .timeout(REQUEST_TIMEOUT);

        if (request.getHeaders() != null) {
            for (Map.Entry<String, String> entry : request.getHeaders().entrySet()) {
                builder.header(entry.getKey(), entry.getValue());
            }
        }

        HttpRequest httpRequest = switch (request.getHttpMethod().toUpperCase()) {
            case "POST" -> builder.POST(bodyPublisher(request.getRequestBody())).build();
            case "PUT" -> builder.PUT(bodyPublisher(request.getRequestBody())).build();
            case "DELETE" -> builder.DELETE().build();
            default -> builder.GET().build();
        };

        HttpResponse<Void> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.discarding());
        return response.statusCode();
    }

    private HttpRequest.BodyPublisher bodyPublisher(String body) {
        return body != null && !body.isBlank()
                ? HttpRequest.BodyPublishers.ofString(body)
                : HttpRequest.BodyPublishers.noBody();
    }
}
