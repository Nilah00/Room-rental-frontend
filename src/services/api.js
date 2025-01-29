import axios from "axios"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

console.log("API URL:", API_URL)

const api = axios.create({
  baseURL: API_URL,
})

api.interceptors.request.use(
  (config) => {
    console.log("Request config:", config)
    const token = localStorage.getItem("token")
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error("Request interceptor error:", error)
    return Promise.reject(error)
  },
)

api.interceptors.response.use(
  (response) => {
    console.log("Response:", response)
    return response
  },
  (error) => {
    console.error("API Error:", error.response ? error.response.data : error.message)
    return Promise.reject(error)
  },
)

export const addProperty = (propertyData) => {
  console.log("Adding property:", propertyData)
  return api.post("/properties", propertyData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
}

export const login = (credentials) => api.post("/auth/login", credentials)
export const register = (userData) => api.post("/auth/register", userData)

export const getProperties = () => api.get("/properties")
export const updateProperty = (id, propertyData) => api.put(`/properties/${id}`, propertyData)
export const deleteProperty = (id) => api.delete(`/properties/${id}`)

export const getFavorites = () => api.get("/users/favorites")
export const addFavorite = (propertyId) => api.post(`/users/favorites/${propertyId}`)
export const removeFavorite = (propertyId) => api.delete(`/users/favorites/${propertyId}`)

export default api

