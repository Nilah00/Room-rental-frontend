/**
 * Authentication and authorization utility functions
 */

/**
 * Gets the current authentication token
 * @returns {string|null} The authentication token or null if not found
 */
export const getAuthToken = () => {
    return localStorage.getItem("token")
  }
  
  /**
   * Checks if the user is authenticated
   * @returns {boolean} True if the user has a valid token
   */
  export const isAuthenticated = () => {
    const token = getAuthToken()
    return !!token
  }
  
  /**
   * Gets the current user ID from the JWT token
   * @returns {string|null} The user ID or null if not found
   */
  export const getCurrentUserId = () => {
    try {
      const token = getAuthToken()
      if (!token) return null
  
      // JWT tokens are in the format: header.payload.signature
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
  
  /**
   * Creates a mock booking for testing when API fails
   * @param {string} bookingId - The booking ID
   * @param {Object} propertyData - The property data
   * @returns {Object} A mock booking object
   */
  export const createMockBooking = (bookingId, propertyData) => {
    const property = propertyData || {
      _id: "mock-property-id",
      title: "Sample Property",
      price: 10000,
      location: "Sample Location",
      images: [],
    }
  
    return {
      _id: bookingId,
      propertyId: property._id || property.id,
      property: property,
      status: "approved",
      moveInDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentStatus: "pending",
      amount: property.price || 10000,
      depositAmount: Math.round((property.price || 10000) * 0.5), // 50% deposit
    }
  }
  