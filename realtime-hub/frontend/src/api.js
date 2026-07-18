// Base URLs are read from Vite env vars so they can be swapped per
// environment (local docker-compose vs deployed) without touching code.
export const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:5000';
export const ANALYTICS_API_URL = import.meta.env.VITE_ANALYTICS_API_URL || 'http://localhost:8000';
export const ANALYTICS_WS_URL = import.meta.env.VITE_ANALYTICS_WS_URL || 'ws://localhost:8000';

const TOKEN_KEY = 'realtime_hub_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ---- chat-service ----
export const authApi = {
  register: (payload) =>
    request(`${CHAT_API_URL}/api/auth/register`, { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) =>
    request(`${CHAT_API_URL}/api/auth/login`, { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request(`${CHAT_API_URL}/api/auth/me`),
};

export const roomApi = {
  list: () => request(`${CHAT_API_URL}/api/rooms`),
  create: (payload) => request(`${CHAT_API_URL}/api/rooms`, { method: 'POST', body: JSON.stringify(payload) }),
  history: (roomId, before) =>
    request(`${CHAT_API_URL}/api/rooms/${roomId}/messages${before ? `?before=${before}` : ''}`),
};

// ---- analytics-service ----
export const analyticsApi = {
  history: (symbol, limit = 200) =>
    request(`${ANALYTICS_API_URL}/api/history?symbol=${symbol}&limit=${limit}`),
  stats: (symbol) => request(`${ANALYTICS_API_URL}/api/stats?symbol=${symbol}`),
};
