import axios from "axios"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

console.log("API URL:", API_URL)

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
})

// Request interceptor for adding auth token
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

// Response interceptor for logging and error handling
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

// Response interceptor for handling token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401 && error.response.data.code === "TOKEN_EXPIRED") {
      // Token has expired
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      // Redirect to login page
      window.location.href = "/login?expired=true"
    }
    return Promise.reject(error)
  },
)

// Property-related API calls
export const getFeaturedProperties = () => {
  console.log("Fetching featured properties")
  return api.get("/properties/latest").catch((error) => {
    console.error("Error fetching featured properties:", error)
    throw error
  })
}

export const getProperties = () => api.get("/properties")

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

export const addProperty = async (propertyData) => {
  console.log("Adding property:", propertyData)
  try {
    // Log the FormData contents for debugging
    for (const [key, value] of propertyData.entries()) {
      console.log(`${key}:`, value)
    }

    const response = await api.post("/properties", propertyData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      // Add timeout and larger size limit
      timeout: 30000, // 30 seconds
      maxContentLength: 50 * 1024 * 1024, // 50MB
      maxBodyLength: 50 * 1024 * 1024, // 50MB
    })

    console.log("Add property response:", response)
    return response
  } catch (error) {
    console.error("Error in addProperty:", error)

    // Handle specific error cases
    if (error.response) {
      // The server responded with an error status
      console.error("Server error response:", error.response.data)
      throw new Error(error.response.data.message || "Server error occurred")
    } else if (error.request) {
      // The request was made but no response received
      console.error("No response received:", error.request)
      throw new Error("No response from server. Please check your connection.")
    } else {
      // Something else went wrong
      console.error("Error message:", error.message)
      throw new Error(error.message || "An unexpected error occurred")
    }
  }
}

export const updateProperty = (id, propertyData) => api.put(`/properties/${id}`, propertyData)

export const deleteProperty = async (id) => {
  try {
    const response = await api.delete(`/properties/${id}`)
    console.log("Delete property response:", response)
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to delete property")
    }
    return response.data
  } catch (error) {
    console.error("Error in deleteProperty:", error)
    throw new Error(error.response?.data?.message || error.message || "Server error")
  }
}

// User-related API calls
export const login = (credentials) => api.post("/auth/login", credentials)

export const register = (userData) => api.post("/auth/register", userData)

// Favorites-related API calls
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

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to update favorite status")
    }

    return response.data
  } catch (error) {
    console.error(`Error toggling favorite for property with id ${propertyId}:`, error)
    throw error.response?.data || error
  }
}

export const clearLocalFavorites = () => {
  localStorage.removeItem("favorites")
}

// User properties-related API calls
export const getUserProperties = () => {
  console.log("Fetching user properties")
  return api.get("/users/properties").catch((error) => {
    console.error("Error fetching user properties:", error)
    throw error
  })
}

export const refreshToken = async () => {
  try {
    const response = await api.post("/auth/refresh-token")
    const { token } = response.data
    localStorage.setItem("token", token)
    return token
  } catch (error) {
    console.error("Error refreshing token:", error)
    throw error
  }
}

export default api

