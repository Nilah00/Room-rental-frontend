/**
 * Validates if the given coordinates are valid geographic coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} - Whether the coordinates are valid
 */
export const validateCoordinates = (lat, lng) => {
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  }
  
  /**
   * Attempts to extract coordinates from a location string
   * @param {string} locationString - The location string to parse
   * @returns {Object|null} - Object with latitude and longitude or null if not found
   */
  export const extractCoordinatesFromString = (locationString) => {
    if (!locationString) return null
  
    // Try to extract coordinates from location string if it contains lat,lng format
    const coordsMatch = locationString.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
    if (coordsMatch) {
      const lat = Number.parseFloat(coordsMatch[1])
      const lng = Number.parseFloat(coordsMatch[2])
  
      if (validateCoordinates(lat, lng)) {
        return { latitude: lat, longitude: lng }
      }
    }
  
    return null
  }
  
  /**
   * Gets the coordinates from a property object, trying multiple sources
   * @param {Object} property - The property object
   * @returns {Object|null} - Object with latitude and longitude or null if not found
   */
  export const getPropertyCoordinates = (property) => {
    if (!property) return null
  
    // Try direct coordinates first
    let lat = Number.parseFloat(property.latitude)
    let lng = Number.parseFloat(property.longitude)
  
    if (validateCoordinates(lat, lng)) {
      return { latitude: lat, longitude: lng }
    }
  
    // Try location string next
    if (property.location) {
      const extractedCoords = extractCoordinatesFromString(property.location)
      if (extractedCoords) {
        return extractedCoords
      }
    }
  
    // Try coordinates object if available
    if (property.coordinates) {
      if (property.coordinates.lat && property.coordinates.lng) {
        lat = Number.parseFloat(property.coordinates.lat)
        lng = Number.parseFloat(property.coordinates.lng)
        if (validateCoordinates(lat, lng)) {
          return { latitude: lat, longitude: lng }
        }
      } else if (property.coordinates.latitude && property.coordinates.longitude) {
        lat = Number.parseFloat(property.coordinates.latitude)
        lng = Number.parseFloat(property.coordinates.longitude)
        if (validateCoordinates(lat, lng)) {
          return { latitude: lat, longitude: lng }
        }
      }
    }
  
    return null
  }
  
  