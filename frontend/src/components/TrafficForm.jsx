import React, { useState } from 'react';

const DEFAULT_CONFIG = {
  targetUrl: '',
  totalRequests: 100,
  concurrency: 10,
  httpMethod: 'GET',
  headers: {},
  requestBody: '',
};

export default function TrafficForm({ onStart, onStop, isRunning }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!config.targetUrl) {
      newErrors.targetUrl = 'URL을 입력해주세요.';
    } else if (!/^https?:\/\/.+/.test(config.targetUrl)) {
      newErrors.targetUrl = 'http 또는 https URL만 허용됩니다.';
    }

    if (config.totalRequests < 1 || config.totalRequests > 10000) {
      newErrors.totalRequests = '1 ~ 10,000 범위로 입력해주세요.';
    }

    if (config.concurrency < 1 || config.concurrency > 500) {
      newErrors.concurrency = '1 ~ 500 범위로 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onStart(config);
    }
  };

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form className="traffic-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="targetUrl">Target URL</label>
        <input
          id="targetUrl"
          type="text"
          placeholder="https://example.com/api/test"
          value={config.targetUrl}
          onChange={(e) => handleChange('targetUrl', e.target.value)}
          disabled={isRunning}
        />
        {errors.targetUrl && <span className="field-error">{errors.targetUrl}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="httpMethod">HTTP Method</label>
        <select
          id="httpMethod"
          value={config.httpMethod}
          onChange={(e) => handleChange('httpMethod', e.target.value)}
          disabled={isRunning}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="totalRequests">Total Requests</label>
          <input
            id="totalRequests"
            type="number"
            min="1"
            max="10000"
            value={config.totalRequests}
            onChange={(e) => handleChange('totalRequests', parseInt(e.target.value) || 0)}
            disabled={isRunning}
          />
          {errors.totalRequests && <span className="field-error">{errors.totalRequests}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="concurrency">Concurrency</label>
          <input
            id="concurrency"
            type="number"
            min="1"
            max="500"
            value={config.concurrency}
            onChange={(e) => handleChange('concurrency', parseInt(e.target.value) || 0)}
            disabled={isRunning}
          />
          {errors.concurrency && <span className="field-error">{errors.concurrency}</span>}
        </div>
      </div>

      {(config.httpMethod === 'POST' || config.httpMethod === 'PUT') && (
        <div className="form-group">
          <label htmlFor="requestBody">Request Body</label>
          <textarea
            id="requestBody"
            placeholder='{"key": "value"}'
            value={config.requestBody}
            onChange={(e) => handleChange('requestBody', e.target.value)}
            disabled={isRunning}
            rows={3}
          />
        </div>
      )}

      <div className="form-actions">
        {!isRunning ? (
          <button type="submit" className="btn btn-start">Start</button>
        ) : (
          <button type="button" className="btn btn-stop" onClick={onStop}>Stop</button>
        )}
      </div>
    </form>
  );
}
