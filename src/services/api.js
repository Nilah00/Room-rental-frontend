import axios from "axios"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

console.log("API URL:", API_URL)

// Add these variables before the interceptors
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

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

// Replace the response interceptor with this improved version
api.interceptors.response.use(
  (response) => {
    console.log("Response:", response)
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If token refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newToken = await refreshToken()
        api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`

        // Process any queued requests with the new token
        processQueue(null, newToken)

        // Retry the original request
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        console.error("Error refreshing token:", refreshError)
        processQueue(refreshError, null)

        // Redirect to login page
        window.location.href = "/login?expired=true"
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
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

export const getProperties = async () => {
  console.log("Fetching all properties")
  try {
    const response = await api.get("/properties", {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
    console.log("Properties response:", response)
    
    // Check if the response data contains properties and valid coordinates
    if (response.data && response.data.length > 0) {
      response.data.forEach((property) => {
        console.log(`Property: ${property.name}, Coordinates: ${property.latitude}, ${property.longitude}`);
      });
    }

    return response
  } catch (error) {
    console.error("Error fetching properties:", error)
    try {
      console.log("Trying alternative endpoint for properties")
      const response = await api.get("/properties/all")
      console.log("Properties response from alternative endpoint:", response)
      return response
    } catch (secondError) {
      console.error("Error fetching properties from alternative endpoint:", secondError)
      throw error
    }
  }
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

    // Dispatch an event to notify components that a property has been added
    window.dispatchEvent(new CustomEvent("propertyUpdated"))

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

    // Dispatch an event to notify components that a property has been updated
    window.dispatchEvent(new CustomEvent("propertyUpdated"))

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

    // Dispatch an event to notify components that a property has been deleted
    window.dispatchEvent(new CustomEvent("propertyUpdated"))

    return response.data
  } catch (error) {
    console.error("Error in deleteProperty:", error)
    throw new Error(error.response?.data?.message || error.message || "Server error")
  }
}

// User-related API calls
export const login = async (credentials) => {
  try {
    const response = await api.post("/auth/login", credentials)

    // Store both token and refreshToken if available
    if (response.data && response.data.token) {
      localStorage.setItem("token", response.data.token)

      if (response.data.refreshToken) {
        localStorage.setItem("refreshToken", response.data.refreshToken)
      }
    }

    return response
  } catch (error) {
    console.error("Login error:", error)
    throw error
  }
}

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
    // Get the refresh token from localStorage
    const refreshToken = localStorage.getItem("refreshToken")

    if (!refreshToken) {
      throw new Error("No refresh token available")
    }

    // Make a direct axios call without using the intercepted instance
    const response = await axios.post(
      `${API_URL}/auth/refresh-token`,
      { refreshToken },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    console.log("Token refresh response:", response)

    if (response.data && response.data.token) {
      const { token, refreshToken: newRefreshToken } = response.data
      localStorage.setItem("token", token)

      // Save the new refresh token if provided
      if (newRefreshToken) {
        localStorage.setItem("refreshToken", newRefreshToken)
      }

      return token
    } else {
      throw new Error("Invalid token refresh response")
    }
  } catch (error) {
    console.error("Error refreshing token:", error)
    // Clear tokens on refresh failure
    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    throw error
  }
}

export default api

