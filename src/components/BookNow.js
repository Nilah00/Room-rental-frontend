import React, { useState, useEffect } from "react"
import { useParams, useLocation, Link } from "react-router-dom"
import { MapPin, Home } from "lucide-react"
import { getImageUrl, handleImageError } from "./imageUtils"
import "./BookNow.css"

const sampleVideos = [
  { url: "/sample-video1.mp4", description: "Living room tour" },
  { url: "/sample-video2.mp4", description: "Balcony view" },
]

export default function BookNow() {
  const { id } = useParams()
  const location = useLocation()
  const [roomDetails, setRoomDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showVideos, setShowVideos] = useState(false)
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
    const loadRoomDetails = async () => {
      try {
        if (location.state && location.state.roomDetails) {
          setRoomDetails(location.state.roomDetails)
        } else {
          setRoomDetails({
            id: id,
            title: "Sample Room",
            price: 25000,
            furnished: true,
            location: "Sample Location",
            images: ["/placeholder.svg?height=300&width=400"],
            amenities: { parking: true, wifi: true, water: true },
            videos: [],
          })
        }
      } catch (error) {
        console.error("Error fetching room details:", error)
      } finally {
        setLoading(false)
      }
    }

    loadRoomDetails()
  }, [id, location.state])

  const toggleShowVideos = () => {
    setShowVideos((prev) => !prev)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setBookingData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    alert("Booking details submitted successfully!")
    console.log("Booking Details:", bookingData)
  }

  if (loading) {
    return <div className="book-now-container">Loading...</div>
  }

  if (!roomDetails) {
    return <div className="book-now-container">Error loading room details.</div>
  }

  const videosToShow = roomDetails.videos && roomDetails.videos.length > 0 ? roomDetails.videos : sampleVideos

  return (
    <div className="book-now-container">
      <div className="book-now-card">
        <header className="book-now-header">
          <h1 className="book-now-header-title">Request to Rent</h1>
          <p className="book-now-header-subtitle">Complete your rental request for {roomDetails.title}</p>
          <Link to="/" className="book-now-back-button">
            <Home size={18} />
            Back to Home
          </Link>
        </header>
        <main className="book-now-content">
          <section className="book-now-room-details">
            <div>
              <img
                src={getImageUrl(roomDetails.images[0]) || "/placeholder.svg"}
                alt={roomDetails.title}
                className="book-now-room-image"
                onError={handleImageError}
              />
            </div>
            <div className="book-now-room-info">
              <h2 className="book-now-room-title">{roomDetails.title}</h2>
              <p className="book-now-room-price">Rs {roomDetails.price.toLocaleString()}/month</p>
              <p className="book-now-room-status">{roomDetails.furnished ? "Furnished" : "Unfurnished"}</p>
              {roomDetails.location && (
                <div className="book-now-location-info">
                  <MapPin size={20} />
                  <span className="book-now-location-text">{roomDetails.location}</span>
                </div>
              )}
            </div>
          </section>

          <div className="book-now-amenities">
            <h3>Amenities</h3>
            <div className="amenities-list">
              {roomDetails.amenities.parking && <div className="amenity">🅿️ Parking</div>}
              {roomDetails.amenities.wifi && <div className="amenity">📶 WiFi</div>}
              {roomDetails.amenities.water && <div className="amenity">💧 Water</div>}
            </div>
          </div>

          <section className="book-now-videos">
            <h3 className="book-now-videos-title">Room Videos</h3>
            <button onClick={toggleShowVideos} className="book-now-button">
              {showVideos ? "Hide Videos" : "Show Videos"}
            </button>
            {showVideos && (
              <div className="book-now-video-container">
                {videosToShow.map((video, index) => (
                  <div key={index} className="book-now-video-item">
                    <video controls>
                      <source src={video.url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <p className="book-now-video-description">{video.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <form onSubmit={handleSubmit} className="book-now-form">
            <h3 className="book-now-form-title">Booking Details Form</h3>

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
              />
            </div>

            <div className="book-now-form-group">
              <label htmlFor="leaseDuration" className="book-now-label">
                Lease Duration (in months)
              </label>
              <select
                id="leaseDuration"
                name="leaseDuration"
                value={bookingData.leaseDuration}
                onChange={handleInputChange}
                className="book-now-input"
              >
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </select>
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
                require
                d
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
              />
            </div>

            <button type="submit" className="book-now-submit-button">
              Submit Booking Request
            </button>
          </form>
        </main>
      </div>
    </div>
  )
}
