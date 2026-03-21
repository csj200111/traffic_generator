# Traffic Generator

특정 URL에 원하는 수치만큼의 HTTP 트래픽을 발생시키는 웹서비스입니다.
개발자 포트폴리오 면접에서 트래픽 대응 경험을 시연하기 위해 제작되었습니다.

## 주요 기능

- URL, HTTP 메서드, 요청 수, 동시 접속 수 설정
- 버튼 클릭으로 대량 HTTP 트래픽 발생
- SSE(Server-Sent Events) 기반 실시간 진행률 모니터링
- 실행 중 트래픽 중지 기능

## 기술 스택

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, JavaScript |
| Backend | Spring Boot 3.2.5, Java 17+ |
| Build | Gradle 8.14 |
| Realtime | SSE (Server-Sent Events) |
| Concurrency | Virtual Threads + Semaphore |

## 프로젝트 구조

```
traffic_generator/
├── backend/                          # Spring Boot
│   └── src/main/java/com/traffic/generator/
│       ├── controller/               # REST API + SSE
│       ├── service/                  # 작업 관리
│       ├── executor/                 # 비동기 HTTP 요청 실행
│       ├── dto/                      # 데이터 전송 객체
│       ├── config/                   # CORS 설정
│       └── exception/                # 글로벌 에러 핸들링
├── frontend/                         # React (Vite)
│   └── src/
│       ├── components/               # UI 컴포넌트
│       ├── hooks/                    # SSE 연결 훅
│       └── services/                 # API 호출
└── docs/                             # PDCA 문서
```

## 실행 방법

### 사전 요구사항

- Java 17+ (권장: 21+ for Virtual Threads)
- Node.js 18+

### Backend

```bash
cd backend
./gradlew bootRun
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## API 엔드포인트

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/traffic/start` | 트래픽 생성 시작 |
| GET | `/api/traffic/status/{taskId}` | 실시간 진행 상태 (SSE) |
| POST | `/api/traffic/stop/{taskId}` | 트래픽 중지 |

## 사용 예시

1. Target URL에 테스트할 서버 주소 입력 (예: `https://httpbin.org/get`)
2. HTTP Method, Total Requests, Concurrency 설정
3. **Start** 클릭
4. 진행률, 성공/실패 수, 소요 시간을 실시간으로 확인

> **주의**: 본 서비스는 자신의 서버 테스트 용도로만 사용하세요.
