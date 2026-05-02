# Traffic Generator

특정 URL에 원하는 수치만큼의 HTTP 트래픽을 발생시키는 웹서비스입니다.
개발자 포트폴리오 면접에서 트래픽 대응 경험을 시연하기 위해 제작되었습니다.

## 주요 기능

- URL, HTTP 메서드(GET/POST/PUT/DELETE), 요청 수, 동시 접속 수 설정
- 커스텀 헤더 및 요청 본문(Body) 설정
- Ramp-up 모드: 단계적으로 부하를 증가시키는 점진적 트래픽 생성
- SSE(Server-Sent Events) 기반 실시간 진행률 모니터링
- 응답 시간 분석: Min, Avg, P95, P99, Max 퍼센타일
- TPS(초당 처리량) 추이 차트
- HTTP 상태 코드 분포(2xx/3xx/4xx/5xx) 시각화
- 실행 중 트래픽 중지 기능
- 최대 5개 동시 작업 지원

## 기술 스택

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.3, Vite 5.4, Recharts 3.8, JavaScript |
| Backend | Spring Boot 3.2.5, Java 17+ |
| Build | Gradle 8.14 |
| Realtime | SSE (Server-Sent Events) |
| Concurrency | Virtual Threads + Semaphore |

## 프로젝트 구조

```
traffic_generator/
├── backend/                          # Spring Boot
│   └── src/main/java/com/traffic/generator/
│       ├── controller/               # REST API + SSE 스트리밍
│       ├── service/                  # 작업 생명주기 관리
│       ├── executor/                 # 비동기 HTTP 요청 실행 (Flat/Ramp-up)
│       ├── dto/                      # Request, Response, Progress DTO
│       ├── config/                   # CORS, Thread Pool 설정
│       └── exception/                # 글로벌 예외 핸들링
├── frontend/                         # React (Vite)
│   └── src/
│       ├── App.jsx                   # 메인 애플리케이션
│       ├── components/
│       │   ├── TrafficForm.jsx       # 트래픽 설정 입력 폼
│       │   ├── ResultPanel.jsx       # 결과 대시보드
│       │   ├── TpsChart.jsx          # TPS 추이 라인 차트
│       │   ├── LatencyChart.jsx      # 응답 시간 바 차트
│       │   ├── StatusCodeChart.jsx   # 상태 코드 도넛 차트
│       │   ├── ProgressBar.jsx       # 진행률 표시
│       │   └── StatusBadge.jsx       # 상태 배지
│       ├── hooks/
│       │   └── useTrafficSSE.js      # SSE 연결 관리 훅
│       └── services/
│           └── trafficApi.js         # API 호출 클라이언트
├── test-server.js                    # Node.js 테스트 서버 (port 9090)
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

서버가 `http://localhost:8080`에서 실행됩니다.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 테스트 서버 (선택)

트래픽을 보낼 대상 서버가 없을 경우, 내장 테스트 서버를 사용할 수 있습니다.

```bash
node test-server.js
```

`http://localhost:9090`에서 테스트 서버가 실행됩니다 (5% 확률로 에러 응답 시뮬레이션).

## API 엔드포인트

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/traffic/start` | 트래픽 생성 시작 |
| GET | `/api/traffic/status/{taskId}` | 실시간 진행 상태 (SSE) |
| POST | `/api/traffic/stop/{taskId}` | 트래픽 중지 |

### 요청 파라미터 (POST /api/traffic/start)

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| targetUrl | String | O | 대상 URL (http/https) |
| httpMethod | String | O | GET, POST, PUT, DELETE |
| totalRequests | Integer | O | 총 요청 수 (1~10,000) |
| concurrency | Integer | O | 동시 접속 수 (1~500) |
| headers | Map | X | 커스텀 헤더 |
| requestBody | String | X | 요청 본문 (POST/PUT) |
| rampUp | Boolean | X | Ramp-up 모드 활성화 |
| rampUpSteps | Integer | X | Ramp-up 단계 수 (2~10) |

### 응답 메트릭

- 진행률 (0~100%)
- 성공/실패 횟수
- 경과 시간 (ms)
- 응답 시간: Min, Avg, P95, P99, Max
- HTTP 상태 코드 분포 (2xx/3xx/4xx/5xx)
- TPS (초당 처리량) 추이
- 현재 동시 접속 수

## 결과 지표 설명

### 응답 시간 퍼센타일

| 지표 | 설명 |
|------|------|
| **Min** | 전체 요청 중 가장 빠른 응답 시간. 서버의 이상적인 최선 성능 |
| **Avg** | 모든 응답 시간의 평균. 일부 매우 느린 요청에 의해 왜곡될 수 있음 |
| **P95** | 전체 요청의 95%가 이 시간 안에 응답됨. 대부분의 사용자 경험을 대표하는 핵심 지표 |
| **P99** | 전체 요청의 99%가 이 시간 안에 응답됨. 느린 케이스(최악의 일반 사용자 경험) 파악용 |
| **Max** | 가장 느린 응답 시간. 튀는 값(outlier)이 포함되므로 단독으로 판단하지 말 것 |

> P95/P99가 Avg보다 훨씬 크다면 일부 요청이 극단적으로 느리다는 신호입니다.

### TPS (Transactions Per Second)

초당 처리된 요청 수. 숫자가 높을수록 서버 처리 능력이 좋습니다.  
부하가 증가할수록 TPS가 오르다가 한계에서 정체되거나 급락하면 서버 포화 상태입니다.

### HTTP 상태 코드 분포

| 코드 | 의미 |
|------|------|
| **2xx** | 성공 (200 OK, 201 Created 등) |
| **3xx** | 리다이렉트. 서버 설정 문제일 수 있음 |
| **4xx** | 클라이언트 오류 (잘못된 URL, 인증 실패 등). 테스트 설정을 점검 |
| **5xx** | 서버 오류. 서버가 부하를 처리하지 못하는 신호 |

> 부하가 증가할수록 5xx 비율이 올라가면 서버 한계에 도달한 것입니다.

### 한계점 판단 기준

| 지표 | 정상 | 경고 | 위험 |
|------|------|------|------|
| 에러율 (4xx+5xx) | < 1% | 1~5% | > 5% |
| P95 응답 시간 | < 500ms | 500ms~2s | > 2s |
| TPS 추이 | 꾸준히 증가 | 정체 | 급락 |

## 사용 예시

1. Target URL에 테스트할 서버 주소 입력 (예: `http://localhost:9090`)
2. HTTP Method, Total Requests, Concurrency 설정
3. (선택) Ramp-up 모드 활성화 및 단계 설정
4. **Start** 클릭
5. 실시간 대시보드에서 진행률, 성공/실패 수, TPS, 응답 시간, 상태 코드 분포 확인

## 설정값

| 항목 | 기본값 |
|------|--------|
| Thread Pool Core | 10 |
| Thread Pool Max | 50 |
| Thread Pool Queue | 100 |
| 최대 동시 작업 수 | 5 |
| 최대 총 요청 수 | 10,000 |
| 최대 동시 접속 수 | 500 |
| 요청 타임아웃 | 30초 |
| SSE 타임아웃 | 5분 |

> **주의**: 본 서비스는 자신의 서버 테스트 용도로만 사용하세요.
