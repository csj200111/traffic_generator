const http = require('http');

let requestCount = 0;

const server = http.createServer((req, res) => {
  const start = Date.now();
  requestCount++;
  const id = requestCount;

  // 0~100ms 랜덤 지연으로 실제 서버처럼 동작
  const delay = Math.floor(Math.random() * 100);
  setTimeout(() => {
    let statusCode = 200;

    // 5% 확률로 500 에러 반환
    if (Math.random() < 0.05) {
      statusCode = 500;
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', delay }));
    }

    const elapsed = Date.now() - start;
    console.log(`#${id} ${req.method} ${req.url} → ${statusCode} (${elapsed}ms)`);
  }, delay);
});

server.listen(9090, () => {
  console.log('Test target server running on http://localhost:9090');
});
