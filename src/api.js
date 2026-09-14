const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const TOKEN_KEY = 'nb-clinical-app-token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    const err = new Error('未登入或登入已過期');
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    let message = `請求失敗 (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      /* ignore parse error */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function login(password) {
  const data = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  setToken(data.token);
  return data;
}

export function listPatients(status) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/api/patients${qs}`);
}

export function getPatient(id) {
  return request(`/api/patients/${id}`);
}

export function createPatient(data) {
  return request('/api/patients', { method: 'POST', body: JSON.stringify(data) });
}

export function updatePatient(id, data) {
  return request(`/api/patients/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deletePatient(id) {
  return request(`/api/patients/${id}`, { method: 'DELETE' });
}

export function addLog(patientId, data) {
  return request(`/api/patients/${patientId}/logs`, { method: 'POST', body: JSON.stringify(data) });
}

export function deleteLog(logId) {
  return request(`/api/logs/${logId}`, { method: 'DELETE' });
}
