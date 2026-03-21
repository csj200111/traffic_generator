const API_BASE = '/api/traffic';

export async function startTraffic(config) {
  const response = await fetch(`${API_BASE}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function stopTraffic(taskId) {
  const response = await fetch(`${API_BASE}/stop/${taskId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export function createStatusStream(taskId) {
  return new EventSource(`${API_BASE}/status/${taskId}`);
}
