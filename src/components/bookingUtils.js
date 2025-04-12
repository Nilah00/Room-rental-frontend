/**
 * Utility functions for handling booking data
 */

/**
 * Saves booking data to localStorage
 * @param {string} bookingId - The booking ID
 * @param {Object} bookingData - The booking data to save
 */
export const saveBookingData = (bookingId, bookingData) => {
    if (!bookingId || !bookingData) return
  
    try {
      localStorage.setItem(`booking_${bookingId}`, JSON.stringify(bookingData))
      console.log(`Booking data saved to localStorage for ID: ${bookingId}`)
    } catch (error) {
      console.error("Error saving booking data to localStorage:", error)
    }
  }
  
  /**
   * Retrieves booking data from localStorage
   * @param {string} bookingId - The booking ID
   * @returns {Object|null} The booking data or null if not found
   */
  export const getBookingData = (bookingId) => {
    if (!bookingId) return null
  
    try {
      const data = localStorage.getItem(`booking_${bookingId}`)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error("Error retrieving booking data from localStorage:", error)
      return null
    }
  }
  
  /**
   * Creates a mock booking object for testing
   * @param {string} bookingId - The booking ID
   * @param {string} propertyId - The property ID
   * @returns {Object} A mock booking object
   */
  export const createMockBooking = (bookingId, propertyId, propertyPrice = 10000) => {
    return {
      _id: bookingId,
      propertyId: propertyId,
      status: "approved",
      moveInDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentStatus: "pending",
      amount: propertyPrice,
      depositAmount: Math.round(propertyPrice * 0.5), // 50% deposit
    }
  }
  
  /**
   * Updates payment status for a booking
   * @param {string} bookingId - The booking ID
   * @param {string} status - The payment status
   */
  export const updatePaymentStatus = (bookingId, status) => {
    if (!bookingId) return
  
    try {
      // Get existing booking data
      const bookingData = getBookingData(bookingId)
      if (bookingData) {
        // Update payment status
        bookingData.paymentStatus = status
        // Save updated booking data
        saveBookingData(bookingId, bookingData)
        console.log(`Payment status updated to ${status} for booking ${bookingId}`)
      }
    } catch (error) {
      console.error("Error updating payment status:", error)
    }
  }
  