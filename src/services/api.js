import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response ? error.response.data : error.message);
    return Promise.reject(error);
  }
);

export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);

export const getProperties = () => api.get('/properties');
export const addProperty = (propertyData) => {
  return api.post('/properties', propertyData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
export const updateProperty = (id, propertyData) => api.put(`/properties/${id}`, propertyData);
export const deleteProperty = (id) => api.delete(`/properties/${id}`);

export const getFavorites = () => api.get('/users/favorites');
export const addFavorite = (propertyId) => api.post(`/users/favorites/${propertyId}`);
export const removeFavorite = (propertyId) => api.delete(`/users/favorites/${propertyId}`);

export default api;

