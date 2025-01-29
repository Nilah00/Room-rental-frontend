const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

export const getImageUrl = (imagePath) => {
  if (!imagePath) return "/placeholder.svg"
  // If the path is already a full URL, return it as is
  if (imagePath.startsWith("http")) return imagePath
  // Remove any leading slashes to avoid double slashes
  const cleanPath = imagePath.replace(/^\/+/, "")
  return `${API_URL}/${cleanPath}`
}

export const handleImageError = (e) => {
  e.target.onerror = null // Prevent infinite loop
  e.target.src = "/placeholder.svg"
}

