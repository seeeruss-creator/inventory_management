import axios from 'axios';

export const api = axios.create({
  baseURL: '/api'
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
