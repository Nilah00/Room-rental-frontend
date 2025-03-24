import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

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

// Helper function to get the current user ID from the token
const getCurrentUserId = () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) return null

    // JWT tokens are in the format: header.payload.signature
    // We need to decode the payload part (the second part)
    const payload = token.split(".")[1]
    if (!payload) return null

    // Decode the base64 payload
    const decodedPayload = JSON.parse(atob(payload))
    return decodedPayload.id || decodedPayload.userId || decodedPayload.sub
  } catch (error) {
    console.error("Error getting user ID from token:", error)
    return null
  }
}

// Export the getCurrentUserId function so it can be used by components
export { getCurrentUserId }

// Add this helper function to check if a user is the owner of a property
export const isPropertyOwner = (property, userId) => {
  if (!property || !userId) return false

  const propertyOwnerId = property.owner?._id || property.owner
  return propertyOwnerId === userId
}

// Helper function to get user-specific localStorage key
const getUserStorageKey = (key) => {
  const userId = getCurrentUserId()
  return userId ? `${key}_${userId}` : key
}

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
        console.log(`Property: ${property.name}, Coordinates: ${property.latitude}, ${property.longitude}`)
      })
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

// Replace the existing getPropertyById function with this improved version
export const getPropertyById = async (id) => {
  console.log(`Fetching property with id:`, id)
  try {
    // If id is an object, extract the actual ID
    let propertyId = id
    if (typeof id === "object") {
      propertyId = id._id || id.id
      console.log("Extracted ID from object:", propertyId)
    }

    // Check if the ID is a timestamp (13 digits)
    if (/^\d{13}$/.test(propertyId)) {
      console.log("ID appears to be a timestamp, trying localStorage first")

      try {
        // Try to find the property in localStorage
        const storedPropertiesJson = localStorage.getItem("properties")
        if (storedPropertiesJson) {
          const storedProperties = JSON.parse(storedPropertiesJson)

          if (Array.isArray(storedProperties)) {
            // Look for a property with matching ID
            const property = storedProperties.find((p) => (p._id === propertyId || p.id === propertyId) && !p.isDeleted)

            if (property) {
              console.log("Found property in localStorage:", property.title)
              return property
            }
          }
        }
        console.log("Property not found in localStorage, trying API")
      } catch (localError) {
        console.error("Error searching localStorage:", localError)
      }
    }

    // Make the API call
    console.log("Making API request for property:", propertyId)
    const response = await api.get(`/properties/${propertyId}`)
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

    // Try localStorage as a fallback
    try {
      console.log("Trying localStorage as fallback after API error")
      const storedPropertiesJson = localStorage.getItem("properties")
      if (storedPropertiesJson) {
        const storedProperties = JSON.parse(storedPropertiesJson)

        if (Array.isArray(storedProperties)) {
          // Look for a property with matching ID
          const property = storedProperties.find((p) => (p._id === id || p.id === id) && !p.isDeleted)

          if (property) {
            console.log("Found property in localStorage fallback:", property.title)
            return property
          }

          // If we're in development and can't find the specific property, return the first one
          if (process.env.NODE_ENV === "development" || window.location.hostname === "localhost") {
            if (storedProperties.length > 0) {
              console.log("Development fallback - returning first property from localStorage")
              return storedProperties[0]
            }
          }
        }
      }
    } catch (fallbackError) {
      console.error("Error with localStorage fallback:", fallbackError)
    }

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

// Update the submitBookingRequest function to prevent landlords from booking their own properties
export const submitBookingRequest = async (bookingData) => {
  console.log("Submitting booking request:", bookingData)
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("Authentication required. Please log in to book a property.")
    }

    // Get the property details to check ownership
    try {
      const property = await getPropertyById(bookingData.propertyId)

      // Check if the current user is the owner of the property
      const currentUserId = getCurrentUserId()
      if (property && currentUserId) {
        if (isPropertyOwner(property, currentUserId)) {
          throw new Error(
            "You cannot book your own property. Landlords can only book properties listed by other landlords.",
          )
        }
      }
    } catch (propertyError) {
      console.error("Error checking property ownership:", propertyError)
      // If we can't verify ownership, we'll let the backend handle it
    }

    const response = await api.post("/bookings", bookingData)
    console.log("Booking response:", response)

    // After successful booking request, update the property status in localStorage
    try {
      const propertiesJson = localStorage.getItem("properties")
      if (propertiesJson) {
        const properties = JSON.parse(propertiesJson)
        const updatedProperties = properties.map((property) => {
          if ((property._id || property.id) === bookingData.propertyId) {
            return { ...property, status: "Pending" }
          }
          return property
        })
        localStorage.setItem("properties", JSON.stringify(updatedProperties))
      }
    } catch (localStorageError) {
      console.error("Error updating property status in localStorage:", localStorageError)
    }

    return response.data
  } catch (error) {
    console.error("Error submitting booking request:", error)

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

// Add this new function for getting user notifications
export const getUserNotifications = async () => {
  console.log("Fetching user notifications")
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      console.log("No token found, returning empty notifications")
      return []
    }

    // Get the user ID
    const userId = getCurrentUserId()
    console.log("Current user ID:", userId)

    if (!userId) {
      console.log("Could not determine user ID, returning all notifications")
      const response = await api.get("/notifications")
      return Array.isArray(response.data)
        ? response.data
        : response.data && Array.isArray(response.data.data)
          ? response.data.data
          : []
    }

    // Get the timestamp of when notifications were last cleared for this specific user
    const clearedTimestampKey = getUserStorageKey("notificationsClearedAt")
    const clearedTimestamp = localStorage.getItem(clearedTimestampKey)
    console.log(`Cleared timestamp for user ${userId}:`, clearedTimestamp)

    const response = await api.get("/notifications")
    console.log("Notifications response:", response)

    let data = Array.isArray(response.data)
      ? response.data
      : response.data && Array.isArray(response.data.data)
        ? response.data.data
        : []

    // Filter out notifications created before the cleared timestamp
    if (clearedTimestamp) {
      const clearedTime = Number.parseInt(clearedTimestamp, 10)
      console.log("Filtering notifications created before:", new Date(clearedTime).toISOString())

      data = data.filter((notification) => {
        const notificationTime = new Date(notification.createdAt).getTime()
        return notificationTime > clearedTime
      })

      console.log("Filtered notifications count:", data.length)
    }

    return data
  } catch (error) {
    console.error("Error fetching notifications:", error)
    // Return empty array instead of throwing error
    return []
  }
}

// Add this new function for marking notifications as read
export const markNotificationAsRead = async (notificationId) => {
  console.log(`Marking notification ${notificationId} as read`)
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("Authentication required")
    }

    const response = await api.patch(`/notifications/${notificationId}/read`)
    console.log("Mark notification as read response:", response)
    return response.data
  } catch (error) {
    console.error("Error marking notification as read:", error)
    throw error
  }
}

// Add this new function for getting booking requests for a landlord
export const getLandlordBookingRequests = async () => {
  console.log("Fetching landlord booking requests")
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      console.log("No token found, returning empty booking requests")
      return { data: [] }
    }

    const response = await api.get("/bookings/landlord")
    console.log("Landlord booking requests response:", response)
    return response.data
  } catch (error) {
    console.error("Error fetching landlord booking requests:", error)
    // Return empty array instead of throwing error
    return []
  }
}

// Add this function to handle booking status updates that also update property status
export const updateBookingStatus = async (bookingId, statusData) => {
  console.log(`Updating booking ${bookingId} status to:`, statusData)
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("Authentication required")
    }

    // Make a direct axios call to ensure proper headers
    const response = await axios({
      method: "patch",
      url: `${API_URL}/bookings/${bookingId}/status`,
      data: statusData,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    console.log("Update booking status response:", response)

    // If the booking was approved, update the property status to "Booked"
    if (statusData.status === "approved" && response.data && response.data.property) {
      try {
        const propertyId = response.data.property._id || response.data.propertyId
        await updatePropertyStatus(propertyId, { status: "Booked" })
        console.log(`Property ${propertyId} status updated to Booked`)
      } catch (propertyError) {
        console.error("Error updating property status:", propertyError)
      }
    }

    return response.data
  } catch (error) {
    console.error("Error updating booking status:", error)
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

    // Ensure amenities and customAmenities are properly formatted as JSON strings
    if (propertyData.has("amenities")) {
      try {
        // Check if it's already a JSON string
        JSON.parse(propertyData.get("amenities"))
      } catch (e) {
        // If not, convert it to a JSON string
        const amenities = propertyData.get("amenities")
        propertyData.set("amenities", JSON.stringify(amenities))
      }
    }

    if (propertyData.has("customAmenities")) {
      try {
        // Check if it's already a JSON string
        JSON.parse(propertyData.get("customAmenities"))
      } catch (e) {
        // If not, convert it to a JSON string
        const customAmenities = propertyData.get("customAmenities")
        propertyData.set("customAmenities", JSON.stringify(customAmenities))
      }
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

    // Ensure amenities and customAmenities are properly formatted as JSON strings
    if (propertyData.has("amenities")) {
      try {
        // Check if it's already a JSON string
        JSON.parse(propertyData.get("amenities"))
      } catch (e) {
        // If not, convert it to a JSON string
        const amenities = propertyData.get("amenities")
        propertyData.set("amenities", JSON.stringify(amenities))
      }
    }

    if (propertyData.has("customAmenities")) {
      try {
        // Check if it's already a JSON string
        JSON.parse(propertyData.get("customAmenities"))
      } catch (e) {
        // If not, convert it to a JSON string
        const customAmenities = propertyData.get("customAmenities")
        propertyData.set("customAmenities", JSON.stringify(customAmenities))
      }
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
    console.log(`Deleting property with ID: ${id}`)
    
    // First, remove the property from the map (localStorage)
    try {
      console.log("Removing property from map (localStorage)")
      const storedPropertiesJson = localStorage.getItem("properties")
      
      if (storedPropertiesJson) {
        const storedProperties = JSON.parse(storedPropertiesJson)
        
        if (Array.isArray(storedProperties)) {
          // Convert ID to string for consistent comparison
          const targetId = String(id).replace(/"/g, '')
          
          // Filter out the property to delete
          const updatedProperties = storedProperties.filter(property => {
            const propId = String(property._id || property.id || '').replace(/"/g, '')
            return propId !== targetId
          })
          
          // Save the updated array back to localStorage
          localStorage.setItem("properties", JSON.stringify(updatedProperties))
          console.log(`Property ${id} removed from map (localStorage)`)
          
          // Dispatch events to notify other components
          window.dispatchEvent(new CustomEvent("propertyDeleted", {
            detail: { propertyId: id },
          }))
          window.dispatchEvent(new Event("storage"))
          window.dispatchEvent(new Event("localStorageUpdated"))
          
          // Force refresh the map if the global function exists
          if (typeof window.forceRefreshMap === "function") {
            setTimeout(() => window.forceRefreshMap(), 300)
          }
        }
      }
    } catch (mapError) {
      console.error("Error removing property from map:", mapError)
      // Continue with API deletion even if map deletion fails
    }
    
    // Then delete from the server/database
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

      // Clear any previous user-specific data when logging in as a new user
      const userId = getCurrentUserId()
      if (userId) {
        // We don't want to clear everything, just make sure we're not using another user's settings
        console.log("Logged in as user:", userId)
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

const getToken = () => {
  return localStorage.getItem("token")
}

// Create a booking request
export const createBooking = async (bookingData) => {
  try {
    const response = await fetch(`${API_URL}/api/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(bookingData),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || "Failed to create booking")
    }

    return data
  } catch (error) {
    console.error("Error creating booking:", error)
    throw error
  }
}

// Get bookings for landlord
export const getLandlordBookings = async () => {
  try {
    const response = await fetch(`${API_URL}/api/bookings/landlord`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch landlord bookings")
    }

    return data.data
  } catch (error) {
    console.error("Error fetching landlord bookings:", error)
    throw error
  }
}

// Get bookings for tenant
export const getTenantBookings = async () => {
  try {
    const response = await fetch(`${API_URL}/api/bookings/tenant`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch tenant bookings")
    }

    return data.data
  } catch (error) {
    console.error("Error fetching tenant bookings:", error)
    throw error
  }
}

// Update booking status
export const updateBookingStatusNew = async (bookingId, status) => {
  try {
    const response = await fetch(`${API_URL}/api/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ status }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || "Failed to update booking status")
    }

    return data
  } catch (error) {
    console.error("Error updating booking status:", error)
    throw error
  }
}

// Cancel booking
export const cancelBooking = async (bookingId) => {
  try {
    const response = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || "Failed to cancel booking")
    }

    return data
  } catch (error) {
    console.error("Error cancelling booking:", error)
    throw error
  }
}

// Add a new function to clear all notifications
export const clearAllNotifications = async () => {
  try {
    // Get the current user ID
    const userId = getCurrentUserId()
    if (!userId) {
      console.error("Cannot clear notifications: User ID not found")
      return { success: false, message: "User ID not found" }
    }

    // Store the current timestamp when notifications were cleared for this specific user
    const currentTimestamp = Date.now()
    const storageKey = getUserStorageKey("notificationsClearedAt")

    localStorage.setItem(storageKey, currentTimestamp.toString())
    console.log(`Set ${storageKey} to:`, currentTimestamp, new Date(currentTimestamp).toISOString())

    return { success: true, message: "All notifications cleared" }
  } catch (error) {
    console.error("Error clearing all notifications:", error)
    throw error
  }
}

export default api