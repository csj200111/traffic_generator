const API_BASE = '/api/traffic';

export async function startAutoThreshold(config) {
  const response = await fetch(`${API_BASE}/auto-threshold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function stopAutoThreshold(taskId) {
  const response = await fetch(`${API_BASE}/auto-threshold/stop/${taskId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export function createAutoThresholdStream(taskId) {
  return new EventSource(`${API_BASE}/auto-threshold/status/${taskId}`);
}
