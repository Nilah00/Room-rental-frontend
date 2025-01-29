import React, { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Star, Bell, MessageCircle, Heart, User, Edit, Trash2 } from "lucide-react"
import axios from "axios"
import "./Home.css"
import "./RentalMap.css"
import ChatBox from "./ChatBox"
import RentalMap from "./RentalMap"
import { getImageUrl, handleImageError } from "./imageUtils"

function Home() {
  const [searchParams, setSearchParams] = useState({
    location: "",
    priceRange: "",
    furnished: "",
  })

  const [favorites, setFavorites] = useState([])
  const [showChat, setShowChat] = useState(false)
  const [currentLandlord, setCurrentLandlord] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [username, setUsername] = useState("")
  const [userProperties, setUserProperties] = useState([])
  const [featuredListings, setFeaturedListings] = useState([])

  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("token")
    const storedUser = JSON.parse(localStorage.getItem("user"))
    if (token && storedUser) {
      setIsLoggedIn(true)
      setUsername(storedUser.name)
      fetchUserProperties(token)
    } else {
      setIsLoggedIn(false)
    }

    const storedFavorites = localStorage.getItem("favorites")
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites))
    }

    fetchFeaturedListings()
  }, [])

  const fetchUserProperties = async (token) => {
    try {
      const response = await axios.get("http://localhost:5000/api/user/properties", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setUserProperties(response.data)
    } catch (error) {
      console.error("Error fetching user properties:", error)
    }
  }

  const fetchFeaturedListings = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/properties/featured")
      console.log("Fetched featured listings:", response.data)
      setFeaturedListings(response.data)
    } catch (error) {
      console.error("Error fetching featured listings:", error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setSearchParams((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const searchQuery = new URLSearchParams(searchParams).toString()
    navigate(`/rooms?${searchQuery}`)
  }

  const toggleFavorite = (listing) => {
    setFavorites((prev) => {
      const listingId = listing._id
      const newFavorites = prev.some((fav) => fav._id === listingId)
        ? prev.filter((fav) => fav._id !== listingId)
        : [...prev, listing]

      localStorage.setItem("favorites", JSON.stringify(newFavorites))

      return newFavorites
    })
  }

  const handleBookNow = (listing) => {
    navigate(`/booknow/${listing._id}`, { state: { roomDetails: listing } })
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setIsLoggedIn(false)
    setUsername("")
    setUserProperties([])
    navigate("/")
  }

  const handleEditProperty = (propertyId) => {
    navigate(`/edit-property/${propertyId}`)
  }

  const handleDeleteProperty = async (propertyId) => {
    if (window.confirm("Are you sure you want to delete this property?")) {
      try {
        const token = localStorage.getItem("token")
        await axios.delete(`http://localhost:5000/api/properties/${propertyId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        setUserProperties((prev) => prev.filter((prop) => prop._id !== propertyId))
      } catch (error) {
        console.error("Error deleting property:", error)
      }
    }
  }

  return (
    <div className="home-page">
      <header className="header">
        <div className="container">
          <Link to="/" className="logo">
            <span className="home-icon">🏠</span>
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
                        Manage Properties ({userProperties.length})
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

      <section className="hero">
        <div className="container">
          <h1>Find Your Perfect Dream Space</h1>
          <p>Whether you're looking for a room or ready to rent out your property, we've got you covered.</p>
          <form onSubmit={handleSubmit} className="search-form">
            <input
              type="text"
              name="location"
              placeholder="Where do you want to live?"
              value={searchParams.location}
              onChange={handleInputChange}
            />
            <select name="priceRange" value={searchParams.priceRange} onChange={handleInputChange}>
              <option value="">Price Range</option>
              <option value="0-15000">Rs 0 - Rs 15,000</option>
              <option value="15001-25000">Rs 15,001 - Rs 25,000</option>
              <option value="25001-35000">Rs 25,001 - Rs 35,000</option>
              <option value="35001+">Rs 35,001+</option>
            </select>
            <select name="furnished" value={searchParams.furnished} onChange={handleInputChange}>
              <option value="">Furnished Status</option>
              <option value="furnished">Furnished</option>
              <option value="unfurnished">Unfurnished</option>
            </select>
            <button type="submit" className="btn btn-primary">
              Search Rooms
            </button>
          </form>
        </div>
      </section>

      <section className="rental-map">
        <div className="container">
          <h2>Explore Available Rentals</h2>
          <RentalMap />
        </div>
      </section>

      {isLoggedIn && userProperties.length > 0 && (
        <section className="user-properties">
          <div className="container">
            <h2>Your Properties</h2>
            <div className="properties-grid">
              {userProperties.map((property) => (
                <div key={property._id} className="property-card">
                  <img
                    src={getImageUrl(property.images[0]) || "/placeholder.svg"}
                    alt={property.title}
                    className="property-image"
                    onError={handleImageError}
                  />
                  <div className="property-details">
                    <h3>{property.title}</h3>
                    <p>{property.location}</p>
                    <p>Rs {property.price.toLocaleString()}/month</p>
                    <div className="property-actions">
                      <button onClick={() => handleEditProperty(property._id)} className="btn btn-secondary">
                        <Edit size={16} /> Edit
                      </button>
                      <button onClick={() => handleDeleteProperty(property._id)} className="btn btn-danger">
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="view-more-container">
              <Link to="/manage-properties" className="btn btn-primary">
                Manage All Properties
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="featured-listings">
        <div className="container">
          <h2>Featured Rooms</h2>
          {featuredListings.length > 0 ? (
            <div className="listings-grid">
              {featuredListings.map((listing) => (
                <div key={listing._id} className="listing-card">
                  <img
                    src={getImageUrl(listing.images[0]) || "/placeholder.svg"}
                    alt={listing.title}
                    className="listing-image"
                    width={250}
                    height={167}
                    onError={handleImageError}
                  />
                  <div className="listing-details">
                    <h3>{listing.title}</h3>
                    <p className="listing-location">{listing.location}</p>
                    <p className="listing-price">Rs {listing.price.toLocaleString()}/month</p>
                    <p className="furnished-status">{listing.furnished ? "Furnished" : "Unfurnished"}</p>
                    <div className="amenities">
                      {listing.amenities.includes("parking") && <div className="amenity">🅿️ Parking</div>}
                      {listing.amenities.includes("wifi") && <div className="amenity">📶 WiFi</div>}
                      {listing.amenities.includes("water") && <div className="amenity">💧 Water</div>}
                    </div>
                    <div className="listing-actions">
                      <button className="btn btn-primary btn-book" onClick={() => handleBookNow(listing)}>
                        Book Now
                      </button>
                      <button
                        className="btn btn-outline btn-chat"
                        onClick={() => {
                          setCurrentLandlord(listing.owner.name || "Landlord")
                          setShowChat(true)
                        }}
                      >
                        💬 Chat with Landlord
                      </button>
                      <button
                        className={`btn btn-icon ${favorites.some((fav) => fav._id === listing._id) ? "btn-favorite-active" : "btn-favorite"}`}
                        onClick={() => toggleFavorite(listing)}
                        aria-label={
                          favorites.some((fav) => fav._id === listing._id)
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                      >
                        <Heart size={20} fill={favorites.some((fav) => fav._id === listing._id) ? "red" : "none"} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No featured rooms available at the moment.</p>
          )}
          <div className="view-more-container">
            <Link to="/rooms" className="btn btn-secondary">
              View All Rooms
            </Link>
          </div>
        </div>
      </section>

      <section className="landlord-cta">
        <div className="container">
          <h2>Are You a Landlord?</h2>
          <p>List your room on RoomRental and connect with thousands of potential tenants.</p>
          <Link to="/add-property" className="btn btn-primary btn-small btn-center">
            Add Your Property
          </Link>
        </div>
      </section>

      <section className="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps-grid">
            <div className="step">
              <div className="step-icon">🔍</div>
              <h3>Search</h3>
              <p>
                Browse through our extensive list of available rooms in Nepal and apply filters to find your perfect
                match.
              </p>
            </div>
            <div className="step">
              <div className="step-icon">💬</div>
              <h3>Connect</h3>
              <p>Reach out to landlords directly through our platform to ask questions and schedule viewings.</p>
            </div>
            <div className="step">
              <div className="step-icon">🏠</div>
              <h3>Move In</h3>
              <p>Once you've found your ideal room, complete the booking process and prepare for your move-in date.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="why-choose-us">
        <div className="container">
          <h2>Why Choose RoomRental</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">🔒</div>
              <h3>Secure Transactions</h3>
              <p>Our platform ensures safe and secure transactions for both tenants and landlords.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">📊</div>
              <h3>Extensive Listings</h3>
              <p>Access a wide variety of rooms and properties to suit every need and budget.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🛠️</div>
              <h3>24/7 Support</h3>
              <p>Our dedicated support team is always ready to assist you with any issues or questions.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <div className="container">
          <h2>What Our Users Say</h2>
          <div className="testimonials-grid">
            {[
              {
                id: 1,
                name: "Aarav Sharma",
                role: "Tenant",
                content:
                  "RoomRental made finding a comfortable and affordable room near my university so easy. The landlord communication feature was a game-changer!",
                rating: 5,
              },
              {
                id: 2,
                name: "Sita Gurung",
                role: "Landlord",
                content:
                  "As a property owner, RoomRental has simplified the process of finding reliable tenants. The platform's reach and user-friendly interface have helped me rent out my properties quickly and efficiently.",
                rating: 5,
              },
              {
                id: 3,
                name: "Bikash Rai",
                role: "Tenant",
                content:
                  "As someone who moves frequently for work, RoomRental has been a lifesaver. It's so convenient to find furnished rooms with all the amenities I need.",
                rating: 5,
              },
            ].map((testimonial) => (
              <div key={testimonial.id} className="testimonial-card">
                <p className="testimonial-content">{testimonial.content}</p>
                <div className="testimonial-author">
                  <h4>{testimonial.name}</h4>
                  <p>{testimonial.role}</p>
                </div>
                <div className="testimonial-rating">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={i < testimonial.rating ? "star-filled" : "star-empty"} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>RoomRental</h3>
              <p>Connecting rooms and people seamlessly.</p>
            </div>
            <div className="footer-section">
              <h3>Quick Links</h3>
              <ul>
                <li>
                  <Link to="/search">Search Rooms</Link>
                </li>
                <li>
                  <Link to="/add-property">List Your Property</Link>
                </li>
                <li>
                  <Link to="/about">About Us</Link>
                </li>
                <li>
                  <Link to="/contact">Contact</Link>
                </li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Legal</h3>
              <ul>
                <li>
                  <Link to="/terms">Terms of Service</Link>
                </li>
                <li>
                  <Link to="/privacy">Privacy Policy</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 RoomRental. All rights reserved.</p>
          </div>
        </div>
      </footer>
      {showChat && <ChatBox onClose={() => setShowChat(false)} landlordName={currentLandlord} />}
    </div>
  )
}

export default Home

