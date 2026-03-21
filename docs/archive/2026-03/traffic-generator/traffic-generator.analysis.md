# Traffic Generator Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: traffic-generator
> **Version**: 0.1.0
> **Analyst**: Claude (gap-detector)
> **Date**: 2026-03-21
> **Design Doc**: [traffic-generator.design.md](../02-design/features/traffic-generator.design.md)

---

## 1. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| API Specification Match | 92% | ✅ |
| Data Model Match | 100% | ✅ |
| UI/Component Match | 90% | ✅ |
| Architecture/Structure Match | 88% | ⚠️ |
| Error Handling Match | 70% | ⚠️ |
| Convention Compliance | 95% | ✅ |
| Test/Security Coverage | 35% | ❌ |
| **Overall** | **81%** | **⚠️** |

---

## 2. Missing Features (Design O, Implementation X)

| # | Item | Description | Priority |
|---|------|-------------|----------|
| 1 | AsyncConfig.java | Thread pool 설정 클래스 미구현 (Virtual Thread로 대체됨) | LOW |
| 2 | GlobalExceptionHandler | 통일된 에러 응답 포맷 핸들러 누락 | HIGH |
| 3 | IP-based Rate Limiting | IP당 분당 10회 요청 제한 미구현 | MEDIUM |
| 4 | Test Cases | Unit/Integration/Frontend 테스트 전무 | LOW |
| 5 | Headers/RequestBody UI | 커스텀 헤더, 요청 본문 입력 UI 누락 | MEDIUM |

## 3. Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| 1 | Entry point | src/index.js | src/main.jsx | Low (Vite 규약) |
| 2 | SSE 404 처리 | HTTP 404 | SSE error event + close | Medium |
| 3 | 429 에러 형식 | `{error:{code,message}}` | TrafficResponse 객체 | Medium |
| 4 | 400 에러 형식 | 커스텀 에러 포맷 | Spring 기본 validation 포맷 | Medium |
| 5 | Thread 모델 | AsyncConfig + @Async | Virtual Thread + Semaphore | Low (개선) |

## 4. Added Features (Design X, Implementation O)

| # | Item | Description |
|---|------|-------------|
| 1 | FAILED 상태 | StatusBadge에 FAILED 상태 추가 |
| 2 | Virtual Threads | 기존 스레드풀 대신 Virtual Thread 사용 |
| 3 | SSE Scheduler | ScheduledExecutorService로 주기적 SSE 푸시 |

## 5. Recommended Actions

### HIGH Priority
1. **GlobalExceptionHandler 추가** - `@ControllerAdvice`로 에러 응답 형식 통일
2. **429 에러 응답 형식 변경** - TrafficResponse 대신 Design의 error format 사용

### MEDIUM Priority
3. **Headers/RequestBody UI** - POST/PUT 선택 시 입력 필드 표시
4. **IP-based Rate Limiting** - Spring Interceptor/Filter로 구현

### LOW Priority (Design 문서 업데이트 권장)
5. Virtual Thread 방식 반영
6. SSE error event 방식 반영
7. Entry point `main.jsx` 반영

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial gap analysis | Claude (gap-detector) |
