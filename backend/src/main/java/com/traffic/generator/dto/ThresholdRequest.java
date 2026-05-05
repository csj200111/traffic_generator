package com.traffic.generator.dto;

import jakarta.validation.constraints.*;
import java.util.Map;

public class ThresholdRequest {

    @NotBlank(message = "대상 URL은 필수입니다.")
    @Pattern(regexp = "^https?://.*", message = "http 또는 https URL만 허용됩니다.")
    private String targetUrl;

    @NotBlank(message = "HTTP 메서드는 필수입니다.")
    @Pattern(regexp = "^(GET|POST|PUT|DELETE)$", message = "GET, POST, PUT, DELETE만 허용됩니다.")
    private String httpMethod = "GET";

    private Map<String, String> headers;

    private String requestBody;

    @Min(value = 1, message = "시작 동시접속은 최소 1입니다.")
    @Max(value = 100, message = "시작 동시접속은 최대 100입니다.")
    private int startConcurrency = 5;

    @Min(value = 1, message = "증가 단계는 최소 1입니다.")
    @Max(value = 2000, message = "증가 단계는 최대 2000입니다.")
    private int concurrencyStep = 5;

    @Min(value = 1, message = "최대 동시접속은 최소 1입니다.")
    @Max(value = 2000, message = "최대 동시접속은 최대 2000입니다.")
    private int maxConcurrency = 100;

    @Min(value = 10, message = "단계별 요청 수는 최소 10입니다.")
    @Max(value = 500, message = "단계별 요청 수는 최대 500입니다.")
    private int requestsPerStep = 50;

    @DecimalMin(value = "0.0", message = "에러율 임계값은 최소 0%입니다.")
    @DecimalMax(value = "50.0", message = "에러율 임계값은 최대 50%입니다.")
    private double errorRateThreshold = 5.0;

    @Min(value = 100, message = "응답시간 임계값은 최소 100ms입니다.")
    @Max(value = 30000, message = "응답시간 임계값은 최대 30000ms입니다.")
    private int latencyThresholdMs = 2000;

    private boolean autoStop = true;

    public String getTargetUrl() { return targetUrl; }
    public void setTargetUrl(String targetUrl) { this.targetUrl = targetUrl; }

    public String getHttpMethod() { return httpMethod; }
    public void setHttpMethod(String httpMethod) { this.httpMethod = httpMethod; }

    public Map<String, String> getHeaders() { return headers; }
    public void setHeaders(Map<String, String> headers) { this.headers = headers; }

    public String getRequestBody() { return requestBody; }
    public void setRequestBody(String requestBody) { this.requestBody = requestBody; }

    public int getStartConcurrency() { return startConcurrency; }
    public void setStartConcurrency(int startConcurrency) { this.startConcurrency = startConcurrency; }

    public int getConcurrencyStep() { return concurrencyStep; }
    public void setConcurrencyStep(int concurrencyStep) { this.concurrencyStep = concurrencyStep; }

    public int getMaxConcurrency() { return maxConcurrency; }
    public void setMaxConcurrency(int maxConcurrency) { this.maxConcurrency = maxConcurrency; }

    public int getRequestsPerStep() { return requestsPerStep; }
    public void setRequestsPerStep(int requestsPerStep) { this.requestsPerStep = requestsPerStep; }

    public double getErrorRateThreshold() { return errorRateThreshold; }
    public void setErrorRateThreshold(double errorRateThreshold) { this.errorRateThreshold = errorRateThreshold; }

    public int getLatencyThresholdMs() { return latencyThresholdMs; }
    public void setLatencyThresholdMs(int latencyThresholdMs) { this.latencyThresholdMs = latencyThresholdMs; }

    public boolean isAutoStop() { return autoStop; }
    public void setAutoStop(boolean autoStop) { this.autoStop = autoStop; }
}
