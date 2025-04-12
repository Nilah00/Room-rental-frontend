/**
 * Extracts and validates coordinates from a property object
 * @param {Object} property - The property object
 * @returns {Object|null} - Object with latitude and longitude or null if not found
 */
export const extractPropertyCoordinates = (property) => {
    if (!property) return null
  
    // Try direct latitude/longitude properties first
    let lat, lng
  
    if (property.latitude !== undefined && property.longitude !== undefined) {
      lat = Number.parseFloat(property.latitude)
      lng = Number.parseFloat(property.longitude)
  
      // Basic validation
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        console.log("Using direct coordinates:", { lat, lng })
        return { latitude: lat, longitude: lng }
      }
    }
  
    // Try location string if direct coordinates aren't valid
    if (property.location) {
      const coordsMatch = property.location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
      if (coordsMatch) {
        lat = Number.parseFloat(coordsMatch[1])
        lng = Number.parseFloat(coordsMatch[2])
  
        // Basic validation
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          console.log("Using coordinates from location string:", { lat, lng })
          return { latitude: lat, longitude: lng }
        }
      }
    }
  
    // Try coordinates object if available
    if (property.coordinates) {
      if (property.coordinates.lat !== undefined && property.coordinates.lng !== undefined) {
        lat = Number.parseFloat(property.coordinates.lat)
        lng = Number.parseFloat(property.coordinates.lng)
      } else if (property.coordinates.latitude !== undefined && property.coordinates.longitude !== undefined) {
        lat = Number.parseFloat(property.coordinates.latitude)
        lng = Number.parseFloat(property.coordinates.longitude)
      } else if (Array.isArray(property.coordinates) && property.coordinates.length >= 2) {
        lat = Number.parseFloat(property.coordinates[0])
        lng = Number.parseFloat(property.coordinates[1])
      }
  
      // Basic validation
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        console.log("Using coordinates from coordinates object:", { lat, lng })
        return { latitude: lat, longitude: lng }
      }
    }
  
    console.log("No valid coordinates found for property:", property.title || "Unknown property")
    return null
  }
  
  /**
   * Formats coordinates for display
   * @param {Object} coordinates - Object with latitude and longitude
   * @returns {string} - Formatted coordinates string
   */
  export const formatCoordinates = (coordinates) => {
    if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
      return "Coordinates not available"
    }
  
    return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
  }
  
  /**
   * Checks if coordinates are valid
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean} - Whether the coordinates are valid
   */
  export const areValidCoordinates = (lat, lng) => {
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  }
  
  