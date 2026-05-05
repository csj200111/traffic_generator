import React, { useState } from 'react';

const toInt = (v) => (v === '' ? '' : (parseInt(v) || ''));
const toFloat = (v) => (v === '' ? '' : (parseFloat(v) ?? ''));

const DEFAULT_CONFIG = {
  targetUrl: '',
  httpMethod: 'GET',
  requestBody: '',
  requestsPerStep: 30,
  errorRateThreshold: 5.0,
  latencyThresholdMs: 2000,
  precision: 5,
};

export default function AutoThresholdForm({ onStart, onStop, isRunning }) {
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

  return (
    <form className="traffic-form" onSubmit={handleSubmit}>
      <div className="auto-threshold-desc">
        동시접속 수를 자동으로 탐색하여 서버의 임계점을 찾아드립니다.
        <br />
        <span className="auto-desc-detail">10명 → 20 → 40 → 80 ... 으로 범위를 좁히고 정밀 탐색합니다. (내부 상한 10000명)</span>
      </div>

      <div className="form-group">
        <label htmlFor="at-targetUrl">Target URL</label>
        <input
          id="at-targetUrl"
          type="text"
          placeholder="https://example.com/api/test"
          value={config.targetUrl}
          onChange={(e) => set('targetUrl', e.target.value)}
          disabled={isRunning}
        />
        {errors.targetUrl && <span className="field-error">{errors.targetUrl}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="at-httpMethod">HTTP Method</label>
        <select
          id="at-httpMethod"
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
          <label htmlFor="at-requestBody">Request Body</label>
          <textarea
            id="at-requestBody"
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
                <label htmlFor="at-requestsPerStep">단계별 요청 수</label>
                <input
                  id="at-requestsPerStep"
                  type="number" min="10" max="500"
                  value={config.requestsPerStep}
                  onChange={(e) => set('requestsPerStep', toInt(e.target.value))}
                  disabled={isRunning}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="at-errorRateThreshold">에러율 임계값 (%)</label>
                <input
                  id="at-errorRateThreshold"
                  type="number" min="0" max="50" step="0.5"
                  value={config.errorRateThreshold}
                  onChange={(e) => set('errorRateThreshold', toFloat(e.target.value))}
                  disabled={isRunning}
                />
              </div>
              <div className="form-group">
                <label htmlFor="at-latencyThresholdMs">응답시간 임계값 (ms)</label>
                <input
                  id="at-latencyThresholdMs"
                  type="number" min="100" max="30000"
                  value={config.latencyThresholdMs}
                  onChange={(e) => set('latencyThresholdMs', toInt(e.target.value))}
                  disabled={isRunning}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="at-precision">정밀도 (동시접속 오차 허용 범위)</label>
              <input
                id="at-precision"
                type="number" min="1" max="50"
                value={config.precision}
                onChange={(e) => set('precision', toInt(e.target.value))}
                disabled={isRunning}
              />
            </div>
          </div>
        )}
      </div>

      <div className="form-actions">
        {!isRunning ? (
          <button type="submit" className="btn btn-start">자동 측정 시작</button>
        ) : (
          <button type="button" className="btn btn-stop" onClick={onStop}>측정 중지</button>
        )}
      </div>
    </form>
  );
}
