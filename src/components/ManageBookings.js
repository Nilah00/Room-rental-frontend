"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Home, Check, X, Clock, AlertCircle, MessageCircle, ChevronDown, ChevronUp, Trash2 } from "lucide-react"
import { getLandlordBookingRequests, updateBookingStatus } from "../services/api"
import "./ManageBookings.css"

export default function ManageBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedBooking, setExpandedBooking] = useState(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [processingBookingId, setProcessingBookingId] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearingBookings, setClearingBookings] = useState(false)

  useEffect(() => {
    fetchBookings()

    // Listen for real-time booking updates
    const handleBookingUpdate = (event) => {
      const updatedBooking = event.detail
      setBookings((prevBookings) =>
        prevBookings.map((booking) => (booking._id === updatedBooking._id ? updatedBooking : booking)),
      )
    }

    window.addEventListener("bookingUpdate", handleBookingUpdate)

    return () => {
      window.removeEventListener("bookingUpdate", handleBookingUpdate)
    }
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const data = await getLandlordBookingRequests()
      console.log("Fetched bookings:", data)
      setBookings(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error fetching bookings:", err)
      setError("Failed to load booking requests. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleExpandBooking = (bookingId) => {
    setExpandedBooking(expandedBooking === bookingId ? null : bookingId)
    setResponseMessage("")
  }

  const handleResponseChange = (e) => {
    setResponseMessage(e.target.value)
  }

  const handleUpdateStatus = async (bookingId, status) => {
    try {
      setProcessingBookingId(bookingId)

      // Debug log to check what's being sent
      console.log("Sending status update:", {
        bookingId,
        statusData: {
          status,
          responseMessage,
        },
      })

      // When a booking is approved, the property status will be automatically
      // updated to "Booked" on the server side
      const response = await updateBookingStatus(bookingId, {
        status,
        responseMessage,
      })

      console.log("Update booking status response:", response)

      // Update local state
      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking._id === bookingId
            ? { ...booking, status, responseMessage, responseDate: new Date().toISOString() }
            : booking,
        ),
      )

      // Reset form
      setResponseMessage("")
      setExpandedBooking(null)
    } catch (err) {
      console.error("Error updating booking status:", err)
      alert("Failed to update booking status. Please try again.")
    } finally {
      setProcessingBookingId(null)
    }
  }

  // Client-side only implementation of clear all
  const handleClearAllBookings = () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true)
      return
    }

    try {
      setClearingBookings(true)

      // Just clear the bookings in the UI without making an API call
      setBookings([])
      setShowClearConfirm(false)

      // Store a flag in localStorage to remember that bookings were cleared
      localStorage.setItem("bookings_cleared", "true")
      localStorage.setItem("bookings_cleared_at", new Date().toISOString())

      alert("All booking requests have been cleared from view.")
    } catch (err) {
      console.error("Error clearing bookings:", err)
      setError("Failed to clear booking view. Please try again.")
    } finally {
      setClearingBookings(false)
      setShowClearConfirm(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "status-pending"
      case "approved":
        return "status-approved"
      case "rejected":
        return "status-rejected"
      case "cancelled":
        return "status-cancelled"
      default:
        return ""
    }
  }

  if (loading) {
    return (
      <div className="manage-bookings-container">
        <div className="loading-spinner">Loading booking requests...</div>
      </div>
    )
  }

  return (
    <div className="manage-bookings-container">
      <header className="manage-bookings-header">
        <h1>Manage Booking Requests</h1>
        <div className="header-actions">
          {bookings.length > 0 && (
            <button className="clear-all-button" onClick={handleClearAllBookings} disabled={clearingBookings}>
              {clearingBookings ? (
                "Processing..."
              ) : showClearConfirm ? (
                "Confirm Clear All"
              ) : (
                <>
                  <Trash2 size={16} />
                  Clear All
                </>
              )}
            </button>
          )}
          <Link to="/" className="back-home-button">
            <Home size={18} />
            Back to Home
          </Link>
        </div>
      </header>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={fetchBookings} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="no-bookings-message">
          <Clock size={48} />
          <h3>No Booking Requests</h3>
          <p>
            You don't have any booking requests yet. When tenants request to book your properties, they will appear
            here.
          </p>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => (
            <div key={booking._id} className={`booking-card ${expandedBooking === booking._id ? "expanded" : ""}`}>
              <div className="booking-header" onClick={() => handleExpandBooking(booking._id)}>
                <div className="booking-title">
                  <h3>{booking.propertyTitle}</h3>
                  <span className={`status-badge ${getStatusBadgeClass(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
                <div className="booking-meta">
                  <span className="booking-date">Requested on {formatDate(booking.requestDate)}</span>
                  {booking.status !== "pending" && booking.responseDate && (
                    <span className="response-date">Responded on {formatDate(booking.responseDate)}</span>
                  )}
                  {expandedBooking === booking._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {expandedBooking === booking._id && (
                <div className="booking-details">
                  <div className="tenant-info">
                    <h4>Tenant Information</h4>
                    <p>
                      <strong>Name:</strong> {booking.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {booking.email}
                    </p>
                    <p>
                      <strong>Phone:</strong> {booking.phone}
                    </p>
                    <p>
                      <strong>Move-in Date:</strong> {formatDate(booking.moveInDate)}
                    </p>
                    <p>
                      <strong>Lease Duration:</strong> {booking.leaseDuration} months
                    </p>
                    <p>
                      <strong>Family Members:</strong> {booking.familyMembers}
                    </p>
                    {booking.message && (
                      <div className="tenant-message">
                        <h4>Message from Tenant</h4>
                        <p>{booking.message}</p>
                      </div>
                    )}
                  </div>

                  {booking.status === "pending" && (
                    <div className="booking-actions">
                      <h4>Respond to Request</h4>
                      <div className="response-form">
                        <textarea
                          placeholder="Optional: Add a message to the tenant..."
                          value={responseMessage}
                          onChange={handleResponseChange}
                          className="response-textarea"
                        ></textarea>
                        <div className="action-buttons">
                          <button
                            className="approve-button"
                            onClick={() => handleUpdateStatus(booking._id, "approved")}
                            disabled={processingBookingId === booking._id}
                          >
                            <Check size={16} />
                            {processingBookingId === booking._id ? "Processing..." : "Approve Request"}
                          </button>
                          <button
                            className="reject-button"
                            onClick={() => handleUpdateStatus(booking._id, "rejected")}
                            disabled={processingBookingId === booking._id}
                          >
                            <X size={16} />
                            {processingBookingId === booking._id ? "Processing..." : "Reject Request"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {booking.status !== "pending" && booking.responseMessage && (
                    <div className="response-info">
                      <h4>Your Response</h4>
                      <p>{booking.responseMessage}</p>
                    </div>
                  )}

                  <div className="contact-tenant">
                    <button className="contact-button">
                      <MessageCircle size={16} />
                      Contact Tenant
                    </button>
                    <Link to={`/room/${booking.propertyId}`} className="view-property-link">
                      View Property
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

