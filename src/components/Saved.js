"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Heart,
  Bell,
  MessageCircle,
  User,
  Home,
  Car,
  Wifi,
  Droplet,
  Bed,
  Bath,
  Snowflake,
  Eye,
  Badge,
} from "lucide-react"
import ChatBox from "./ChatBox"
import { getImageUrl, handleImageError } from "./imageUtils"
import "./Saved.css"

const Saved = () => {
  const [savedListings, setSavedListings] = useState([])
  const [showChat, setShowChat] = useState(false)
  const [currentLandlord, setCurrentLandlord] = useState("")
  const [currentLandlordId, setCurrentLandlordId] = useState("") // Add state for landlord ID
  const [currentPropertyId, setCurrentPropertyId] = useState("") // Add state for property ID
  const [currentPropertyTitle, setCurrentPropertyTitle] = useState("") // Add state for property title
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [username, setUsername] = useState("")
  const [currentUserId, setCurrentUserId] = useState("") // Add state for current user ID
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("token")
    const storedUser = JSON.parse(localStorage.getItem("user"))
    if (token && storedUser) {
      setIsLoggedIn(true)
      setUsername(storedUser.name)
      // Store the current user ID
      setCurrentUserId(storedUser.id || storedUser._id)
      const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || []
      setSavedListings(storedFavorites)
    } else {
      setIsLoggedIn(false)
      navigate("/login")
    }
  }, [navigate])

  const removeFavorite = (listingId) => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }
    setSavedListings((prev) => {
      const newListings = prev.filter((listing) => (listing.id || listing._id) !== listingId)
      localStorage.setItem("favorites", JSON.stringify(newListings))
      return newListings
    })
  }

  const handleBookNow = (listing) => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }
    navigate(`/booknow/${listing.id || listing._id}`, { state: { roomDetails: listing } })
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setIsLoggedIn(false)
    navigate("/")
  }

  // Updated function to handle chat with landlord
  const handleChatWithLandlord = (listing) => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }

    // Check if current user is the landlord
    const landlordId = listing.owner?.id || listing.owner?._id || listing.landlordId
    if (currentUserId === landlordId) {
      // Use regular alert since ErrorModal is not available
      alert("You cannot chat with yourself as this is your own property.")
      return
    }

    // Validate required parameters
    if (!landlordId) {
      console.error("Missing landlordId in handleChatWithLandlord")
      alert("Cannot start chat: Missing landlord information")
      return
    }

    const propertyId = listing.id || listing._id
    if (!propertyId) {
      console.error("Missing propertyId in handleChatWithLandlord")
      alert("Cannot start chat: Missing property information")
      return
    }

    console.log("Starting chat with:", {
      landlordName: listing.owner?.name || "Landlord",
      landlordId,
      propertyId,
      propertyTitle: listing.title,
    })

    // Set all the necessary state variables
    setCurrentLandlord(listing.owner?.name || "Landlord")
    setCurrentLandlordId(landlordId)
    setCurrentPropertyId(propertyId)
    setCurrentPropertyTitle(listing.title)

    // Show the chat box
    setShowChat(true)
  }

  return (
    <div className="saved-page">
      <header className="header">
        <div className="container">
          <Link to="/" className="logo">
            <Home size={24} />
            <span className="logo-text">RoomRental</span>
          </Link>
          <nav className="main-nav">
            <ul className="nav-links">
              <li>
                <Link to="/services" className="nav-link">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/about" className="nav-link">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/saved" className="nav-link">
                  Saved
                </Link>
              </li>
              <li>
                <Link to="/add-property" className="nav-link">
                  Add Property
                </Link>
              </li>
            </ul>
            <div className="nav-actions">
              <div className="nav-icons">
                <Link to="/notifications" className="icon-link">
                  <Bell size={20} />
                </Link>
                <Link to="/messages" className="icon-link">
                  <MessageCircle size={20} />
                </Link>
              </div>
              {isLoggedIn ? (
                <div className="user-menu">
                  <div className="profile-icon" onClick={() => setShowDropdown(!showDropdown)}>
                    <User size={24} />
                    <span className="username">{username}</span>
                  </div>
                  {showDropdown && (
                    <div className="dropdown-menu">
                      <Link to="/profile" className="dropdown-item">
                        Personal Information
                      </Link>
                      <Link to="/settings" className="dropdown-item">
                        Settings
                      </Link>
                      <Link to="/manage-properties" className="dropdown-item">
                        Manage Properties
                      </Link>
                      <button onClick={handleLogout} className="dropdown-item">
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="auth-buttons">
                  <Link to="/login" className="btn btn-outline">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn btn-primary">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <section className="saved-listings">
        <div className="container">
          <div className="saved-header">
            <h2>Saved Listings</h2>
            <Link to="/" className="btn btn-secondary back-to-home">
              Back to Home
            </Link>
          </div>
          {savedListings.length === 0 ? (
            <p>You haven't saved any listings yet.</p>
          ) : (
            <div className="listings-grid">
              {savedListings.map((listing) => (
                <div key={listing.id || listing._id} className="listing-card">
                  <div className="listing-image-container">
                    <img
                      src={getImageUrl(listing.images[0]) || "/placeholder.svg"}
                      alt={listing.title}
                      className="listing-image"
                      onError={handleImageError}
                    />
                    <div className="listing-overlay">
                      <Link to={`/room/${listing.id || listing._id}`} className="btn btn-view">
                        <Eye size={20} /> View
                      </Link>
                    </div>
                  </div>
                  <div className="listing-details">
                    <h3>{listing.title}</h3>
                    <div
                      className={`availability-badge ${listing.status ? listing.status.toLowerCase().replace(/\s+/g, "-") : "available"}`}
                    >
                      <Badge size={14} />
                      <span>{listing.status || "Available"}</span>
                    </div>
                    <p className="listing-location">{listing.location}</p>
                    <p className="listing-price">Rs {listing.price?.toLocaleString()}/month</p>
                    <p className="furnished-status">{listing.furnished ? "Furnished" : "Unfurnished"}</p>
                    <div className="amenities">
                      <div className="amenity">
                        <Bed size={16} />
                        <span>
                          {listing.bedrooms} {listing.bedrooms === 1 ? "bed" : "beds"}
                        </span>
                      </div>
                      <div className="amenity">
                        <Bath size={16} />
                        <span>
                          {listing.bathrooms} {listing.bathrooms === 1 ? "bath" : "baths"}
                        </span>
                      </div>
                      {listing.amenities?.includes("parking") && (
                        <div className="amenity">
                          <Car size={16} />
                          <span>Parking</span>
                        </div>
                      )}
                      {listing.amenities?.includes("wifi") && (
                        <div className="amenity">
                          <Wifi size={16} />
                          <span>WiFi</span>
                        </div>
                      )}
                      {listing.amenities?.includes("water") && (
                        <div className="amenity">
                          <Droplet size={16} />
                          <span>Water</span>
                        </div>
                      )}
                      {listing.amenities?.includes("ac") && (
                        <div className="amenity">
                          <Snowflake size={16} />
                          <span>AC</span>
                        </div>
                      )}

                      {/* Custom amenities */}
                      {listing.customAmenities &&
                        listing.customAmenities.map((amenity, index) => (
                          <div key={`custom-${index}`} className="amenity custom-amenity">
                            <span>{amenity}</span>
                          </div>
                        ))}
                    </div>
                    <div className="listing-actions">
                      <button
                        className="btn btn-book"
                        onClick={() => handleBookNow(listing)}
                        disabled={
                          listing.status === "Booked" ||
                          listing.status === "Not Available" ||
                          listing.status === "Maintenance"
                        }
                      >
                        {listing.status === "Available" || !listing.status ? "Book Now" : listing.status}
                      </button>
                      <button className="btn btn-chat" onClick={() => handleChatWithLandlord(listing)}>
                        <MessageCircle size={16} /> Chat with landlord
                      </button>
                      <button
                        className="btn-favorite btn-favorite-active"
                        onClick={() => removeFavorite(listing.id || listing._id)}
                      >
                        <Heart size={20} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      {showChat && (
        <ChatBox
          onClose={() => setShowChat(false)}
          landlordName={currentLandlord}
          landlordId={currentLandlordId}
          propertyId={currentPropertyId}
          propertyTitle={currentPropertyTitle}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}

export default Saved

