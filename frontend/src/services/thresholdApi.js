const API_BASE = '/api/traffic';

export async function startThreshold(config) {
  const response = await fetch(`${API_BASE}/threshold`, {
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

export async function stopThreshold(taskId) {
  const response = await fetch(`${API_BASE}/threshold/stop/${taskId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export function createThresholdStream(taskId) {
  return new EventSource(`${API_BASE}/threshold/status/${taskId}`);
}
