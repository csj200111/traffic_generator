package com.traffic.generator.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.Map;

public class TrafficRequest {

    @NotBlank(message = "대상 URL은 필수입니다.")
    @Pattern(regexp = "^https?://.*", message = "http 또는 https URL만 허용됩니다.")
    private String targetUrl;

    @NotNull(message = "총 요청 수는 필수입니다.")
    @Min(value = 1, message = "총 요청 수는 최소 1이어야 합니다.")
    @Max(value = 10000, message = "총 요청 수는 최대 10000입니다.")
    private Integer totalRequests;

    @NotNull(message = "동시 요청 수는 필수입니다.")
    @Min(value = 1, message = "동시 요청 수는 최소 1이어야 합니다.")
    @Max(value = 500, message = "동시 요청 수는 최대 500입니다.")
    private Integer concurrency;

    @NotBlank(message = "HTTP 메서드는 필수입니다.")
    @Pattern(regexp = "^(GET|POST|PUT|DELETE)$", message = "GET, POST, PUT, DELETE만 허용됩니다.")
    private String httpMethod;

    private Map<String, String> headers;

    private String requestBody;

    public String getTargetUrl() {
        return targetUrl;
    }

    public void setTargetUrl(String targetUrl) {
        this.targetUrl = targetUrl;
    }

    public Integer getTotalRequests() {
        return totalRequests;
    }

    public void setTotalRequests(Integer totalRequests) {
        this.totalRequests = totalRequests;
    }

    public Integer getConcurrency() {
        return concurrency;
    }

    public void setConcurrency(Integer concurrency) {
        this.concurrency = concurrency;
    }

    public String getHttpMethod() {
        return httpMethod;
    }

    public void setHttpMethod(String httpMethod) {
        this.httpMethod = httpMethod;
    }

    public Map<String, String> getHeaders() {
        return headers;
    }

    public void setHeaders(Map<String, String> headers) {
        this.headers = headers;
    }

    public String getRequestBody() {
        return requestBody;
    }

    public void setRequestBody(String requestBody) {
        this.requestBody = requestBody;
    }
}
