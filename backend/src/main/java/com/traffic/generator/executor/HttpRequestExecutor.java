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
        Semaphore semaphore = new Semaphore(concurrency);
        ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
        long startTime = System.currentTimeMillis();

        try {
            for (int i = 0; i < totalRequests; i++) {
                if (cancelled.get()) {
                    progress.setStatus("STOPPED");
                    break;
                }

                semaphore.acquire();
                executor.submit(() -> {
                    try {
                        if (cancelled.get()) {
                            return;
                        }
                        sendRequest(request);
                        synchronized (progress) {
                            progress.incrementSuccess();
                            progress.setElapsedTimeMs(System.currentTimeMillis() - startTime);
                        }
                    } catch (Exception e) {
                        synchronized (progress) {
                            progress.incrementFail();
                            progress.setElapsedTimeMs(System.currentTimeMillis() - startTime);
                        }
                        log.debug("Request failed: {}", e.getMessage());
                    } finally {
                        semaphore.release();
                    }
                });
            }

            // 모든 요청 완료 대기
            for (int i = 0; i < concurrency; i++) {
                semaphore.acquire();
            }

            if (!cancelled.get()) {
                progress.setStatus("COMPLETED");
            }
            progress.setElapsedTimeMs(System.currentTimeMillis() - startTime);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            progress.setStatus("FAILED");
        } finally {
            executor.shutdown();
        }
    }

    private void sendRequest(TrafficRequest request) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(request.getTargetUrl()))
                .timeout(REQUEST_TIMEOUT);

        // 커스텀 헤더 추가
        if (request.getHeaders() != null) {
            for (Map.Entry<String, String> entry : request.getHeaders().entrySet()) {
                builder.header(entry.getKey(), entry.getValue());
            }
        }

        // HTTP 메서드에 따른 요청 생성
        HttpRequest httpRequest = switch (request.getHttpMethod().toUpperCase()) {
            case "POST" -> builder.POST(bodyPublisher(request.getRequestBody())).build();
            case "PUT" -> builder.PUT(bodyPublisher(request.getRequestBody())).build();
            case "DELETE" -> builder.DELETE().build();
            default -> builder.GET().build();
        };

        httpClient.send(httpRequest, HttpResponse.BodyHandlers.discarding());
    }

    private HttpRequest.BodyPublisher bodyPublisher(String body) {
        return body != null && !body.isBlank()
                ? HttpRequest.BodyPublishers.ofString(body)
                : HttpRequest.BodyPublishers.noBody();
    }
}
