import axios from 'axios';

const resolveBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL || 'http://localhost:5010/api';
  // If the browser page is loaded over HTTPS, upgrade any remote HTTP URL to HTTPS to prevent Mixed Content blocking
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      url = url.replace(/^http:\/\//i, 'https://');
    }
  }
  return url;
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage to every outgoing request and enforce HTTPS
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Guarantee requests are sent over HTTPS when running on an HTTPS origin
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (config.baseURL && config.baseURL.startsWith('http://') && !config.baseURL.includes('localhost') && !config.baseURL.includes('127.0.0.1')) {
      config.baseURL = config.baseURL.replace(/^http:\/\//i, 'https://');
    }
    if (config.url && config.url.startsWith('http://') && !config.url.includes('localhost') && !config.url.includes('127.0.0.1')) {
      config.url = config.url.replace(/^http:\/\//i, 'https://');
    }
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

// Live Acknowledgement Endpoint (1-second heartbeat)
export const getLiveAck = () => api.get('/iot/ack');

// Dedicated Fault Logs Endpoints
export const getFaultLogs = (params = {}) => api.get('/faults', { params });
export const createFaultLog = (payload) => api.post('/faults', payload);
export const resolveFaultLog = (id) => api.put(`/faults/${id}/resolve`);

// Unified CRUD & Telemetry Endpoints for /api/device (GET, POST, PUT, DELETE)
export const getDevices = (params = {}) => api.get('/device', { params });
export const getDeviceById = (id, params = {}) => api.get(`/device/${id}`, { params });
export const createDevice = (payload) => api.post('/device', payload);
export const sendDeviceData = (payload) => api.post('/device', payload);
export const updateDevice = (id, payload) => api.put(id ? `/device/${id}` : '/device', payload);
export const deleteDevice = (id) => api.delete(id ? `/device/${id}` : '/device');

// Telemetry history helper via /api/data
export const getData = (params = {}) => api.get('/data', { params });
export const getDataById = (id) => api.get(`/data/${id}`);

// Authentication APIs (JWT)
export const loginUser = (credentials) => api.post('/auth/login', credentials);
export const registerUser = (userData) => api.post('/auth/register', userData);
export const googleAuth = (payload) => api.post('/auth/google', payload);
export const getCurrentUser = () => api.get('/auth/me');
export const updateUserProfile = (payload) => api.put('/auth/profile', payload);

// Device Claim & Assignment APIs
export const claimDeviceById = (payload) => api.post('/device/claim', payload);
export const getUserRegisteredDevices = (params = {}) => api.get('/device/user-registered-devices', { params });
export const approveUserRegisteredDevice = (id) => api.put(`/device/user-registered-devices/${id}/approve`);
export const rejectUserRegisteredDevice = (id, payload = {}) => api.put(`/device/user-registered-devices/${id}/reject`, payload);

// User Management APIs (/api/users)
export const getAllRegisteredUsers = (params = {}) => api.get('/users', { params });
export const createRegisteredUser = (payload) => api.post('/users', payload);
export const updateRegisteredUser = (id, payload) => api.put(`/users/${id}`, payload);
export const deleteRegisteredUser = (id) => api.delete(`/users/${id}`);
export const resetUserPassword = (id, payload) => api.post(`/users/${id}/reset-password`, payload);

// Admin Console User & Credential Management APIs (JWT Protected)
export const getAdminUsers = (params = {}) => api.get('/admin/users', { params });
export const createAdminUser = (payload) => api.post('/admin/users', payload);
export const updateAdminUser = (id, payload) => api.put(`/admin/users/${id}`, payload);
export const deleteAdminUser = (id) => api.delete(`/admin/users/${id}`);

// Motor Models Management APIs
export const getModels = () => api.get('/models');
export const getModelByNumber = (modelNumber) => api.get(`/models/${modelNumber}`);
export const createModel = (payload) => api.post('/models', payload);
export const updateModel = (modelNumber, payload) => api.put(`/models/${modelNumber}`, payload);
export const deleteModel = (modelNumber) => api.delete(`/models/${modelNumber}`);

export default api;
