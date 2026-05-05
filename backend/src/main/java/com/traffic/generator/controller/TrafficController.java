package com.traffic.generator.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.traffic.generator.dto.AutoThresholdProgress;
import com.traffic.generator.dto.AutoThresholdRequest;
import com.traffic.generator.dto.ThresholdProgress;
import com.traffic.generator.dto.ThresholdRequest;
import com.traffic.generator.dto.TrafficProgress;
import com.traffic.generator.dto.TrafficRequest;
import com.traffic.generator.dto.TrafficResponse;
import com.traffic.generator.service.AutoThresholdService;
import com.traffic.generator.service.ThresholdService;
import com.traffic.generator.service.TrafficService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/traffic")
public class TrafficController {

    private final TrafficService trafficService;
    private final ThresholdService thresholdService;
    private final AutoThresholdService autoThresholdService;
    private final ObjectMapper objectMapper;
    private final ScheduledExecutorService sseScheduler = Executors.newScheduledThreadPool(5);

    public TrafficController(TrafficService trafficService, ThresholdService thresholdService,
                             AutoThresholdService autoThresholdService, ObjectMapper objectMapper) {
        this.trafficService = trafficService;
        this.thresholdService = thresholdService;
        this.autoThresholdService = autoThresholdService;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/start")
    public ResponseEntity<?> startTraffic(@Valid @RequestBody TrafficRequest request) {
        TrafficResponse response = trafficService.startTraffic(request);

        if ("REJECTED".equals(response.getStatus())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", Map.of(
                            "code", "TOO_MANY_TASKS",
                            "message", response.getMessage())));
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/status/{taskId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter getStatus(@PathVariable String taskId) {
        SseEmitter emitter = new SseEmitter(300_000L); // 5분 타임아웃

        TrafficProgress progress = trafficService.getProgress(taskId);
        if (progress == null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("error")
                        .data("{\"error\":{\"code\":\"TASK_NOT_FOUND\",\"message\":\"존재하지 않는 작업입니다.\"}}"));
                emitter.complete();
            } catch (IOException e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        var future = sseScheduler.scheduleAtFixedRate(() -> {
            try {
                TrafficProgress current = trafficService.getProgress(taskId);
                if (current == null) {
                    emitter.complete();
                    return;
                }

                String json;
                synchronized (current) {
                    json = objectMapper.writeValueAsString(current);
                }
                emitter.send(SseEmitter.event().data(json));

                if (!"RUNNING".equals(current.getStatus())) {
                    emitter.complete();
                }
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        }, 0, 500, TimeUnit.MILLISECONDS);

        emitter.onCompletion(() -> future.cancel(true));
        emitter.onTimeout(() -> future.cancel(true));
        emitter.onError(e -> future.cancel(true));

        return emitter;
    }

    @PostMapping("/stop/{taskId}")
    public ResponseEntity<?> stopTraffic(@PathVariable String taskId) {
        TrafficResponse response = trafficService.stopTraffic(taskId);

        if (response == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", Map.of(
                            "code", "TASK_NOT_FOUND",
                            "message", "존재하지 않는 작업입니다.")));
        }

        if (!"STOPPED".equals(response.getStatus()) || !response.getMessage().contains("중지되었습니다")) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", Map.of(
                            "code", "TASK_NOT_RUNNING",
                            "message", response.getMessage())));
        }

        return ResponseEntity.ok(response);
    }

    // ── Threshold endpoints ──────────────────────────────────────

    @PostMapping("/threshold")
    public ResponseEntity<?> startThreshold(@Valid @RequestBody ThresholdRequest request) {
        TrafficResponse response = thresholdService.startThreshold(request);

        if ("REJECTED".equals(response.getStatus())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", Map.of(
                            "code", "TOO_MANY_TASKS",
                            "message", response.getMessage())));
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/threshold/status/{taskId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter getThresholdStatus(@PathVariable String taskId) {
        SseEmitter emitter = new SseEmitter(600_000L); // 10분 타임아웃

        ThresholdProgress progress = thresholdService.getProgress(taskId);
        if (progress == null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("error")
                        .data("{\"error\":{\"code\":\"TASK_NOT_FOUND\",\"message\":\"존재하지 않는 작업입니다.\"}}"));
                emitter.complete();
            } catch (IOException e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        var future = sseScheduler.scheduleAtFixedRate(() -> {
            try {
                ThresholdProgress current = thresholdService.getProgress(taskId);
                if (current == null) {
                    emitter.complete();
                    return;
                }

                String json = objectMapper.writeValueAsString(current);
                emitter.send(SseEmitter.event().data(json));

                if (!"RUNNING".equals(current.getStatus())) {
                    emitter.complete();
                }
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        }, 0, 500, TimeUnit.MILLISECONDS);

        emitter.onCompletion(() -> future.cancel(true));
        emitter.onTimeout(() -> future.cancel(true));
        emitter.onError(e -> future.cancel(true));

        return emitter;
    }

    @PostMapping("/threshold/stop/{taskId}")
    public ResponseEntity<?> stopThreshold(@PathVariable String taskId) {
        TrafficResponse response = thresholdService.stopThreshold(taskId);

        if (response == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", Map.of(
                            "code", "TASK_NOT_FOUND",
                            "message", "존재하지 않는 작업입니다.")));
        }

        return ResponseEntity.ok(response);
    }

    // ── Auto Threshold endpoints ─────────────────────────────────

    @PostMapping("/auto-threshold")
    public ResponseEntity<?> startAutoThreshold(@Valid @RequestBody AutoThresholdRequest request) {
        TrafficResponse response = autoThresholdService.startAutoThreshold(request);

        if ("REJECTED".equals(response.getStatus())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", Map.of(
                            "code", "TOO_MANY_TASKS",
                            "message", response.getMessage())));
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/auto-threshold/status/{taskId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter getAutoThresholdStatus(@PathVariable String taskId) {
        SseEmitter emitter = new SseEmitter(1200_000L); // 20분 타임아웃

        AutoThresholdProgress progress = autoThresholdService.getProgress(taskId);
        if (progress == null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("error")
                        .data("{\"error\":{\"code\":\"TASK_NOT_FOUND\",\"message\":\"존재하지 않는 작업입니다.\"}}"));
                emitter.complete();
            } catch (IOException e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        var future = sseScheduler.scheduleAtFixedRate(() -> {
            try {
                AutoThresholdProgress current = autoThresholdService.getProgress(taskId);
                if (current == null) { emitter.complete(); return; }

                String json = objectMapper.writeValueAsString(current);
                emitter.send(SseEmitter.event().data(json));

                if (!"RUNNING".equals(current.getStatus())) {
                    emitter.complete();
                }
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        }, 0, 500, TimeUnit.MILLISECONDS);

        emitter.onCompletion(() -> future.cancel(true));
        emitter.onTimeout(() -> future.cancel(true));
        emitter.onError(e -> future.cancel(true));

        return emitter;
    }

    @PostMapping("/auto-threshold/stop/{taskId}")
    public ResponseEntity<?> stopAutoThreshold(@PathVariable String taskId) {
        TrafficResponse response = autoThresholdService.stopAutoThreshold(taskId);

        if (response == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", Map.of(
                            "code", "TASK_NOT_FOUND",
                            "message", "존재하지 않는 작업입니다.")));
        }

        return ResponseEntity.ok(response);
    }
}
