const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'presenty_token';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || 'Something went wrong';
    throw new Error(message);
  }
  return data;
};

const request = async (path, options = {}) => {
  const config = {
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const token = getAuthToken();

  config.headers = {
    ...defaultHeaders,
    ...(options.headers || {}),
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, config);
  return handleResponse(response);
};

export const authApi = {
  login: (password) => request('/api/auth/login', { method: 'POST', body: { password } }),
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
};

export const memberApi = {
  list: () => request('/api/members'),
  create: (name) => request('/api/members', { method: 'POST', body: { name } }),
  remove: (id) => request(`/api/members/${id}`, { method: 'DELETE' }),
};

export const attendanceApi = {
  today: () => request('/api/attendance/today'),
  summary: () => request('/api/attendance/summary'),
  mark: (memberId, session, present) =>
    request('/api/attendance', { method: 'POST', body: { memberId, session, present } }),
  commit: (session, action, password) =>
    request('/api/attendance/commit', { method: 'POST', body: { session, action, password } }),
};
