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

export const getFeaturedProperties = () => {
  console.log("Fetching featured properties")
  return api.get("/properties/latest").catch((error) => {
    console.error("Error fetching featured properties:", error)
    throw error
  })
}

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

export const getFavorites = async () => {
  console.log("Fetching user favorites")
  try {
    const response = await api.get("/users/favorites")
    console.log("Favorites response:", response.data)
    return response.data
  } catch (error) {
    console.error("Error fetching favorites:", error)
    throw error
  }
}

export const toggleFavorite = async (propertyId) => {
  console.log(`Toggling favorite for property with id: ${propertyId}`)
  try {
    const response = await api.post(`/users/favorites/${propertyId}`)
    console.log("Toggle favorite response:", response.data)
    return response.data
  } catch (error) {
    console.error(`Error toggling favorite for property with id ${propertyId}:`, error)
    throw error
  }
}

export const clearLocalFavorites = () => {
  localStorage.removeItem("favorites")
}

export const getUserProperties = () => {
  console.log("Fetching user properties")
  return api.get("/users/properties").catch((error) => {
    console.error("Error fetching user properties:", error)
    throw error
  })
}

export const getPropertyById = async (id) => {
  console.log(`Fetching property with id: ${id}`)
  try {
    const response = await api.get(`/properties/${id}`)
    console.log("API Response:", response)
    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    if (!response.data) {
      throw new Error("No data received from the server")
    }
    console.log("Property data:", response.data)
    return response.data
  } catch (error) {
    console.error(`Error fetching property with id ${id}:`, error)
    if (error.response) {
      console.error("Error response:", error.response.data)
      console.error("Error status:", error.response.status)
      console.error("Error headers:", error.response.headers)
    } else if (error.request) {
      console.error("Error request:", error.request)
    } else {
      console.error("Error message:", error.message)
    }
    throw error
  }
}

export default api