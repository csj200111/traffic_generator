import React, { useState, useCallback } from 'react';
import TrafficForm from './components/TrafficForm';
import ResultPanel from './components/ResultPanel';
import ThresholdForm from './components/ThresholdForm';
import ThresholdResultPanel from './components/ThresholdResultPanel';
import AutoThresholdForm from './components/AutoThresholdForm';
import AutoThresholdResultPanel from './components/AutoThresholdResultPanel';
import HistoryPanel from './components/HistoryPanel';
import { useTrafficSSE } from './hooks/useTrafficSSE';
import { useThresholdSSE } from './hooks/useThresholdSSE';
import { useAutoThresholdSSE } from './hooks/useAutoThresholdSSE';
import { startTraffic, stopTraffic } from './services/trafficApi';
import { startThreshold, stopThreshold } from './services/thresholdApi';
import { startAutoThreshold, stopAutoThreshold } from './services/autoThresholdApi';

export default function App() {
  const [activeTab, setActiveTab] = useState('traffic');
  const [thresholdMode, setThresholdMode] = useState('manual'); // 'manual' | 'auto'

  // ── 저장 기록 ────────────────────────────────────────────────
  const [savedResults, setSavedResults] = useState([]);
  const [trafficUrl, setTrafficUrl] = useState('');
  const [thresholdUrl, setThresholdUrl] = useState('');
  const [autoUrl, setAutoUrl] = useState('');

  const handleSave = useCallback((type, url, progress) => {
    setSavedResults(prev => [...prev, {
      id: Date.now(),
      type,
      url,
      savedAt: new Date(),
      progress: JSON.parse(JSON.stringify(progress)),
    }]);
  }, []);

  const handleDeleteResult = useCallback((id) => {
    setSavedResults(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleClearResults = useCallback(() => {
    setSavedResults([]);
  }, []);

  // ── Traffic state ──────────────────────────────────────────────
  const [taskId, setTaskId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const { progress, connect, reset } = useTrafficSSE();

  const handleStart = useCallback(async (config) => {
    try {
      setError(null);
      reset();
      setTrafficUrl(config.targetUrl);
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

  React.useEffect(() => {
    if (progress && progress.status !== 'RUNNING') {
      setIsRunning(false);
      if (progress.status === 'COMPLETED' || progress.status === 'STOPPED') {
        handleSave('traffic', trafficUrl, progress);
      }
    }
  }, [progress]);

  // ── Threshold state ────────────────────────────────────────────
  const [thresholdTaskId, setThresholdTaskId] = useState(null);
  const [isThresholdRunning, setIsThresholdRunning] = useState(false);
  const [thresholdError, setThresholdError] = useState(null);
  const { progress: thresholdProgress, connect: thresholdConnect, reset: thresholdReset } = useThresholdSSE();

  const handleThresholdStart = useCallback(async (config) => {
    try {
      setThresholdError(null);
      thresholdReset();
      setThresholdUrl(config.targetUrl);
      const response = await startThreshold(config);
      setThresholdTaskId(response.taskId);
      setIsThresholdRunning(true);
      thresholdConnect(response.taskId);
    } catch (err) {
      setThresholdError(err.message);
    }
  }, [thresholdConnect, thresholdReset]);

  const handleThresholdStop = useCallback(async () => {
    if (!thresholdTaskId) return;
    try {
      await stopThreshold(thresholdTaskId);
      setIsThresholdRunning(false);
    } catch (err) {
      setThresholdError(err.message);
    }
  }, [thresholdTaskId]);

  React.useEffect(() => {
    if (thresholdProgress && thresholdProgress.status !== 'RUNNING') {
      setIsThresholdRunning(false);
      if (thresholdProgress.status === 'COMPLETED' || thresholdProgress.status === 'STOPPED') {
        handleSave('threshold', thresholdUrl, thresholdProgress);
      }
    }
  }, [thresholdProgress]);

  // ── Auto Threshold state ───────────────────────────────────────
  const [autoTaskId, setAutoTaskId] = useState(null);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [autoError, setAutoError] = useState(null);
  const { progress: autoProgress, connect: autoConnect, reset: autoReset } = useAutoThresholdSSE();

  const handleAutoStart = useCallback(async (config) => {
    try {
      setAutoError(null);
      autoReset();
      setAutoUrl(config.targetUrl);
      const response = await startAutoThreshold(config);
      setAutoTaskId(response.taskId);
      setIsAutoRunning(true);
      autoConnect(response.taskId);
    } catch (err) {
      setAutoError(err.message);
    }
  }, [autoConnect, autoReset]);

  const handleAutoStop = useCallback(async () => {
    if (!autoTaskId) return;
    try {
      await stopAutoThreshold(autoTaskId);
      setIsAutoRunning(false);
    } catch (err) {
      setAutoError(err.message);
    }
  }, [autoTaskId]);

  React.useEffect(() => {
    if (autoProgress && autoProgress.status !== 'RUNNING') {
      setIsAutoRunning(false);
      if (autoProgress.status === 'COMPLETED' || autoProgress.status === 'STOPPED') {
        handleSave('auto', autoUrl, autoProgress);
      }
    }
  }, [autoProgress]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Traffic Generator</h1>
        <span className="app-version">v0.3.0</span>
      </header>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'traffic' ? 'active' : ''}`}
          onClick={() => setActiveTab('traffic')}
        >
          트래픽 테스트
        </button>
        <button
          className={`tab-btn ${activeTab === 'threshold' ? 'active' : ''}`}
          onClick={() => setActiveTab('threshold')}
        >
          임계점 측정
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          테스트 기록
          {savedResults.length > 0 && (
            <span className="tab-count">{savedResults.length}</span>
          )}
        </button>
      </div>

      <main className="app-main">
        {activeTab === 'traffic' && (
          <>
            {error && (
              <div className="error-toast" onClick={() => setError(null)}>{error}</div>
            )}
            <section className="section">
              <h2>Settings</h2>
              <TrafficForm onStart={handleStart} onStop={handleStop} isRunning={isRunning} />
            </section>
            <section className="section">
              <h2>Results</h2>
              <ResultPanel
                progress={progress}
                isRunning={isRunning}
              />
            </section>
          </>
        )}

        {activeTab === 'threshold' && (
          <>
            <div className="mode-switcher" style={{ gridColumn: '1 / -1' }}>
              <button
                className={`mode-btn ${thresholdMode === 'manual' ? 'active' : ''}`}
                onClick={() => setThresholdMode('manual')}
              >
                수동 측정
              </button>
              <button
                className={`mode-btn ${thresholdMode === 'auto' ? 'active' : ''}`}
                onClick={() => setThresholdMode('auto')}
              >
                자동 임계점 측정
              </button>
            </div>

            {thresholdMode === 'manual' && (
              <>
                {thresholdError && (
                  <div className="error-toast" onClick={() => setThresholdError(null)}>{thresholdError}</div>
                )}
                <section className="section">
                  <h2>Settings</h2>
                  <ThresholdForm
                    onStart={handleThresholdStart}
                    onStop={handleThresholdStop}
                    isRunning={isThresholdRunning}
                  />
                </section>
                <section className="section">
                  <h2>Results</h2>
                  <ThresholdResultPanel
                    progress={thresholdProgress}
                    isRunning={isThresholdRunning}
                  />
                </section>
              </>
            )}

            {thresholdMode === 'auto' && (
              <>
                {autoError && (
                  <div className="error-toast" onClick={() => setAutoError(null)}>{autoError}</div>
                )}
                <section className="section">
                  <h2>Auto Settings</h2>
                  <AutoThresholdForm
                    onStart={handleAutoStart}
                    onStop={handleAutoStop}
                    isRunning={isAutoRunning}
                  />
                </section>
                <section className="section">
                  <h2>Results</h2>
                  <AutoThresholdResultPanel
                    progress={autoProgress}
                    isRunning={isAutoRunning}
                  />
                </section>
              </>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <section className="section section-full">
            <h2>테스트 기록</h2>
            <HistoryPanel
              results={savedResults}
              onDelete={handleDeleteResult}
              onClear={handleClearResults}
            />
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>본 서비스는 자신의 서버 테스트 용도로만 사용하세요.</p>
      </footer>
    </div>
  );
}
