# Traffic Generator Planning Document

> **Summary**: 특정 URL에 설정된 수치만큼 트래픽을 발생시키는 웹서비스
>
> **Project**: traffic-generator
> **Version**: 0.1.0
> **Author**: csj20
> **Date**: 2026-03-21
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

개발자 포트폴리오 면접에서 트래픽 대응 관련 질문이 빈번하다. 이를 실제로 시연할 수 있도록, 특정 URL에 원하는 수치만큼의 트래픽을 발생시키는 웹서비스를 개발한다.

### 1.2 Background

- 개발자 면접에서 트래픽 대응 경험을 증명할 수단이 필요
- 사용자가 직접 트래픽 수치를 설정하고, 버튼 하나로 트래픽을 발생시킬 수 있는 도구가 필요
- 배포 가능한 수준으로 완성하여 실제 시연 가능해야 함

### 1.3 Related Documents

- Requirements: `basic.md` (프로젝트 루트)

---

## 2. Scope

### 2.1 In Scope

- [ ] 트래픽 설정 UI (대상 URL, 요청 수, 동시 접속 수 등)
- [ ] 설정된 수치에 따른 HTTP 트래픽 발생 백엔드 API
- [ ] 트래픽 발생 상태 실시간 모니터링 (진행률, 성공/실패 수)
- [ ] 배포 가능한 수준의 빌드 및 설정

### 2.2 Out of Scope

- 분산 트래픽 생성 (다중 서버에서의 트래픽 발생)
- 사용자 인증/로그인 시스템
- 트래픽 이력 저장 및 통계 대시보드

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 사용자가 대상 URL을 입력할 수 있다 | High | Pending |
| FR-02 | 사용자가 총 요청 수를 설정할 수 있다 | High | Pending |
| FR-03 | 사용자가 동시 요청 수(concurrency)를 설정할 수 있다 | High | Pending |
| FR-04 | 사용자가 HTTP 메서드(GET/POST 등)를 선택할 수 있다 | Medium | Pending |
| FR-05 | 설정 완료 후 버튼 클릭으로 트래픽을 발생시킨다 | High | Pending |
| FR-06 | 트래픽 발생 중 진행 상태(진행률, 성공/실패 수)를 실시간 표시한다 | High | Pending |
| FR-07 | 트래픽 발생을 중간에 중지할 수 있다 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 최소 1000 concurrent requests 처리 가능 | 부하 테스트 |
| Usability | 설정부터 실행까지 3단계 이내 완료 | UI 사용성 테스트 |
| Deployability | Docker 또는 클라우드 배포 가능 | 배포 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 모든 기능 요구사항(FR-01~FR-07) 구현 완료
- [ ] 프론트엔드-백엔드 연동 정상 동작
- [ ] 배포 가능한 상태로 빌드 성공
- [ ] 기본적인 에러 처리 완료

### 4.2 Quality Criteria

- [ ] 프론트엔드 빌드 에러 없음
- [ ] 백엔드 빌드 및 실행 에러 없음
- [ ] 주요 API 엔드포인트 정상 응답 확인

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 대상 URL의 서버가 트래픽을 차단할 수 있음 | High | High | 사용자에게 자신의 서버에만 사용하도록 안내, 경고 문구 표시 |
| 대량 트래픽 발생 시 클라이언트 서버 리소스 부족 | Medium | Medium | 동시 요청 수 상한선 설정, 서버 스레드풀 관리 |
| 악용 가능성 (DDoS 도구로 오용) | High | Medium | 사용 약관 고지, Rate Limiting 적용, 자기 서버만 허용하는 정책 검토 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites, portfolios | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend | ☒ |
| **Enterprise** | Strict layer separation, microservices | High-traffic systems | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Frontend Framework | React | React | basic.md 명시 |
| Frontend Language | JavaScript | JavaScript | basic.md 명시 |
| Backend Framework | Spring Boot | Spring Boot | basic.md 명시 (Java 17+) |
| Backend Language | Java 17+ | Java 17+ | basic.md 명시 |
| DB | MySQL | MySQL | basic.md 명시 (필요시) |
| Frontend-Backend 통신 | REST API | REST API | 단순한 요청-응답 구조에 적합 |
| 실시간 상태 전달 | Polling / SSE / WebSocket | SSE | 서버→클라이언트 단방향 스트림에 적합 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

Folder Structure Preview:
┌─────────────────────────────────────────────────────┐
│ Frontend (React):                                   │
│   src/components/    - UI 컴포넌트                    │
│   src/pages/         - 페이지 컴포넌트                 │
│   src/services/      - API 호출 서비스                 │
│   src/types/         - 타입 정의                      │
├─────────────────────────────────────────────────────┤
│ Backend (Spring Boot):                              │
│   src/main/java/.../controller/  - REST 컨트롤러      │
│   src/main/java/.../service/     - 비즈니스 로직       │
│   src/main/java/.../dto/         - 데이터 전송 객체    │
│   src/main/java/.../config/      - 설정               │
│   src/main/resources/            - 설정 파일           │
└─────────────────────────────────────────────────────┘
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [ ] `CLAUDE.md` has coding conventions section
- [ ] ESLint configuration (`.eslintrc.*`)
- [ ] Prettier configuration (`.prettierrc`)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | missing | Java: camelCase, React: PascalCase 컴포넌트 | High |
| **Folder structure** | missing | Frontend/Backend 분리 구조 | High |
| **API 설계** | missing | RESTful API 네이밍 규칙 | High |
| **Error handling** | missing | 공통 에러 응답 포맷 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `SERVER_PORT` | Spring Boot 서버 포트 | Server | ☐ |
| `REACT_APP_API_URL` | 백엔드 API 엔드포인트 | Client | ☐ |
| `SPRING_DATASOURCE_URL` | MySQL 연결 (필요시) | Server | ☐ |

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`traffic-generator.design.md`)
2. [ ] 프론트엔드/백엔드 프로젝트 초기 세팅
3. [ ] API 엔드포인트 설계
4. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial draft | csj20 |
