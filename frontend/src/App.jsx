import React, { useState, useCallback } from 'react';
import TrafficForm from './components/TrafficForm';
import ResultPanel from './components/ResultPanel';
import { useTrafficSSE } from './hooks/useTrafficSSE';
import { startTraffic, stopTraffic } from './services/trafficApi';

export default function App() {
  const [taskId, setTaskId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const { progress, connect, reset } = useTrafficSSE();

  const handleStart = useCallback(async (config) => {
    try {
      setError(null);
      reset();
      const response = await startTraffic(config);
      setTaskId(response.taskId);
      setIsRunning(true);
      connect(response.taskId);
    } catch (err) {
      setError(err.message);
    }
  }, [connect, reset]);

  const handleStop = useCallback(async () => {
    if (!taskId) return;
    try {
      await stopTraffic(taskId);
      setIsRunning(false);
    } catch (err) {
      setError(err.message);
    }
  }, [taskId]);

  // SSE에서 완료/중지 상태를 받으면 isRunning을 false로
  React.useEffect(() => {
    if (progress && progress.status !== 'RUNNING') {
      setIsRunning(false);
    }
  }, [progress]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Traffic Generator</h1>
        <span className="app-version">v0.1.0</span>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-toast" onClick={() => setError(null)}>
            {error}
          </div>
        )}

        <section className="section">
          <h2>Settings</h2>
          <TrafficForm
            onStart={handleStart}
            onStop={handleStop}
            isRunning={isRunning}
          />
        </section>

        <section className="section">
          <h2>Results</h2>
          <ResultPanel progress={progress} isRunning={isRunning} />
        </section>
      </main>

      <footer className="app-footer">
        <p>본 서비스는 자신의 서버 테스트 용도로만 사용하세요.</p>
      </footer>
    </div>
  );
}
