const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

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
    credentials: 'include',
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  config.headers = {
    ...defaultHeaders,
    ...(options.headers || {}),
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
