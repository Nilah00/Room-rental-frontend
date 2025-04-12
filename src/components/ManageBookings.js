"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Home, Check, X, Clock, AlertCircle, MessageCircle, ChevronDown, ChevronUp, Trash2 } from "lucide-react"
import { getLandlordBookingRequests, updateBookingStatus, getChatByIdOrCreate, getCurrentUserId } from "../services/api"
import "./ManageBookings.css"
import ChatBox from "./ChatBox"

export default function ManageBookings() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedBooking, setExpandedBooking] = useState(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [processingBookingId, setProcessingBookingId] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearingBookings, setClearingBookings] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [currentTenant, setCurrentTenant] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [deletedBookingIds, setDeletedBookingIds] = useState([])
  const [chatId, setChatId] = useState(null)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)

  // Get current user ID on component mount
  useEffect(() => {
    const userId = getCurrentUserId()
    console.log("Current user ID:", userId)
    setCurrentUserId(userId)
  }, [])

  // Load deleted booking IDs from localStorage
  const loadDeletedBookings = () => {
    try {
      const storedDeletedBookings = localStorage.getItem("deletedBookings")
      if (storedDeletedBookings) {
        const parsedIds = JSON.parse(storedDeletedBookings)
        console.log("Loaded deleted booking IDs from localStorage:", parsedIds)
        setDeletedBookingIds(parsedIds)
        return parsedIds
      }
      return []
    } catch (error) {
      console.error("Error loading deleted bookings from localStorage:", error)
      return []
    }
  }

  // Save deleted booking IDs to localStorage
  const saveDeletedBookings = (ids) => {
    try {
      localStorage.setItem("deletedBookings", JSON.stringify(ids))
      console.log("Saved deleted booking IDs to localStorage:", ids)
    } catch (error) {
      console.error("Error saving deleted bookings to localStorage:", error)
    }
  }

  useEffect(() => {
    const deletedIds = loadDeletedBookings()
    console.log("Initial load of deleted booking IDs:", deletedIds)
    fetchBookings(deletedIds)

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

  const fetchBookings = async (deletedIds = null) => {
    try {
      setLoading(true)
      const data = await getLandlordBookingRequests()
      console.log("Fetched bookings:", data)

      // If deletedIds wasn't passed, get them from state or localStorage
      const idsToFilter = deletedIds || deletedBookingIds || loadDeletedBookings()
      console.log("Filtering out these booking IDs:", idsToFilter)

      // Filter out any bookings that were previously deleted
      let bookingsToShow = Array.isArray(data) ? data : []

      if (idsToFilter && idsToFilter.length > 0) {
        bookingsToShow = bookingsToShow.filter((booking) => {
          const bookingId = booking._id || booking.id
          const shouldKeep = !idsToFilter.includes(bookingId)
          if (!shouldKeep) {
            console.log(`Filtering out deleted booking: ${bookingId}`)
          }
          return shouldKeep
        })
        console.log(`Filtered out ${data.length - bookingsToShow.length} deleted bookings`)
      }

      setBookings(bookingsToShow)
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

      // Get all booking IDs to mark as deleted
      const allBookingIds = bookings.map((booking) => booking._id || booking.id)
      console.log("Clearing all bookings with IDs:", allBookingIds)

      if (allBookingIds.length === 0) {
        console.log("No bookings to clear")
        setClearingBookings(false)
        setShowClearConfirm(false)
        return
      }

      // Get existing deleted IDs and add new ones
      const existingDeletedIds = loadDeletedBookings()
      const updatedDeletedIds = [...new Set([...existingDeletedIds, ...allBookingIds])]

      // Save to localStorage
      saveDeletedBookings(updatedDeletedIds)

      // Update state
      setDeletedBookingIds(updatedDeletedIds)

      // Clear bookings from UI
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

  // Handle deleting individual booking
  const handleDeleteBooking = (bookingId) => {
    if (showDeleteConfirm !== bookingId) {
      setShowDeleteConfirm(bookingId)
      return
    }

    try {
      console.log(`Deleting booking with ID: ${bookingId}`)

      // Get existing deleted IDs and add the new one
      const existingDeletedIds = loadDeletedBookings()
      const updatedDeletedIds = [...existingDeletedIds, bookingId]

      // Save to localStorage
      saveDeletedBookings(updatedDeletedIds)

      // Update state
      setDeletedBookingIds(updatedDeletedIds)

      // Remove the booking from the UI
      setBookings((prevBookings) => prevBookings.filter((booking) => (booking._id || booking.id) !== bookingId))
      setShowDeleteConfirm(null)

      console.log(`Booking ${bookingId} removed from view and stored in localStorage`)
    } catch (err) {
      console.error("Error deleting booking:", err)
      alert("Failed to delete booking. Please try again.")
    }
  }

  // Handle cancelling a booking
  const handleCancelBooking = async (bookingId) => {
    try {
      await handleUpdateStatus(bookingId, "cancelled")
      alert("Booking has been cancelled successfully.")
    } catch (err) {
      console.error("Error cancelling booking:", err)
      alert("Failed to cancel booking. Please try again.")
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
        return "mb-status-pending"
      case "approved":
        return "mb-status-approved"
      case "rejected":
        return "mb-status-rejected"
      case "cancelled":
        return "mb-status-cancelled"
      default:
        return ""
    }
  }

  // Update the handleContactTenant function to close the expanded booking details first
  const handleContactTenant = async (booking) => {
    try {
      console.log("Contact tenant clicked for booking:", booking)

      // Close the expanded booking details first
      setExpandedBooking(null)

      // Store the selected booking
      setSelectedBooking(booking)

      // Get tenant ID from booking
      const tenantId = booking.userId || booking.tenantId

      if (!tenantId) {
        console.error("No tenant ID found in booking:", booking)
        alert("Could not identify tenant. Please try again.")
        return
      }

      // Get property ID from booking
      const propertyId = booking.propertyId

      if (!propertyId) {
        console.error("No property ID found in booking:", booking)
        alert("Could not identify property. Please try again.")
        return
      }

      // Set tenant name for display
      setCurrentTenant(booking.name || "Tenant")

      // Try to get or create a chat
      console.log("Getting or creating chat for property:", propertyId, "and tenant:", tenantId)

      try {
        const chatData = await getChatByIdOrCreate(propertyId, tenantId, booking.propertyTitle || "Property Chat")

        console.log("Chat data received:", chatData)

        // Store chat ID
        if (chatData && chatData._id) {
          setChatId(chatData._id)
          console.log("Chat ID set to:", chatData._id)
        } else {
          console.error("No chat ID received from API")
          setChatId(null)
        }

        // Show chat
        setShowChat(true)
      } catch (chatError) {
        console.error("Error getting/creating chat:", chatError)
        setChatId(null)
        setShowChat(true)
      }
    } catch (error) {
      console.error("Error in handleContactTenant:", error)
      alert("Failed to open chat. Please try again.")
    }
  }

  const handleCloseChat = () => {
    setShowChat(false)
    setCurrentTenant(null)
    setChatId(null)
    setSelectedBooking(null)
  }

  const handleViewProperty = (propertyId) => {
    if (!propertyId) {
      console.error("Property ID is undefined or null")
      return
    }

    // Extract the ID string if propertyId is an object
    let idToUse = propertyId

    if (typeof propertyId === "object" && propertyId !== null) {
      console.log("Property ID is an object:", propertyId)

      // Try to extract the ID from common ID fields
      if (propertyId._id) {
        idToUse = propertyId._id
      } else if (propertyId.id) {
        idToUse = propertyId.id
      } else {
        console.error("Could not extract ID from property object:", propertyId)
        return
      }
    }

    console.log("Navigating to property with ID:", idToUse)
    navigate(`/room/${idToUse}`)
  }

  // Check if booking can be approved/rejected (pending or cancelled)
  const canApproveOrReject = (status) => {
    return status === "pending" || status === "cancelled"
  }

  if (loading) {
    return (
      <div className="mb-container">
        <div className="mb-loading">Loading booking requests...</div>
      </div>
    )
  }

  return (
    <div className="mb-container">
      <header className="mb-header">
        <h1>Manage Booking Requests</h1>
        <div className="mb-header-actions">
          {bookings.length > 0 && (
            <button className="mb-clear-button" onClick={handleClearAllBookings} disabled={clearingBookings}>
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
          <Link to="/" className="mb-back-button">
            <Home size={18} />
            Back to Home
          </Link>
        </div>
      </header>

      {error && (
        <div className="mb-error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => fetchBookings()} className="mb-retry-button">
            Retry
          </button>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="mb-no-bookings">
          <Clock size={48} />
          <h3>No Booking Requests</h3>
          <p>
            You don't have any booking requests yet. When tenants request to book your properties, they will appear
            here.
          </p>
        </div>
      ) : (
        <div className="mb-bookings-list">
          {bookings.map((booking) => (
            <div
              key={booking._id || booking.id}
              className={`mb-card ${expandedBooking === (booking._id || booking.id) ? "expanded" : ""}`}
            >
              <div className="mb-card-header" onClick={() => handleExpandBooking(booking._id || booking.id)}>
                <div className="mb-card-title">
                  <h3>{booking.propertyTitle}</h3>
                  <span className={`mb-status-badge ${getStatusBadgeClass(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
                <div className="mb-card-meta">
                  <span className="mb-booking-date">Requested on {formatDate(booking.requestDate)}</span>
                  {booking.status !== "pending" && booking.responseDate && (
                    <span className="mb-response-date">Responded on {formatDate(booking.responseDate)}</span>
                  )}
                  <div className="mb-actions-compact">
                    <button
                      className="mb-delete-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteBooking(booking._id || booking.id)
                      }}
                      title="Delete booking"
                    >
                      {showDeleteConfirm === (booking._id || booking.id) ? "Confirm" : <Trash2 size={16} />}
                    </button>
                  </div>
                  {expandedBooking === (booking._id || booking.id) ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </div>

              {expandedBooking === (booking._id || booking.id) && (
                <div className="mb-card-details">
                  <div className="mb-tenant-info">
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
                      <strong>Family Members:</strong> {booking.familyMembers}
                    </p>
                    {booking.message && (
                      <div className="mb-tenant-message">
                        <h4>Message from Tenant</h4>
                        <p>{booking.message}</p>
                      </div>
                    )}
                  </div>

                  {/* Show approve/reject buttons for both pending and cancelled bookings */}
                  {canApproveOrReject(booking.status) && (
                    <div className="mb-actions">
                      <div className="mb-action-buttons">
                        <button
                          className="mb-approve-button"
                          onClick={() => handleUpdateStatus(booking._id || booking.id, "approved")}
                          disabled={processingBookingId === (booking._id || booking.id)}
                        >
                          <Check size={16} />
                          {processingBookingId === (booking._id || booking.id) ? "Processing..." : "Approve"}
                        </button>
                        <button
                          className="mb-reject-button"
                          onClick={() => handleUpdateStatus(booking._id || booking.id, "rejected")}
                          disabled={processingBookingId === (booking._id || booking.id)}
                        >
                          <X size={16} />
                          {processingBookingId === (booking._id || booking.id) ? "Processing..." : "Reject"}
                        </button>
                      </div>
                      <div className="mb-response-field">
                        <label htmlFor="responseMessage">Response Message (optional):</label>
                        <textarea
                          id="responseMessage"
                          className="mb-textarea"
                          value={responseMessage}
                          onChange={handleResponseChange}
                          placeholder="Add a message to the tenant..."
                          rows={3}
                        ></textarea>
                      </div>
                    </div>
                  )}

                  {booking.status === "approved" && (
                    <div className="mb-actions">
                      <button
                        className="mb-cancel-button"
                        onClick={() => handleCancelBooking(booking._id || booking.id)}
                        disabled={processingBookingId === (booking._id || booking.id)}
                      >
                        <X size={16} />
                        {processingBookingId === (booking._id || booking.id) ? "Processing..." : "Cancel Booking"}
                      </button>
                    </div>
                  )}

                  {booking.status !== "pending" && booking.responseMessage && (
                    <div className="mb-response-info">
                      <h4>Your Response</h4>
                      <p>{booking.responseMessage}</p>
                    </div>
                  )}

                  <div className="mb-contact-tenant">
                    <button className="mb-contact-button" onClick={() => handleContactTenant(booking)}>
                      <MessageCircle size={16} />
                      Contact Tenant
                    </button>
                    <button
                      onClick={() => handleViewProperty(booking.propertyId)}
                      className="mb-view-button"
                      title="View property"
                    >
                      View Property
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showChat && selectedBooking && (
        <div className="mb-chat-overlay">
          
            <ChatBox
              onClose={handleCloseChat}
              landlordName={currentTenant || "Tenant"}
              landlordId={selectedBooking.userId || selectedBooking.tenantId}
              propertyId={selectedBooking.propertyId}
              propertyTitle={selectedBooking.propertyTitle || "Property"}
              isLoggedIn={true}
              currentUserId={currentUserId}
              chatId={chatId}
            />
          </div>
      
      )}
    </div>
  )
}
