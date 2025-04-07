const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

// Better base64 placeholder - a gray image with a house icon
const BASE64_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFOEVBRUQiLz48cGF0aCBkPSJNMTAwIDY1TDU1IDk1VjE0NUgxNDVWOTVMMTAwIDY1WiIgZmlsbD0iIzk0OTQ5NCIvPjxyZWN0IHg9Ijg1IiB5PSIxMTUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgZmlsbD0id2hpdGUiLz48L3N2Zz4="

export const getImageUrl = (imagePath) => {
  console.log("getImageUrl called with:", imagePath, "type:", typeof imagePath)

  // Handle null, undefined, or non-string values
  if (!imagePath || typeof imagePath !== "string") {
    console.log("Invalid image path, returning placeholder")
    return BASE64_PLACEHOLDER
  }

  // If the path is already a full URL or base64, return it as is
  if (imagePath.startsWith("http") || imagePath.startsWith("data:")) {
    return imagePath
  }

  // If it's a placeholder path, return it directly
  if (imagePath === "placeholder.svg" || imagePath === "/placeholder.svg") {
    return "/placeholder.svg"
  }

  // Remove any leading slashes to avoid double slashes
  const cleanPath = imagePath.replace(/^\/+/, "")
  const fullUrl = `${API_URL}/${cleanPath}`
  console.log("Generated full URL:", fullUrl)
  return fullUrl
}

export const handleImageError = (e) => {
  console.error("Image error occurred for:", e.target.src)
  e.target.onerror = null // Prevent infinite loop
  e.target.src = BASE64_PLACEHOLDER
}

