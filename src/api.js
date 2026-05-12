import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: apiBaseUrl
});

api.interceptors.request.use((config) => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    const user = JSON.parse(storedUser);
    config.headers['x-user-role'] = user.role;
    config.headers['x-user-id'] = user.id;
  }
  return config;
});
