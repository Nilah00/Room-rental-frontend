import api from "./api"
import { clearLocalFavorites, getFavorites } from "../services/api"

export const login = async (credentials) => {
  try {
    const response = await api.post("/auth/login", credentials)
    const { token, user } = response.data
    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(user))

    // Fetch user-specific favorites after login
    const favorites = await getFavorites()
    localStorage.setItem("favorites", JSON.stringify(favorites.data))

    return response.data
  } catch (error) {
    console.error("Login error:", error)
    throw error
  }
}

export const logout = () => {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  clearLocalFavorites()
}

export const register = async (userData) => {
  try {
    const response = await api.post("/auth/register", userData)
    return response.data
  } catch (error) {
    console.error("Registration error:", error)
    throw error
  }
}

export const isAuthenticated = () => {
  const token = localStorage.getItem("token")
  return !!token
}
