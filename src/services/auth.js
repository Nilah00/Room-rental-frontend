import api from "./api"
import { clearLocalFavorites } from "./api"
import adminApi from "./adminApi"

// Regular user authentication functions
export const login = async (credentials) => {
  try {
    console.log("Attempting to login with:", credentials)

    // Try the standard endpoint first
    try {
      const response = await api.post("/auth/login", credentials)
      handleSuccessfulLogin(response.data)
      return response.data
    } catch (error) {
      // If 404, try alternative endpoint
      if (error.response && error.response.status === 404) {
        console.log("Trying alternative login endpoint...")
        const response = await api.post("/login", credentials)
        handleSuccessfulLogin(response.data)
        return response.data
      }

      // For demo/testing purposes - if both endpoints fail, use mock login
      if (process.env.NODE_ENV === "development" || process.env.REACT_APP_USE_MOCK_AUTH === "true") {
        console.log("Using mock login for development...")
        // Check if credentials match our test user
        if (credentials.email === "user@example.com" && credentials.password === "password") {
          const mockData = {
            token: "mock-user-token",
            user: {
              id: "user-123",
              name: "Test User",
              email: credentials.email,
              role: "user",
            },
          }
          handleSuccessfulLogin(mockData)
          return mockData
        }
      }

      // If we get here, rethrow the original error
      throw error
    }
  } catch (error) {
    console.error("Login error:", error)
    throw error
  }
}

// Helper function to handle successful login
const handleSuccessfulLogin = (data) => {
  const { token, refreshToken, user } = data
  localStorage.setItem("token", token)
  localStorage.setItem("refreshToken", refreshToken)
  localStorage.setItem("user", JSON.stringify(user))

  // Set default auth header for future requests
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`
}

export const logout = () => {
  localStorage.removeItem("token")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("user")
  clearLocalFavorites()

  // Remove auth header
  delete api.defaults.headers.common["Authorization"]
}

// Admin-specific authentication functions
export const adminLogin = async (credentials) => {
  try {
    console.log("Attempting admin login with:", credentials)

    // First, ensure we're logged out of any existing admin session
    adminLogout()

    // For development/testing, use mock login first
    if (process.env.NODE_ENV === "development" || process.env.REACT_APP_USE_MOCK_AUTH === "true") {
      console.log("Using mock admin login for development...")
      // Check if credentials match our test admin
      if (credentials.email === "admin@roomrental.com" && credentials.password === "admin123") {
        const mockData = {
          token: "mock-admin-token",
          user: {
            id: "admin-123",
            name: "Admin User",
            email: credentials.email,
            role: "admin",
          },
        }
        handleSuccessfulAdminLogin(mockData)
        return mockData
      } else {
        console.error("Invalid admin credentials provided:", credentials.email)
        throw new Error("Invalid admin credentials")
      }
    }

    // If not in development or mock auth is disabled, try the API endpoints
    try {
      const response = await adminApi.post("/auth/admin/login", credentials)
      handleSuccessfulAdminLogin(response.data)
      return response.data
    } catch (error) {
      // If 404, try alternative endpoint
      if (error.response && error.response.status === 404) {
        console.log("Trying alternative admin login endpoint...")
        const response = await adminApi.post("/admin/login", credentials)
        handleSuccessfulAdminLogin(response.data)
        return response.data
      }
      throw error
    }
  } catch (error) {
    console.error("Admin login error:", error)
    throw error
  }
}

// Helper function to handle successful admin login
const handleSuccessfulAdminLogin = (data) => {
  const { token, user } = data
  localStorage.setItem("adminToken", token)
  localStorage.setItem("adminUser", JSON.stringify(user))

  // Set default auth header for future admin requests
  adminApi.defaults.headers.common["Authorization"] = `Bearer ${token}`
}

export const adminLogout = () => {
  console.log("Admin logout called")
  localStorage.removeItem("adminToken")
  localStorage.removeItem("adminUser")

  // Remove auth header
  delete adminApi.defaults.headers.common["Authorization"]
}

export const register = async (userData) => {
  try {
    // Try standard endpoint first
    try {
      const response = await api.post("/auth/register", userData)
      return response.data
    } catch (error) {
      // If 404, try alternative endpoint
      if (error.response && error.response.status === 404) {
        console.log("Trying alternative register endpoint...")
        const response = await api.post("/register", userData)
        return response.data
      }
      throw error
    }
  } catch (error) {
    console.error("Registration error:", error)
    throw error
  }
}

// Modify the isAuthenticated function to be more specific
export const isAuthenticated = () => {
  const token = localStorage.getItem("token")
  return !!token
}

// Modify the isAdminAuthenticated function to be more specific
export const isAdminAuthenticated = () => {
  const adminToken = localStorage.getItem("adminToken")
  return !!adminToken
}

export const getCurrentUser = () => {
  const userStr = localStorage.getItem("user")
  if (!userStr) return null
  return JSON.parse(userStr)
}

export const getCurrentAdmin = () => {
  const adminStr = localStorage.getItem("adminUser")
  if (!adminStr) return null
  return JSON.parse(adminStr)
}


