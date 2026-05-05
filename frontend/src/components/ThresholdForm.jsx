import React, { useState } from 'react';

const toInt = (v) => (v === '' ? '' : (parseInt(v) || ''));
const toFloat = (v) => (v === '' ? '' : (parseFloat(v) ?? ''));

const DEFAULT_CONFIG = {
  targetUrl: '',
  httpMethod: 'GET',
  requestBody: '',
  startConcurrency: 5,
  concurrencyStep: 5,
  maxConcurrency: 100,
  requestsPerStep: 50,
  errorRateThreshold: 5.0,
  latencyThresholdMs: 2000,
  autoStop: true,
};

function estimateSteps(cfg) {
  if (cfg.concurrencyStep <= 0) return 0;
  return Math.floor((cfg.maxConcurrency - cfg.startConcurrency) / cfg.concurrencyStep) + 1;
}

export default function ThresholdForm({ onStart, onStop, isRunning }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [errors, setErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const validate = () => {
    const e = {};
    if (!config.targetUrl) {
      e.targetUrl = 'URL을 입력해주세요.';
    } else if (!/^https?:\/\/.+/.test(config.targetUrl)) {
      e.targetUrl = 'http 또는 https URL만 허용됩니다.';
    }
    if (config.startConcurrency < 1 || config.startConcurrency > 100) {
      e.startConcurrency = '1 ~ 100 범위로 입력해주세요.';
    }
    if (config.concurrencyStep < 1 || config.concurrencyStep > 2000) {
      e.concurrencyStep = '1 ~ 2000 범위로 입력해주세요.';
    }
    if (config.maxConcurrency < 1 || config.maxConcurrency > 2000) {
      e.maxConcurrency = '1 ~ 2000 범위로 입력해주세요.';
    }
    if (config.maxConcurrency < config.startConcurrency) {
      e.maxConcurrency = '최대 동시접속은 시작 값보다 커야 합니다.';
    }
    if (config.requestsPerStep < 10 || config.requestsPerStep > 500) {
      e.requestsPerStep = '10 ~ 500 범위로 입력해주세요.';
    }
    if (config.errorRateThreshold < 0 || config.errorRateThreshold > 50) {
      e.errorRateThreshold = '0 ~ 50 범위로 입력해주세요.';
    }
    if (config.latencyThresholdMs < 100 || config.latencyThresholdMs > 30000) {
      e.latencyThresholdMs = '100 ~ 30000 범위로 입력해주세요.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onStart(config);
  };

  const set = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const steps = estimateSteps(config);

  return (
    <form className="traffic-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="th-targetUrl">Target URL</label>
        <input
          id="th-targetUrl"
          type="text"
          placeholder="https://example.com/api/test"
          value={config.targetUrl}
          onChange={(e) => set('targetUrl', e.target.value)}
          disabled={isRunning}
        />
        {errors.targetUrl && <span className="field-error">{errors.targetUrl}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="th-httpMethod">HTTP Method</label>
        <select
          id="th-httpMethod"
          value={config.httpMethod}
          onChange={(e) => set('httpMethod', e.target.value)}
          disabled={isRunning}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      {(config.httpMethod === 'POST' || config.httpMethod === 'PUT') && (
        <div className="form-group">
          <label htmlFor="th-requestBody">Request Body</label>
          <textarea
            id="th-requestBody"
            placeholder='{"key": "value"}'
            value={config.requestBody}
            onChange={(e) => set('requestBody', e.target.value)}
            disabled={isRunning}
            rows={3}
          />
        </div>
      )}

      <div className="ramp-up-section">
        <button
          type="button"
          className="advanced-toggle"
          onClick={() => setShowAdvanced((v) => !v)}
          disabled={isRunning}
        >
          고급 설정 {showAdvanced ? '▲' : '▼'}
        </button>

        {showAdvanced && (
          <div className="advanced-fields">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="th-startConcurrency">시작 동시접속</label>
                <input
                  id="th-startConcurrency"
                  type="number" min="1" max="100"
                  value={config.startConcurrency}
                  onChange={(e) => set('startConcurrency', toInt(e.target.value))}
                  disabled={isRunning}
                />
                {errors.startConcurrency && <span className="field-error">{errors.startConcurrency}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="th-concurrencyStep">증가 단계</label>
                <input
                  id="th-concurrencyStep"
                  type="number" min="1" max="2000"
                  value={config.concurrencyStep}
                  onChange={(e) => set('concurrencyStep', toInt(e.target.value))}
                  disabled={isRunning}
                />
                {errors.concurrencyStep && <span className="field-error">{errors.concurrencyStep}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="th-maxConcurrency">최대 동시접속</label>
                <input
                  id="th-maxConcurrency"
                  type="number" min="1" max="2000"
                  value={config.maxConcurrency}
                  onChange={(e) => set('maxConcurrency', toInt(e.target.value))}
                  disabled={isRunning}
                />
                {errors.maxConcurrency && <span className="field-error">{errors.maxConcurrency}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="th-requestsPerStep">단계별 요청 수</label>
                <input
                  id="th-requestsPerStep"
                  type="number" min="10" max="500"
                  value={config.requestsPerStep}
                  onChange={(e) => set('requestsPerStep', toInt(e.target.value))}
                  disabled={isRunning}
                />
                {errors.requestsPerStep && <span className="field-error">{errors.requestsPerStep}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="th-errorRateThreshold">에러율 임계값 (%)</label>
                <input
                  id="th-errorRateThreshold"
                  type="number" min="0" max="50" step="0.5"
                  value={config.errorRateThreshold}
                  onChange={(e) => set('errorRateThreshold', toFloat(e.target.value))}
                  disabled={isRunning}
                />
                {errors.errorRateThreshold && <span className="field-error">{errors.errorRateThreshold}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="th-latencyThresholdMs">응답시간 임계값 (ms)</label>
                <input
                  id="th-latencyThresholdMs"
                  type="number" min="100" max="30000"
                  value={config.latencyThresholdMs}
                  onChange={(e) => set('latencyThresholdMs', toInt(e.target.value))}
                  disabled={isRunning}
                />
                {errors.latencyThresholdMs && <span className="field-error">{errors.latencyThresholdMs}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={config.autoStop}
                  onChange={(e) => set('autoStop', e.target.checked)}
                  disabled={isRunning}
                />
                <span className="toggle-text">임계점 도달 시 자동 중단</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {steps > 0 && (
        <div className="threshold-estimate">
          총 {steps}단계 · 최대 {steps * config.requestsPerStep} 요청
          ({config.startConcurrency} → {config.maxConcurrency} 동시접속, {config.concurrencyStep}씩 증가)
        </div>
      )}

      <div className="form-actions">
        {!isRunning ? (
          <button type="submit" className="btn btn-start">측정 시작</button>
        ) : (
          <button type="button" className="btn btn-stop" onClick={onStop}>측정 중지</button>
        )}
      </div>
    </form>
  );
}
