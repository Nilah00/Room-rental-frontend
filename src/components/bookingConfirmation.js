"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link, useLocation } from "react-router-dom"
import {
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  X,
  ArrowLeft,
  ArrowRight,
  Home,
  RefreshCw,
  ImageIcon,
  Info,
} from "lucide-react"
import { getPropertyById } from "../services/api"
import "./BookingConfirmation.css"
import { getImageUrl, handleImageError } from "./imageUtils"

export default function BookingConfirmation() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [booking, setBooking] = useState(null)
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState("pending")
  const [imageError, setImageError] = useState(false)

  // Check if we have property data from the location state
  const propertyFromState = location.state?.property || location.state?.roomDetails

  // This function creates a mock booking when we don't have real data
  const createMockBooking = (bookingId, propertyData) => {
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

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setLoading(true)
        console.log("Fetching booking details for ID:", bookingId)

        // APPROACH 1: Use property data from location state (highest priority)
        if (propertyFromState) {
          console.log("Using property data from location state:", propertyFromState)
          setProperty(propertyFromState)

          // Create a mock booking if we don't have one
          const mockBooking = createMockBooking(bookingId, propertyFromState)
          setBooking(mockBooking)

          // Save to localStorage for future reference
          localStorage.setItem(`booking_${bookingId}`, JSON.stringify(mockBooking))

          // Check payment status
          const paymentData = localStorage.getItem(`payment_${bookingId}`)
          if (paymentData) {
            const payment = JSON.parse(paymentData)
            setPaymentStatus(payment.status || "pending")
          }

          setLoading(false)
          return
        }

        // APPROACH 2: Try to get booking from localStorage
        const bookingData = localStorage.getItem(`booking_${bookingId}`)
        if (bookingData) {
          const bookingDetails = JSON.parse(bookingData)
          console.log("Booking data from localStorage:", bookingDetails)
          setBooking(bookingDetails)

          // If we have property ID but no property details yet, fetch them
          if (bookingDetails?.propertyId && !property) {
            try {
              const propertyDetails = await getPropertyById(bookingDetails.propertyId)
              setProperty(propertyDetails)
            } catch (propertyError) {
              console.error("Error fetching property details:", propertyError)
              // If we already have property data in the booking, use that
              if (bookingDetails.property) {
                setProperty(bookingDetails.property)
              }
            }
          } else if (bookingDetails?.property) {
            // If booking has property data embedded, use it
            setProperty(bookingDetails.property)
          }

          // Check payment status
          const paymentData = localStorage.getItem(`payment_${bookingId}`)
          if (paymentData) {
            const payment = JSON.parse(paymentData)
            setPaymentStatus(payment.status || "pending")
          }

          setLoading(false)
          return
        }

        // APPROACH 3: Try to get data from URL params
        const urlParams = new URLSearchParams(window.location.search)
        const propertyId = urlParams.get("propertyId")

        if (propertyId) {
          console.log("Using URL params as fallback with propertyId:", propertyId)
          try {
            // Fetch property details
            const propertyDetails = await getPropertyById(propertyId)
            setProperty(propertyDetails)

            // Create a minimal booking object
            const bookingDetails = createMockBooking(bookingId, propertyDetails)

            // Save to localStorage for future reference
            localStorage.setItem(`booking_${bookingId}`, JSON.stringify(bookingDetails))
            setBooking(bookingDetails)
          } catch (propertyError) {
            console.error("Error fetching property details:", propertyError)
            throw new Error("Failed to fetch property details")
          }
        } else {
          // APPROACH 4: Last resort - check if we have any properties in localStorage
          try {
            const storedPropertiesJson = localStorage.getItem("properties")
            if (storedPropertiesJson) {
              const storedProperties = JSON.parse(storedPropertiesJson)
              if (Array.isArray(storedProperties) && storedProperties.length > 0) {
                console.log("Using first property from localStorage as fallback")
                const fallbackProperty = storedProperties[0]
                setProperty(fallbackProperty)

                // Create a mock booking
                const mockBooking = createMockBooking(bookingId, fallbackProperty)
                setBooking(mockBooking)

                // Save to localStorage
                localStorage.setItem(`booking_${bookingId}`, JSON.stringify(mockBooking))
                return
              }
            }
          } catch (fallbackError) {
            console.error("Error with localStorage fallback:", fallbackError)
          }

          throw new Error("Booking details not found and no propertyId provided")
        }
      } catch (err) {
        console.error("Error fetching booking details:", err)
        setError("Failed to load booking details. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchBookingDetails()
  }, [bookingId, propertyFromState])

  const handleCancelBooking = async () => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      setCancelling(true)
      try {
        // Instead of calling the API directly, just update localStorage
        const bookingData = localStorage.getItem(`booking_${bookingId}`)
        if (bookingData) {
          const bookingDetails = JSON.parse(bookingData)
          bookingDetails.status = "cancelled"
          localStorage.setItem(`booking_${bookingId}`, JSON.stringify(bookingDetails))
        }

        navigate("/bookings", { state: { cancelSuccess: true } })
      } catch (err) {
        console.error("Error cancelling booking:", err)
        setError("Failed to cancel booking. Please try again.")
        setCancelling(false)
      }
    }
  }

  const handleProceedToPayment = () => {
    // Pass the property data to the payment page
    navigate(`/payment/${bookingId}`, {
      state: {
        property: property,
        roomDetails: property, // For backward compatibility
      },
    })
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    // Force reload the current page
    window.location.reload()
  }

  const handleBackToHome = () => {
    navigate("/")
  }

  // Function to get property image with proper fallback
  const getPropertyImage = () => {
    if (!property) return "/placeholder.svg?height=300&width=400"

    // Check if property has images array
    if (property.images && Array.isArray(property.images) && property.images.length > 0) {
      // Find first non-empty image
      for (const img of property.images) {
        if (img) return getImageUrl(img)
      }
    }

    // If we have a single image property
    if (property.image) {
      return getImageUrl(property.image)
    }

    // Fallback to placeholder
    return "/placeholder.svg?height=300&width=400"
  }

  if (loading) {
    return (
      <div className="booking-confirmation-container">
        <div className="loading-spinner">Loading booking details...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="booking-confirmation-container">
        <div className="error-message">
          <AlertCircle size={24} />
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={handleRetry} className="retry-button">
              <RefreshCw size={16} /> Retry
            </button>
            <button onClick={handleBackToHome} className="back-button">
              <ArrowLeft size={18} />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!booking || !property) {
    return (
      <div className="booking-confirmation-container">
        <div className="error-message">
          <AlertCircle size={24} />
          <p>Booking or property details not found</p>
          <button onClick={handleBackToHome} className="back-button">
            <ArrowLeft size={18} />
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  // Calculate payment deadline (24 hours from now)
  const paymentDeadline = new Date(booking.updatedAt || booking.createdAt)
  paymentDeadline.setHours(paymentDeadline.getHours() + 24)
  const now = new Date()
  const hoursRemaining = Math.max(0, Math.floor((paymentDeadline - now) / (1000 * 60 * 60)))
  const minutesRemaining = Math.max(0, Math.floor(((paymentDeadline - now) % (1000 * 60 * 60)) / (1000 * 60)))

  return (
    <div className="booking-confirmation-container">
      <div className="booking-confirmation-card">
        <header className="booking-confirmation-header">
          <h1 className="booking-confirmation-title">Booking Confirmed!</h1>
          <Link to="/" className="booking-confirmation-home-button">
            <Home size={18} />
            Home
          </Link>
        </header>

        <div className="booking-confirmation-content">
          <div className="booking-confirmation-status">
            <CheckCircle size={48} className="confirmation-icon" />
            <h2>Your booking has been approved!</h2>
            <p>Congratulations! Your booking request for this property has been approved by the landlord.</p>
          </div>

          <div className="booking-confirmation-property">
            <h3>Property Details</h3>
            <div className="property-info">
              {imageError ? (
                <div className="property-thumbnail-fallback">
                  <ImageIcon size={40} />
                </div>
              ) : (
                <img
                  src={getPropertyImage() || "/placeholder.svg"}
                  alt={property.title || "Property"}
                  className="property-thumbnail"
                  onError={(e) => {
                    handleImageError(e)
                    setImageError(true)
                  }}
                />
              )}
              <div className="property-details">
                <h4>{property.title || "Property"}</h4>
                <p className="property-address">{property.location || property.address || "Location not specified"}</p>
                <p className="property-price">Rs.{property.price?.toLocaleString() || "N/A"}/month</p>
              </div>
            </div>
          </div>

          {paymentStatus === "COMPLETE" ? (
            <div className="booking-confirmation-payment-complete">
              <div className="payment-success">
                <CheckCircle size={24} />
                <div>
                  <h3>Payment Completed</h3>
                  <p>Your payment has been successfully processed. Thank you!</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="booking-confirmation-payment-notice">
                <div className="payment-deadline">
                  <Clock size={24} />
                  <div>
                    <h3>Payment Required Within 24 Hours</h3>
                    <p>
                      Time remaining:{" "}
                      <strong>
                        {hoursRemaining}h {minutesRemaining}m
                      </strong>
                    </p>
                  </div>
                </div>
                <div className="payment-warning">
                  <AlertCircle size={24} />
                  <p>
                    <strong>Important:</strong> Your booking will be automatically cancelled if payment is not completed
                    within the deadline.
                  </p>
                </div>
              </div>

              <div className="payment-info-box">
                <div className="payment-info-header">
                  <Info size={20} />
                  <h3>Payment Information</h3>
                </div>
                <p>
                  You can choose to pay up to 50% of the property price (Rs.{" "}
                  {Math.round(property.price * 0.5).toLocaleString()}) as a deposit or any desired amount within this
                  limit.
                </p>
                <p className="refund-policy">
                  <strong>Refund Policy:</strong> If you cancel your booking after making a payment, only 50% of your
                  payment amount will be refundable.
                </p>
              </div>
            </>
          )}

          <div className="booking-confirmation-actions">
            {paymentStatus !== "COMPLETE" && (
              <button className="proceed-payment-button" onClick={handleProceedToPayment}>
                <CreditCard size={18} />
                Proceed to Payment
              </button>
            )}

            <button className="cancel-booking-button" onClick={handleCancelBooking} disabled={cancelling}>
              <X size={18} />
              {cancelling ? "Cancelling..." : "Cancel Booking"}
            </button>
          </div>

          <div className="booking-confirmation-footer">
            <p>
              Have questions about your booking? Feel free to contact us or message the landlord directly through the
              chat.
            </p>
            <Link to="/bookings" className="back-to-bookings">
              <ArrowRight size={18} />
              Go to My Bookings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
