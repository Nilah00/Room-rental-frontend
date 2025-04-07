"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { CheckCircle, Clock, AlertCircle, CreditCard, X, ArrowLeft, ArrowRight, Home } from "lucide-react"
import { getPropertyById, cancelBooking } from "../services/api"
import "./BookingConfirmation.css"
import { getImageUrl, handleImageError } from "./imageUtils"

export default function BookingConfirmation() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        // In a real implementation, you would fetch the booking details from your API
        // For now, we'll use the booking data from localStorage or URL params
        const bookingData = localStorage.getItem(`booking_${bookingId}`)
        let bookingDetails = null

        if (bookingData) {
          bookingDetails = JSON.parse(bookingData)
        } else {
          // If no booking data in localStorage, we could fetch it from the API
          // For now, we'll use URL search params as a fallback
          const urlParams = new URLSearchParams(window.location.search)
          const propertyId = urlParams.get("propertyId")

          if (propertyId) {
            // Fetch property details
            const propertyDetails = await getPropertyById(propertyId)
            setProperty(propertyDetails)

            // Create a minimal booking object
            bookingDetails = {
              _id: bookingId,
              propertyId: propertyId,
              status: "approved",
              moveInDate: urlParams.get("moveInDate") || new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          } else {
            throw new Error("Booking details not found")
          }
        }

        setBooking(bookingDetails)

        // If we have property ID but no property details yet, fetch them
        if (bookingDetails?.propertyId && !property) {
          const propertyDetails = await getPropertyById(bookingDetails.propertyId)
          setProperty(propertyDetails)
        }
      } catch (err) {
        console.error("Error fetching booking details:", err)
        setError("Failed to load booking details. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchBookingDetails()
  }, [bookingId])

  const handleCancelBooking = async () => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      setCancelling(true)
      try {
        await cancelBooking(bookingId)
        navigate("/bookings", { state: { cancelSuccess: true } })
      } catch (err) {
        console.error("Error cancelling booking:", err)
        setError("Failed to cancel booking. Please try again.")
        setCancelling(false)
      }
    }
  }

  const handleViewDetails = () => {
    navigate(`/bookings/${bookingId}`)
  }

  const handleProceedToPayment = () => {
    navigate(`/payment/${bookingId}`)
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
          <Link to="/bookings" className="booking-confirmation-back-button">
            <ArrowLeft size={18} />
            Back to Bookings
          </Link>
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
          <Link to="/bookings" className="booking-confirmation-back-button">
            <ArrowLeft size={18} />
            Back to Bookings
          </Link>
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
              <img
                src={getImageUrl(property.images && property.images.length > 0 ? property.images[0] : null)}
                alt={property.title}
                className="property-thumbnail"
                onError={handleImageError}
              />
              <div className="property-details">
                <h4>{property.title}</h4>
                <p className="property-address">{property.location || property.address}</p>
                <p className="property-price">Rs.{property.price}/month</p>
              </div>
            </div>
          </div>

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

          <div className="booking-confirmation-actions">
            <button className="proceed-payment-button" onClick={handleProceedToPayment}>
              <CreditCard size={18} />
              Proceed to Payment
            </button>
            
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

