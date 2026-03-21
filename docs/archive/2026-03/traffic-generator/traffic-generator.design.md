# Traffic Generator Design Document

> **Summary**: 특정 URL에 설정된 수치만큼 트래픽을 발생시키는 웹서비스의 기술 설계
>
> **Project**: traffic-generator
> **Version**: 0.1.0
> **Author**: csj20
> **Date**: 2026-03-21
> **Status**: Draft
> **Planning Doc**: [traffic-generator.plan.md](../../01-plan/features/traffic-generator.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 사용자가 직관적으로 트래픽 설정 및 실행을 할 수 있는 SPA 구현
- Spring Boot 기반 백엔드에서 비동기로 대량 HTTP 요청을 처리
- SSE(Server-Sent Events)를 통한 실시간 진행 상태 전달
- 프론트엔드/백엔드 분리 구조로 독립적 배포 가능

### 1.2 Design Principles

- 단순성: 설정 → 실행 → 모니터링 3단계 UX
- 비동기 처리: 대량 요청을 논블로킹으로 처리하여 서버 안정성 확보
- 관심사 분리: Frontend(UI) / Backend(트래픽 생성 엔진) 명확 분리

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────┐         ┌──────────────────────────────┐
│   React App      │         │   Spring Boot Server         │
│   (Frontend)     │         │   (Backend)                  │
│                  │  REST   │                              │
│  TrafficForm ────┼────────▶│  TrafficController           │
│                  │  POST   │    │                         │
│                  │         │    ▼                         │
│  ResultPanel ◀───┼─────── │  TrafficService              │
│                  │  SSE    │    │                         │
│                  │         │    ▼                         │
│                  │         │  HttpRequestExecutor         │
│                  │         │  (AsyncThreadPool)           │
└──────────────────┘         └──────────────────────────────┘
        :3000                          :8080
```

### 2.2 Data Flow

```
1. 사용자 입력 (URL, 요청수, 동시성, HTTP 메서드)
       │
       ▼
2. POST /api/traffic/start → TrafficController
       │
       ▼
3. TrafficService: 작업 생성 (taskId 발급)
       │
       ▼
4. HttpRequestExecutor: Virtual Thread + Semaphore 기반 비동기 HTTP 요청 실행
       │
       ▼
5. SSE /api/traffic/status/{taskId} → 실시간 진행률 전송
       │
       ▼
6. Frontend ResultPanel: 진행률, 성공/실패 수 실시간 표시
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| React App | Spring Boot API | 트래픽 생성 요청 및 상태 조회 |
| TrafficController | TrafficService | 요청 라우팅 |
| TrafficService | HttpRequestExecutor | 비동기 HTTP 요청 실행 |
| HttpRequestExecutor | Java HttpClient / RestTemplate | 실제 HTTP 호출 |

---

## 3. Data Model

### 3.1 DTO 정의

```java
// 트래픽 생성 요청 DTO
public class TrafficRequest {
    private String targetUrl;       // 대상 URL
    private int totalRequests;      // 총 요청 수
    private int concurrency;        // 동시 요청 수
    private String httpMethod;      // GET, POST, PUT, DELETE
    private Map<String, String> headers;  // 커스텀 헤더 (선택)
    private String requestBody;     // POST/PUT 요청 본문 (선택)
}

// 트래픽 생성 응답 DTO
public class TrafficResponse {
    private String taskId;          // 작업 식별자
    private String status;          // RUNNING, COMPLETED, STOPPED, FAILED
    private String message;         // 상태 메시지
}

// 실시간 진행 상태 DTO (SSE 이벤트)
public class TrafficProgress {
    private String taskId;
    private int totalRequests;      // 전체 요청 수
    private int completedRequests;  // 완료된 요청 수
    private int successCount;       // 성공 수
    private int failCount;          // 실패 수
    private double progressRate;    // 진행률 (0.0 ~ 1.0)
    private String status;          // RUNNING, COMPLETED, STOPPED
    private long elapsedTimeMs;     // 경과 시간 (ms)
}
```

### 3.2 Frontend 타입 정의

```javascript
// 트래픽 설정 상태
const trafficConfig = {
  targetUrl: '',        // string
  totalRequests: 100,   // number
  concurrency: 10,      // number
  httpMethod: 'GET',    // 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers: {},          // object (optional)
  requestBody: '',      // string (optional)
};

// 실시간 진행 상태
const trafficProgress = {
  taskId: '',
  totalRequests: 0,
  completedRequests: 0,
  successCount: 0,
  failCount: 0,
  progressRate: 0,
  status: 'IDLE',       // 'IDLE' | 'RUNNING' | 'COMPLETED' | 'STOPPED'
  elapsedTimeMs: 0,
};
```

### 3.3 Database Schema (v1에서는 미사용, 향후 확장용)

```sql
-- 향후 트래픽 이력 저장이 필요할 경우
CREATE TABLE traffic_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  target_url VARCHAR(2048) NOT NULL,
  total_requests INT NOT NULL,
  concurrency INT NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  success_count INT DEFAULT 0,
  fail_count INT DEFAULT 0,
  elapsed_time_ms BIGINT DEFAULT 0,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/traffic/start | 트래픽 생성 시작 | No |
| GET | /api/traffic/status/{taskId} | 실시간 진행 상태 (SSE) | No |
| POST | /api/traffic/stop/{taskId} | 트래픽 생성 중지 | No |

### 4.2 Detailed Specification

#### `POST /api/traffic/start`

트래픽 생성 작업을 시작한다.

**Request:**
```json
{
  "targetUrl": "https://example.com/api/test",
  "totalRequests": 1000,
  "concurrency": 50,
  "httpMethod": "GET",
  "headers": {},
  "requestBody": null
}
```

**Response (200 OK):**
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "RUNNING",
  "message": "트래픽 생성이 시작되었습니다."
}
```

**Validation Rules:**
- `targetUrl`: 필수, 유효한 URL 형식
- `totalRequests`: 필수, 1 ~ 10000 범위
- `concurrency`: 필수, 1 ~ 500 범위
- `httpMethod`: 필수, GET/POST/PUT/DELETE 중 하나

**Error Responses:**
- `400 Bad Request`: 입력값 검증 실패
- `429 Too Many Requests`: 동시 작업 수 초과 (최대 5개)

---

#### `GET /api/traffic/status/{taskId}`

SSE 스트림으로 실시간 진행 상태를 전송한다.

**Response (200 OK, Content-Type: text/event-stream):**
```
data: {"taskId":"550e...","totalRequests":1000,"completedRequests":150,"successCount":148,"failCount":2,"progressRate":0.15,"status":"RUNNING","elapsedTimeMs":3200}

data: {"taskId":"550e...","totalRequests":1000,"completedRequests":300,"successCount":295,"failCount":5,"progressRate":0.30,"status":"RUNNING","elapsedTimeMs":6100}

data: {"taskId":"550e...","totalRequests":1000,"completedRequests":1000,"successCount":985,"failCount":15,"progressRate":1.0,"status":"COMPLETED","elapsedTimeMs":20500}
```

**Error Responses:**
- `404 Not Found`: 존재하지 않는 taskId

---

#### `POST /api/traffic/stop/{taskId}`

진행 중인 트래픽 생성을 중지한다.

**Response (200 OK):**
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "STOPPED",
  "message": "트래픽 생성이 중지되었습니다."
}
```

**Error Responses:**
- `404 Not Found`: 존재하지 않는 taskId
- `409 Conflict`: 이미 완료/중지된 작업

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌──────────────────────────────────────────────────────┐
│  Traffic Generator                          [v0.1.0] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─── 설정 영역 ──────────────────────────────────┐  │
│  │  Target URL:  [https://__________________ ]    │  │
│  │  HTTP Method: [GET ▾]                          │  │
│  │  Total Requests: [1000]                        │  │
│  │  Concurrency:    [50  ]                        │  │
│  │                                                │  │
│  │  [▶ Start]  [■ Stop]                           │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─── 결과 영역 ──────────────────────────────────┐  │
│  │  Status: RUNNING                               │  │
│  │  ████████████░░░░░░░░  60% (600/1000)          │  │
│  │                                                │  │
│  │  Success: 590   Fail: 10   Time: 12.3s         │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ⚠ 본 서비스는 자신의 서버 테스트 용도로만 사용하세요.  │
└──────────────────────────────────────────────────────┘
```

### 5.2 User Flow

```
설정 입력 → [Start] 클릭 → 실시간 진행률 표시 → 완료/중지
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| App | src/App.jsx | 메인 레이아웃 |
| TrafficForm | src/components/TrafficForm.jsx | 트래픽 설정 입력 폼 |
| ResultPanel | src/components/ResultPanel.jsx | 실시간 진행 상태 및 결과 표시 |
| ProgressBar | src/components/ProgressBar.jsx | 진행률 바 |
| StatusBadge | src/components/StatusBadge.jsx | 상태 표시 뱃지 (IDLE/RUNNING/COMPLETED/STOPPED/FAILED) |

---

## 6. Error Handling

### 6.1 Backend Error Handling

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 400 | Invalid input | URL 형식 오류, 범위 초과 등 | 구체적인 필드별 에러 메시지 반환 |
| 404 | Task not found | 존재하지 않는 taskId | 에러 메시지 반환 |
| 409 | Task already stopped | 이미 종료된 작업 중지 시도 | 현재 상태 반환 |
| 429 | Too many tasks | 동시 작업 수 초과 | 재시도 안내 메시지 |
| 500 | Internal error | 서버 내부 오류 | 로그 기록 및 일반 에러 메시지 |

### 6.2 Error Response Format

```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "올바른 URL 형식이 아닙니다.",
    "field": "targetUrl"
  }
}
```

### 6.3 Frontend Error Handling

| Scenario | Handling |
|----------|----------|
| API 요청 실패 | 에러 메시지 Toast 표시 |
| SSE 연결 끊김 | 자동 재연결 (3회까지) |
| 입력값 검증 실패 | 해당 필드 하단에 인라인 에러 메시지 |

---

## 7. Security Considerations

- [x] URL 입력값 검증 (XSS 방지, 프로토콜 제한: http/https만 허용)
- [ ] Rate Limiting: 동시 작업 최대 5개, IP당 분당 10회 요청 제한
- [ ] 요청 수 상한: totalRequests 최대 10,000, concurrency 최대 500
- [ ] 악용 방지 경고 문구 UI 표시
- [ ] CORS 설정: 프론트엔드 도메인만 허용

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Unit Test | TrafficService, HttpRequestExecutor | JUnit 5 + Mockito |
| Integration Test | API endpoints | Spring MockMvc |
| Frontend Test | 컴포넌트 렌더링, 폼 검증 | React Testing Library |

### 8.2 Test Cases (Key)

- [ ] Happy path: URL 입력 → 1000건 요청 → 완료까지 진행률 100%
- [ ] 중지: 실행 중 Stop → 상태 STOPPED 전환 확인
- [ ] 입력 검증: 잘못된 URL → 400 에러 반환
- [ ] 동시 작업 제한: 6번째 작업 → 429 에러 반환
- [ ] SSE 연결: 연결 끊김 후 재연결 확인

---

## 9. Clean Architecture

### 9.1 Backend Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Controller** | REST API 엔드포인트, 입력 검증 | `controller/` |
| **Service** | 비즈니스 로직, 작업 관리 | `service/` |
| **Executor** | HTTP 요청 실행 엔진 | `executor/` |
| **DTO** | 데이터 전송 객체 | `dto/` |
| **Config** | CORS 등 설정 | `config/` |
| **Exception** | 글로벌 에러 핸들링 | `exception/` |

### 9.2 Frontend Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Components** | UI 렌더링 | `src/components/` |
| **Hooks** | 상태 관리, SSE 연결 | `src/hooks/` |
| **Services** | API 호출 | `src/services/` |

---

## 10. Coding Convention

### 10.1 Backend (Java/Spring)

| Target | Rule | Example |
|--------|------|---------|
| Class | PascalCase | `TrafficController`, `TrafficService` |
| Method | camelCase | `startTraffic()`, `getProgress()` |
| Constant | UPPER_SNAKE_CASE | `MAX_CONCURRENT_TASKS` |
| Package | lowercase | `com.traffic.generator.controller` |
| DTO | PascalCase + 접미사 | `TrafficRequest`, `TrafficResponse` |

### 10.2 Frontend (React/JavaScript)

| Target | Rule | Example |
|--------|------|---------|
| Component | PascalCase | `TrafficForm`, `ResultPanel` |
| Function | camelCase | `handleSubmit()`, `formatTime()` |
| File (component) | PascalCase.jsx | `TrafficForm.jsx` |
| File (utility) | camelCase.js | `apiClient.js` |
| CSS class | kebab-case | `progress-bar`, `status-badge` |

---

## 11. Implementation Guide

### 11.1 Backend File Structure

```
backend/
├── src/main/java/com/traffic/generator/
│   ├── TrafficGeneratorApplication.java
│   ├── controller/
│   │   └── TrafficController.java
│   ├── service/
│   │   └── TrafficService.java
│   ├── executor/
│   │   └── HttpRequestExecutor.java
│   ├── dto/
│   │   ├── TrafficRequest.java
│   │   ├── TrafficResponse.java
│   │   └── TrafficProgress.java
│   ├── config/
│   │   └── CorsConfig.java
│   └── exception/
│       └── GlobalExceptionHandler.java
├── src/main/resources/
│   └── application.yml
├── build.gradle
└── settings.gradle
```

### 11.2 Frontend File Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── components/
│   │   ├── TrafficForm.jsx
│   │   ├── ResultPanel.jsx
│   │   ├── ProgressBar.jsx
│   │   └── StatusBadge.jsx
│   ├── hooks/
│   │   └── useTrafficSSE.js
│   ├── services/
│   │   └── trafficApi.js
│   └── main.jsx
├── package.json
└── .env
```

### 11.3 Implementation Order

1. [ ] **Backend 프로젝트 초기화**: Spring Boot + Gradle 세팅
2. [ ] **DTO 정의**: TrafficRequest, TrafficResponse, TrafficProgress
3. [ ] **TrafficService 구현**: 작업 관리, 스레드풀 기반 비동기 실행
4. [ ] **HttpRequestExecutor 구현**: Java HttpClient 기반 HTTP 요청 실행
5. [ ] **TrafficController 구현**: REST API + SSE 엔드포인트
6. [ ] **Config 설정**: AsyncConfig (스레드풀), CorsConfig (CORS)
7. [ ] **Frontend 프로젝트 초기화**: React (CRA 또는 Vite)
8. [ ] **TrafficForm 컴포넌트**: 설정 입력 UI
9. [ ] **trafficApi 서비스**: API 호출 함수
10. [ ] **useTrafficSSE 훅**: SSE 연결 및 상태 관리
11. [ ] **ResultPanel 컴포넌트**: 진행률 및 결과 표시
12. [ ] **Frontend-Backend 통합 테스트**
13. [ ] **배포 설정**: Dockerfile 또는 빌드 스크립트

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial draft | csj20 |
