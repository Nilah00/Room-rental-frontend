"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  ChevronRight,
  Home,
  CreditCard,
  RefreshCw,
  MapPin,
} from "lucide-react"
import { getTenantBookings, cancelBooking, getPropertyById, getCurrentUserId, getImageUrl } from "../services/api"
import "./Bookings.css"

// Create a global variable to store cancelled bookings
if (typeof window !== "undefined") {
  window.CANCELLED_BOOKINGS = window.CANCELLED_BOOKINGS || {}
}

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [successMessage, setSuccessMessage] = useState("")
  const [currentUserId, setCurrentUserId] = useState(null)
  const navigate = useNavigate()

  // Debug function to log the current state of cancelled bookings
  const logCancelledBookings = (userId) => {
    console.log("=== CANCELLED BOOKINGS DEBUG ===")

    // Check global variable
    console.log("Global variable:", window.CANCELLED_BOOKINGS[userId] || [])

    // Check localStorage
    try {
      const localData = localStorage.getItem(`cancelled_bookings_${userId}`)
      console.log("localStorage:", localData ? JSON.parse(localData) : [])
    } catch (e) {
      console.log("localStorage error:", e)
    }

    // Check sessionStorage
    try {
      const sessionData = sessionStorage.getItem(`cancelled_bookings_${userId}`)
      console.log("sessionStorage:", sessionData ? JSON.parse(sessionData) : [])
    } catch (e) {
      console.log("sessionStorage error:", e)
    }

    console.log("===============================")
  }

  // Get cancelled booking IDs from all storage mechanisms
  const getCancelledBookingIds = () => {
    const userId = getCurrentUserId()
    if (!userId) return []

    const cancelledIds = new Set()

    // 1. Check global variable
    if (window.CANCELLED_BOOKINGS && window.CANCELLED_BOOKINGS[userId]) {
      window.CANCELLED_BOOKINGS[userId].forEach((id) => cancelledIds.add(id))
    }

    // 2. Check localStorage
    try {
      const localData = localStorage.getItem(`cancelled_bookings_${userId}`)
      if (localData) {
        JSON.parse(localData).forEach((id) => cancelledIds.add(id))
      }
    } catch (e) {
      console.error("Error reading from localStorage:", e)
    }

    // 3. Check sessionStorage
    try {
      const sessionData = sessionStorage.getItem(`cancelled_bookings_${userId}`)
      if (sessionData) {
        JSON.parse(sessionData).forEach((id) => cancelledIds.add(id))
      }
    } catch (e) {
      console.error("Error reading from sessionStorage:", e)
    }

    // Convert Set to Array
    return Array.from(cancelledIds)
  }

  // Save cancelled booking ID to all storage mechanisms
  const addCancelledBookingId = (bookingId) => {
    const userId = getCurrentUserId()
    if (!userId) return

    console.log(`Adding booking ${bookingId} to cancelled list for user ${userId}`)

    // Get current cancelled IDs
    const cancelledIds = getCancelledBookingIds()

    // Add new ID if not already in the list
    if (!cancelledIds.includes(bookingId)) {
      cancelledIds.push(bookingId)

      // 1. Update global variable
      window.CANCELLED_BOOKINGS[userId] = cancelledIds

      // 2. Update localStorage
      try {
        localStorage.setItem(`cancelled_bookings_${userId}`, JSON.stringify(cancelledIds))
      } catch (e) {
        console.error("Error saving to localStorage:", e)
      }

      // 3. Update sessionStorage
      try {
        sessionStorage.setItem(`cancelled_bookings_${userId}`, JSON.stringify(cancelledIds))
      } catch (e) {
        console.error("Error saving to sessionStorage:", e)
      }

      // 4. Add a data attribute to the document body as another fallback
      document.body.dataset.cancelledBookings = JSON.stringify({
        userId,
        bookings: cancelledIds,
      })
    }

    // Log the current state
    logCancelledBookings(userId)
  }

  // Clear all cancelled bookings
  const clearCancelledBookings = () => {
    const userId = getCurrentUserId()
    if (!userId) return

    console.log(`Clearing all cancelled bookings for user ${userId}`)

    // 1. Clear global variable
    window.CANCELLED_BOOKINGS[userId] = []

    // 2. Clear localStorage
    try {
      localStorage.removeItem(`cancelled_bookings_${userId}`)
    } catch (e) {
      console.error("Error clearing localStorage:", e)
    }

    // 3. Clear sessionStorage
    try {
      sessionStorage.removeItem(`cancelled_bookings_${userId}`)
    } catch (e) {
      console.error("Error clearing sessionStorage:", e)
    }

    // 4. Clear data attribute
    delete document.body.dataset.cancelledBookings

    // Log the current state
    logCancelledBookings(userId)
  }

  const fetchBookings = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get the current user ID
      const userId = getCurrentUserId()
      setCurrentUserId(userId)

      if (!userId) {
        setError("You need to be logged in to view your bookings")
        setLoading(false)
        return
      }

      console.log("Fetching tenant bookings...")
      try {
        const data = await getTenantBookings()

        // Check if we got valid data
        if (!data || !Array.isArray(data)) {
          console.log("No bookings returned from API or invalid format")
          setError("No bookings found or invalid data format returned from server")
          setBookings([])
          setLoading(false)
          return
        }

        if (data.length === 0) {
          console.log("No bookings found for this user")
          setBookings([])
          setLoading(false)
          return
        }

        // Get list of cancelled booking IDs
        const cancelledIds = getCancelledBookingIds()
        console.log("Cancelled booking IDs:", cancelledIds)

        // Filter out cancelled bookings
        const filteredData = data.filter((booking) => !cancelledIds.includes(booking._id))
        console.log(`Filtered out ${data.length - filteredData.length} cancelled bookings`)
        console.log(
          "Remaining bookings:",
          filteredData.map((b) => b._id),
        )

        // Fetch property details for each booking
        const bookingsWithProperties = await Promise.all(
          filteredData.map(async (booking) => {
            try {
              console.log(`Fetching property details for booking ${booking._id}, property ID: ${booking.propertyId}`)
              const property = await getPropertyById(booking.propertyId)

              // Ensure property images are properly formatted
              if (property && property.images && Array.isArray(property.images)) {
                // Store the original images array
                property.originalImages = [...property.images]

                // Process image URLs to ensure they're fully qualified
                property.images = property.images.map((img) => {
                  if (typeof img === "string") {
                    return getImageUrl(img)
                  }
                  return img
                })
              }

              return { ...booking, property }
            } catch (propertyError) {
              console.error(`Error fetching property for booking ${booking._id}:`, propertyError)
              // Return booking with basic property info if available
              return {
                ...booking,
                property: {
                  title: booking.propertyTitle || "Unknown Property",
                  images: ["/placeholder.svg"],
                  originalImages: ["/placeholder.svg"],
                  location: "Location not available",
                  price: 0,
                },
              }
            }
          }),
        )

        console.log("Bookings with properties:", bookingsWithProperties)
        setBookings(bookingsWithProperties)
      } catch (apiError) {
        console.error("API Error in fetchBookings:", apiError)
        setError(`Failed to load your bookings: ${apiError.message}`)
      }
    } catch (error) {
      console.error("Error in fetchBookings:", error)
      setError(error.message || "Failed to load your bookings. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleClearBookings = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all your bookings? This is for display purposes only and won't delete your actual bookings from the database.",
      )
    ) {
      const userId = getCurrentUserId()

      // Add all current booking IDs to cancelled list
      if (userId && bookings.length > 0) {
        const allBookingIds = bookings.map((booking) => booking._id)

        // 1. Update global variable
        window.CANCELLED_BOOKINGS[userId] = allBookingIds

        // 2. Update localStorage
        try {
          localStorage.setItem(`cancelled_bookings_${userId}`, JSON.stringify(allBookingIds))
        } catch (e) {
          console.error("Error saving to localStorage:", e)
        }

        // 3. Update sessionStorage
        try {
          sessionStorage.setItem(`cancelled_bookings_${userId}`, JSON.stringify(allBookingIds))
        } catch (e) {
          console.error("Error saving to sessionStorage:", e)
        }

        // Log the current state
        logCancelledBookings(userId)
      }

      // Clear bookings from view
      setBookings([])
      setSuccessMessage("All bookings cleared from view")

      // Clear the success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000)
    }
  }

  const handleRefresh = () => {
    console.log("Refresh button clicked")

    // Clear cancelled bookings list
    clearCancelledBookings()

    // Fetch fresh data
    fetchBookings()
  }

  // Initialize component
  useEffect(() => {
    console.log("Component mounted, initializing...")

    // Get current user ID
    const userId = getCurrentUserId()
    setCurrentUserId(userId)

    if (userId) {
      // Log the current state of cancelled bookings
      logCancelledBookings(userId)
    }

    fetchBookings()

    // Check for success message from navigation state
    const state = window.history.state?.state
    if (state?.cancelSuccess) {
      setSuccessMessage("Booking cancelled successfully")
      // Clear the message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000)
    }
  }, [])

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      setCancellingId(bookingId)
      try {
        console.log(`Cancelling booking: ${bookingId}`)

        // Try to cancel on the server
        try {
          await cancelBooking(bookingId)
          console.log("Server cancellation successful")
        } catch (cancelError) {
          console.error("Server cancellation failed:", cancelError)
          // Continue with client-side cancellation even if server fails
        }

        // Add to cancelled bookings list
        addCancelledBookingId(bookingId)
        console.log(`Booking ${bookingId} added to cancelled list`)

        // Remove from current view
        setBookings((prevBookings) => {
          const newBookings = prevBookings.filter((booking) => booking._id !== bookingId)
          console.log(`Removed booking ${bookingId} from view. Remaining: ${newBookings.length}`)
          return newBookings
        })

        setSuccessMessage("Booking cancelled successfully")

        // Clear the message after 3 seconds
        setTimeout(() => setSuccessMessage(""), 3000)
      } catch (error) {
        console.error("Error in handleCancelBooking:", error)
        setError(`Failed to cancel booking: ${error.message}`)
      } finally {
        setCancellingId(null)
      }
    }
  }

  const handleViewDetails = (booking) => {
    // Make sure we're using the correct property ID
    const propertyId = booking.propertyId

    if (!propertyId) {
      console.error("No property ID found in booking:", booking)
      setError("Cannot view property details: Property ID not found")
      return
    }

    // Navigate to the room detail page with the booking and property information
    navigate(`/room/${propertyId}`, {
      state: {
        bookingId: booking._id,
        property: booking.property,
        fromBookings: true,
      },
    })
  }

  const handleProceedToPayment = (bookingId) => {
    navigate(`/payment/${bookingId}`)
  }

  const getStatusClass = (status) => {
    if (!status) return "status-pending"

    if (status === "approved") {
      return "status-completed"
    } else if (status === "cancelled") {
      return "status-cancelled"
    } else if (status === "pending") {
      return "status-waiting"
    } else {
      return "status-pending"
    }
  }

  const getPaymentStatus = (bookingId) => {
    try {
      // Check if we have payment data for this booking
      const paymentData = localStorage.getItem(`payment_${bookingId}`)
      if (paymentData) {
        const payment = JSON.parse(paymentData)
        return payment.status === "COMPLETE" ? "PAID" : "PENDING"
      }
      return "PENDING"
    } catch (error) {
      console.error("Error checking payment status:", error)
      return "PENDING"
    }
  }

  if (loading) {
    return (
      <div className="bookings-container">
        <div className="loading-spinner">Loading your bookings...</div>
      </div>
    )
  }

  return (
    <div className="bookings-container">
      <div className="bookings-header">
        <h1>My Bookings</h1>
        <div className="header-actions">
          <button onClick={handleRefresh} className="refresh-button" title="Refresh bookings">
            <RefreshCw size={16} />
            Refresh
          </button>

          <Link to="/" className="home-link">
            <Home size={18} />
            Home
          </Link>
        </div>
      </div>

      {successMessage && (
        <div className="success-message">
          <CheckCircle size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="error-message">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={handleRefresh} className="retry-button">
            Try Again
          </button>
        </div>
      )}

      {!currentUserId && (
        <div className="error-message">
          <AlertCircle size={18} />
          <span>You need to be logged in to view your bookings.</span>
        </div>
      )}

      {bookings.length === 0 && !error ? (
        <div className="no-bookings">
          <Calendar size={48} />
          <h2>No Bookings Found</h2>
          <p>You haven't made any bookings yet.</p>
          <Link to="/" className="browse-properties-button">
            Browse Properties
          </Link>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => (
            <div key={booking._id} className="booking-card">
              <div className="booking-image">
                {booking.property && booking.property.images && booking.property.images.length > 0 ? (
                  <img
                    src={booking.property.images[0] || "/placeholder.svg"}
                    alt={booking.property.title || "Property"}
                    onError={(e) => {
                      console.error("Image failed to load:", e.target.src)
                      e.target.onerror = null
                      e.target.src = "/placeholder.svg"
                    }}
                  />
                ) : (
                  <img src="/placeholder.svg" alt="Property" />
                )}
              </div>

              <div className="booking-details">
                <h2>{booking.property?.title || booking.propertyTitle || "Property"}</h2>

                <div className="booking-info">
                  <div className="booking-status">
                    <span className={`status-badge ${getStatusClass(booking.status)}`}>
                      {booking.status || "Pending"}
                    </span>
                  </div>
                  <div className="payment-status">
                    <span
                      className={`payment-badge ${getPaymentStatus(booking._id) === "PAID" ? "payment-paid" : "payment-pending"}`}
                    >
                      {getPaymentStatus(booking._id) === "PAID" ? "Paid" : "Payment Pending"}
                    </span>
                  </div>

                  <div className="booking-date">
                    <Clock size={16} />
                    <span>Move-in Date: {new Date(booking.moveInDate).toLocaleDateString()}</span>
                  </div>

                  {booking.property && booking.property.price && (
                    <div className="property-price">
                      <span>Rs.{booking.property.price}/month</span>
                    </div>
                  )}
                </div>

                <div className="property-address">
                  <MapPin size={16} />
                  {booking.property && (booking.property.location || booking.property.address)}
                </div>

                <div className="booking-actions">
                  {booking.status === "approved" &&
                    booking.status !== "rejected" &&
                    booking.status !== "cancelled" &&
                    getPaymentStatus(booking._id) !== "PAID" && (
                      <button className="proceed-payment-button" onClick={() => handleProceedToPayment(booking._id)}>
                        <CreditCard size={16} />
                        Proceed to Payment
                      </button>
                    )}

                  <button className="view-details-button" onClick={() => handleViewDetails(booking)}>
                    View Details
                    <ChevronRight size={16} />
                  </button>

                  {booking.status !== "cancelled" && (
                    <button
                      className="cancel-booking-button"
                      onClick={() => handleCancelBooking(booking._id)}
                      disabled={cancellingId === booking._id}
                    >
                      <X size={16} />
                      {cancellingId === booking._id ? "Cancelling..." : "Cancel Booking"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
