import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5010/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Dashboard & Sensors APIs
export const getDashboardOverview = (deviceId) => api.get('/dashboard/overview', { params: deviceId ? { deviceId } : {} });
export const getLatestSensors = (deviceId) => api.get('/sensors/latest', { params: deviceId ? { deviceId } : {} });
export const getSensorHistory = (limit = 50, deviceId) => api.get(`/sensors/history`, { params: { limit, ...(deviceId ? { deviceId } : {}) } });
export const getWaterLevelHistory = (limit = 30, deviceId) => api.get(`/water-level/history`, { params: { limit, ...(deviceId ? { deviceId } : {}) } });
export const getPowerHistory = (range = '24h', deviceId) => api.get(`/power/history`, { params: { range, ...(deviceId ? { deviceId } : {}) } });
export const getMotorStatus = (deviceId) => api.get('/motor/status', { params: deviceId ? { deviceId } : {} });
export const getMotorHistory = (limit = 20, deviceId) => api.get(`/motor/history`, { params: { limit, ...(deviceId ? { deviceId } : {}) } });
export const getMotorConsumption = (deviceId) => api.get('/motor/consumption', { params: deviceId ? { deviceId } : {} });
export const forceMotorOn = (source = 'dashboard', deviceId) => api.post('/motor/force-on', { source, ...(deviceId ? { deviceId } : {}) });
export const forceMotorOff = (source = 'dashboard', deviceId) => api.post('/motor/force-off', { source, ...(deviceId ? { deviceId } : {}) });
export const getSystemHealth = () => api.get('/system/health');

// Unified CRUD & Telemetry Endpoints for /api/device (GET, POST, PUT, DELETE)
export const getDevices = (params = {}) => api.get('/device', { params });
export const getDeviceById = (id, params = {}) => api.get(`/device/${id}`, { params });
export const createDevice = (payload) => api.post('/device', payload);
export const sendDeviceData = (payload) => api.post('/device', payload);
export const updateDevice = (id, payload) => api.put(id ? `/device/${id}` : '/device', payload);
export const deleteDevice = (id) => api.delete(id ? `/device/${id}` : '/device');

// Telemetry history helper via /api/device
export const getData = (params = {}) => api.get('/device', { params: { ...params, view: 'telemetry' } });
export const getDataById = (id) => api.get(`/device/${id}`);

// Authentication APIs (JWT)
export const loginUser = (credentials) => api.post('/auth/login', credentials);
export const registerUser = (userData) => api.post('/auth/register', userData);
export const getCurrentUser = () => api.get('/auth/me');

// Admin Console User & Credential Management APIs (JWT Protected)
export const getAdminUsers = (params = {}) => api.get('/admin/users', { params });
export const createAdminUser = (payload) => api.post('/admin/users', payload);
export const updateAdminUser = (id, payload) => api.put(`/admin/users/${id}`, payload);
export const deleteAdminUser = (id) => api.delete(`/admin/users/${id}`);

export default api;
