"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Home, AlertCircle, CheckCircle, Info } from "lucide-react"
import { getPropertyById, submitBookingRequest, getCurrentUserId, isPropertyOwner } from "../services/api"
import "./BookNow.css"

export default function BookNow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [roomDetails, setRoomDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [bookingData, setBookingData] = useState({
    name: "",
    email: "",
    phone: "",
    moveInDate: "",
    leaseDuration: "6",
    familyMembers: 1,
    message: "",
  })

  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        const data = await getPropertyById(id)
        setRoomDetails(data)

        // Check if current user is the owner
        const currentUserId = getCurrentUserId()
        if (currentUserId && data) {
          const ownerCheck = isPropertyOwner(data, currentUserId)
          setIsOwner(ownerCheck)

          if (ownerCheck) {
            setError("You cannot book your own property. Landlords can only book properties listed by other landlords.")
          }
        }
      } catch (error) {
        console.error("Error fetching room details:", error)
        setError("Failed to load property details. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchRoomDetails()
  }, [id])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setBookingData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Check if user is the owner
      if (isOwner) {
        throw new Error(
          "You cannot book your own property. Landlords can only book properties listed by other landlords.",
        )
      }

      // Validate form data
      if (!bookingData.name || !bookingData.email || !bookingData.phone || !bookingData.moveInDate) {
        throw new Error("Please fill in all required fields")
      }

      // Create booking request object
      const bookingRequest = {
        ...bookingData,
        propertyId: id,
        propertyTitle: roomDetails.title,
        landlordId: roomDetails.owner?._id || roomDetails.owner,
        requestDate: new Date().toISOString(),
        status: "pending",
      }

      // Submit booking request
      const response = await submitBookingRequest(bookingRequest)
      console.log("Booking request submitted:", response)

      // Show success message
      setSuccess(true)

      // Reset form after 3 seconds and redirect
      setTimeout(() => {
        navigate(`/room/${id}`, { state: { bookingSuccess: true } })
      }, 3000)
    } catch (error) {
      console.error("Error submitting booking request:", error)
      setError(error.message || "Failed to submit booking request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="book-now-container">
        <div className="loading-spinner">Loading property details...</div>
      </div>
    )
  }

  if (error && !roomDetails) {
    return (
      <div className="book-now-container">
        <div className="error-message">
          <AlertCircle size={24} />
          <p>{error}</p>
          <Link to="/" className="book-now-back-button">
            <Home size={18} />
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!roomDetails) {
    return (
      <div className="book-now-container">
        <div className="error-message">
          <AlertCircle size={24} />
          <p>Error: Room not found</p>
          <Link to="/" className="book-now-back-button">
            <Home size={18} />
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="book-now-container">
      <div className="book-now-card">
        <header className="book-now-header">
          <h1 className="book-now-header-title">Booking for "{roomDetails.title}"</h1>
          <p className="book-now-header-subtitle">Complete your rental request</p>
          <Link to="/" className="book-now-back-button">
            <Home size={18} />
            Back to Home
          </Link>
        </header>
        <main className="book-now-content">
          {isOwner ? (
            <div className="owner-message">
              <Info size={48} color="#f59e0b" />
              <h3>You Own This Property</h3>
              <p>You cannot book your own property.</p>
              <Link to="/properties" className="book-now-back-button">
                View Your Properties
              </Link>
            </div>
          ) : success ? (
            <div className="success-message">
              <CheckCircle size={48} color="#10b981" />
              <h3>Booking Request Submitted!</h3>
              <p>Your booking request has been sent to the landlord. You will be redirected shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="book-now-form">
              <h3 className="book-now-form-title">Booking Details</h3>

              {error && (
                <div className="form-error-message">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="book-now-form-group">
                <label htmlFor="name" className="book-now-label">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={bookingData.name}
                  onChange={handleInputChange}
                  className="book-now-input"
                  placeholder="Enter your full name"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="book-now-form-group">
                <label htmlFor="email" className="book-now-label">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={bookingData.email}
                  onChange={handleInputChange}
                  className="book-now-input"
                  placeholder="Enter your email address"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="book-now-form-group">
                <label htmlFor="phone" className="book-now-label">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={bookingData.phone}
                  onChange={handleInputChange}
                  className="book-now-input"
                  placeholder="Enter your phone number"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="book-now-form-group">
                <label htmlFor="moveInDate" className="book-now-label">
                  Preferred Move-in Date
                </label>
                <input
                  type="date"
                  id="moveInDate"
                  name="moveInDate"
                  value={bookingData.moveInDate}
                  onChange={handleInputChange}
                  className="book-now-input"
                  required
                  disabled={submitting}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              
              <div className="book-now-form-group">
                <label htmlFor="familyMembers" className="book-now-label">
                  Number of Family Members
                </label>
                <input
                  type="number"
                  id="familyMembers"
                  name="familyMembers"
                  value={bookingData.familyMembers}
                  onChange={handleInputChange}
                  className="book-now-input"
                  min="1"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="book-now-form-group">
                <label htmlFor="message" className="book-now-label">
                  Message to Landlord
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={bookingData.message}
                  onChange={handleInputChange}
                  className="book-now-input"
                  rows="3"
                  placeholder="Introduce yourself or ask any questions you have for the landlord."
                  disabled={submitting}
                />
              </div>

              <button type="submit" className="book-now-submit-button" disabled={submitting || isOwner}>
                {submitting ? "Submitting..." : "Submit Booking Request"}
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  )
}

