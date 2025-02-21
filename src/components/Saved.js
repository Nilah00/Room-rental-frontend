"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Heart, Bell, MessageCircle, User, Home, Car, Wifi, Droplet, Bed, Bath, Snowflake, Eye } from "lucide-react"
import ChatBox from "./ChatBox"
import { getImageUrl, handleImageError } from "./imageUtils"

const Saved = () => {
  const [savedListings, setSavedListings] = useState([])
  const [showChat, setShowChat] = useState(false)
  const [currentLandlord, setCurrentLandlord] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [username, setUsername] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("token")
    const storedUser = JSON.parse(localStorage.getItem("user"))
    if (token && storedUser) {
      setIsLoggedIn(true)
      setUsername(storedUser.name)
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
    navigate(`/booknow/${listing.id}`, { state: { roomDetails: listing } })
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setIsLoggedIn(false)
    navigate("/")
  }

  const handleChatWithLandlord = (landlordName) => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }
    setCurrentLandlord(landlordName)
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

      <section className="featured-listings">
        <div className="container">
          <div className="saved-header">
            <h2>Saved Listings</h2>
            <Link to="/" className="btn btn-secondary">
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
                      <Link to={`/room/${listing.id || listing._id}`} className="btn btn-primary btn-view">
                        <Eye size={20} /> View
                      </Link>
                    </div>
                  </div>
                  <div className="listing-details">
                    <h3>{listing.title}</h3>
                    <p className="listing-location">{listing.location}</p>
                    <p className="listing-price">Rs {listing.price?.toLocaleString()}/month</p>
                    <p className="furnished-status">{listing.furnished ? "Furnished" : "Unfurnished"}</p>
                    <div className="amenities">
                      <div className="amenity">
                        <Bed size={16} /> {listing.bedrooms} {listing.bedrooms === 1 ? "bed" : "beds"}
                      </div>
                      <div className="amenity">
                        <Bath size={16} /> {listing.bathrooms} {listing.bathrooms === 1 ? "bath" : "baths"}
                      </div>
                      {listing.amenities?.includes("parking") && (
                        <div className="amenity">
                          <Car size={16} /> Parking
                        </div>
                      )}
                      {listing.amenities?.includes("wifi") && (
                        <div className="amenity">
                          <Wifi size={16} /> WiFi
                        </div>
                      )}
                      {listing.amenities?.includes("water") && (
                        <div className="amenity">
                          <Droplet size={16} /> Water
                        </div>
                      )}
                      {listing.amenities?.includes("ac") && (
                        <div className="amenity">
                          <Snowflake size={16} /> AC
                        </div>
                      )}
                    </div>
                    <div className="listing-actions">
                      <button className="btn btn-primary btn-book" onClick={() => handleBookNow(listing)}>
                        Book Now
                      </button>
                      <button
                        className="btn btn-outline btn-chat"
                        onClick={() => handleChatWithLandlord(listing.owner?.name || "Landlord")}
                      >
                        <MessageCircle size={16} /> Chat with Landlord
                      </button>
                      <button
                        className="btn btn-icon btn-favorite-active"
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
        <ChatBox onClose={() => setShowChat(false)} landlordName={currentLandlord} isLoggedIn={isLoggedIn} />
      )}
    </div>
  )
}

export default Saved

