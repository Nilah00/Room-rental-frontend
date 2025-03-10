import axios from "axios"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

console.log("API URL:", API_URL)

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Add withCredentials if your API requires cookies
  withCredentials: true,
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

// Response interceptor for logging, error handling, and token refresh
api.interceptors.response.use(
  (response) => {
    console.log("Response:", response)
    return response
  },
  async (error) => {
    const originalRequest = error.config
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const newToken = await refreshToken()
        api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        console.error("Error refreshing token:", refreshError)
        // Redirect to login page
        window.location.href = "/login?expired=true"
        return Promise.reject(refreshError)
      }
    }
    console.error("API Error:", error.response ? error.response.data : error.message)
    return Promise.reject(error)
  },
)

// Property-related API calls
export const getFeaturedProperties = () => {
  console.log("Fetching featured properties")
  return api
    .get("/properties/latest", {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
    .catch((error) => {
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

export const updateProperty = async (id, propertyData) => {
  console.log("Updating property:", id, propertyData)
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("Authentication required")
    }

    // Make a direct axios call to ensure proper headers
    const response = await axios({
      method: "put",
      url: `${API_URL}/properties/${id}`,
      data: propertyData,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
      timeout: 30000, // 30 seconds
      maxContentLength: 50 * 1024 * 1024, // 50MB
      maxBodyLength: 50 * 1024 * 1024, // 50MB
    })

    console.log("Update property response:", response)
    return response.data
  } catch (error) {
    console.error("Error updating property:", error)
    throw error.response?.data || error
  }
}

export const updatePropertyStatus = async (id, statusData) => {
  console.log(`Updating status for property with id: ${id}`, statusData)
  try {
    // Make sure we're using the correct HTTP method (PATCH)
    const response = await api.patch(`/properties/${id}/status`, statusData)

    console.log("Update property status response:", response)

    // Check if the response contains the property data
    if (response.data && response.data.property) {
      console.log("Using property from response")
      return response.data.property
    }

    // If not, fetch the updated property
    console.log("Fetching updated property")
    const updatedProperty = await api.get(`/properties/${id}`)
    console.log("Fetched updated property:", updatedProperty.data)

    return updatedProperty.data
  } catch (error) {
    console.error("Error updating property status:", error)
    throw error.response?.data || error
  }
}

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
    const token = localStorage.getItem("token")
    if (!token) {
      console.log("No token found, returning empty favorites")
      return { data: [] }
    }

    // Make a direct axios call to ensure proper headers
    const response = await axios({
      method: "get",
      url: `${API_URL}/users/favorites`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    console.log("Favorites response:", response)

    // Update localStorage with the latest favorites
    if (response.data) {
      localStorage.setItem("favorites", JSON.stringify(response.data))
    }

    return response
  } catch (error) {
    console.error("Error fetching favorites:", error)
    // Return empty array instead of throwing error
    return { data: [] }
  }
}

export const toggleFavorite = async (propertyId) => {
  console.log(`Toggling favorite for property with id: ${propertyId}`)
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("Authentication required")
    }

    // Make a direct axios call to ensure proper headers
    const response = await axios({
      method: "post",
      url: `${API_URL}/users/favorites/${propertyId}`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    console.log("Toggle favorite response:", response)

    // After successful toggle, update the local favorites
    const favoritesResponse = await getFavorites()
    if (favoritesResponse.data) {
      localStorage.setItem("favorites", JSON.stringify(favoritesResponse.data))
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent("favoritesUpdated"))
    }

    return response.data
  } catch (error) {
    console.error(`Error toggling favorite for property with id ${propertyId}:`, error)
    throw error
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

