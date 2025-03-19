"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Star,
  Bell,
  MessageCircle,
  User,
  Eye,
  Heart,
  Search,
  MessageSquare,
  HomeIcon,
  Lock,
  BarChart2,
  PenTool,
  Car,
  Wifi,
  Droplet,
  Snowflake,
  Badge,
} from "lucide-react"
import "./Home.css"
import ChatBox from "./ChatBox"
import RentalMap from "./RentalMap"
import { getImageUrl, handleImageError } from "./imageUtils"
import { getFeaturedProperties, getFavorites } from "../services/api"
// Fix the import to only include functions that exist
import { isAuthenticated, logout } from "../services/auth" // Import validateUserRole

const HomePage = () => {
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
  const [featuredListings, setFeaturedListings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mapKey, setMapKey] = useState(Date.now()) // Add a key to force map re-render

  const navigate = useNavigate()

  // Function to get featured property IDs from localStorage
  const getFeaturedIdsFromLocalStorage = () => {
    try {
      const featuredPropertiesJson = localStorage.getItem("admin_featured_properties") || "{}"
      const featuredProperties = JSON.parse(featuredPropertiesJson)

      // Filter only properties that are actually featured (value is true)
      const featuredPropertyIds = Object.entries(featuredProperties)
        .filter(([_, isFeatured]) => isFeatured === true)
        .map(([id, _]) => id)

      return featuredPropertyIds
    } catch (error) {
      console.error("Error getting featured IDs from localStorage:", error)
      return []
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Check if user is authenticated (as a regular user, not admin)
        const authStatus = isAuthenticated(false)
        setIsLoggedIn(authStatus)

        if (authStatus) {
          // Get the user data from the correct storage location
          //  want the regular user data, not admin
          const user = JSON.parse(localStorage.getItem("user"))

          if (user) {
            setUsername(user.name)
          }

          try {
            const favoritesResponse = await getFavorites()
            setFavorites(favoritesResponse.data)
          } catch (userDataError) {
            console.error("Error fetching user data:", userDataError)
          }
        } else {
          setIsLoggedIn(false)
        }

        const storedFavorites = localStorage.getItem("favorites")
        if (storedFavorites) {
          setFavorites(JSON.parse(storedFavorites))
        }

        try {
          // DIRECT FIX: Get featured IDs from localStorage first
          const featuredIds = getFeaturedIdsFromLocalStorage()

          if (featuredIds.length === 0) {
            // If no featured IDs in localStorage, try the API
            const featuredResponse = await getFeaturedProperties()
            const trulyFeatured = featuredResponse.data.filter((property) => property.featured === true)
            setFeaturedListings(trulyFeatured)
          } else {
            // If we have featured IDs in localStorage, fetch all properties and filter
            const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"
            const response = await fetch(`${API_URL}/properties?_=${Date.now()}`)
            const data = await response.json()

            // Extract the properties array
            let allProperties = data
            if (!Array.isArray(allProperties)) {
              if (allProperties.properties) {
                allProperties = allProperties.properties
              } else if (allProperties.data) {
                allProperties = allProperties.data
              }
            }

            // Filter for properties that match our featured IDs
            const featuredProperties = allProperties.filter((property) => {
              const propertyId = property._id || property.id
              return featuredIds.includes(propertyId)
            })

            // Update the state with the featured properties
            setFeaturedListings(featuredProperties)
          }
        } catch (featuredError) {
          console.error("Error fetching featured properties:", featuredError)
          setError("Failed to load featured properties. Please try again later.")
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("An error occurred while loading the page. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    // Force map re-render when component mounts
    setMapKey(Date.now())
  }, [])

  useEffect(() => {
    // Load favorites from localStorage when the component mounts
    const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || []
    setFavorites(storedFavorites)
  }, [])

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
    if (!isLoggedIn) {
      navigate("/login")
      return
    }
    setFavorites((prev) => {
      const listingId = listing._id
      const newFavorites = prev.some((fav) => fav._id === listingId)
        ? prev.filter((fav) => fav._id !== listingId)
        : [...prev, listing]

      // Update localStorage
      localStorage.setItem("favorites", JSON.stringify(newFavorites))
      return newFavorites
    })
  }

  const handleBookNow = (listing) => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }
    navigate(`/booknow/${listing._id}`, { state: { roomDetails: listing } })
  }

  const handleChatWithLandlord = (landlordName) => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }
    setCurrentLandlord(landlordName)
    setShowChat(true)
  }

  const handleLogout = () => {
    // Store the current properties before logout
    const currentProperties = localStorage.getItem("properties")

    // Perform logout
    logout(false)
    setIsLoggedIn(false)
    setUsername("")
    setFavorites([])

    // Restore properties data for the map
    if (currentProperties) {
      localStorage.setItem("properties", currentProperties)
    }

    // Force map re-render by updating the key
    setMapKey(Date.now())

    navigate("/")
  }

  // Function to refresh featured properties
  const refreshFeaturedProperties = async () => {
    setIsLoading(true)
    try {
      // Get featured IDs from localStorage
      const featuredIds = getFeaturedIdsFromLocalStorage()

      if (featuredIds.length === 0) {
        // If no featured IDs in localStorage, try the API
        const featuredResponse = await getFeaturedProperties()
        const trulyFeatured = featuredResponse.data.filter((property) => property.featured === true)
        setFeaturedListings(trulyFeatured)
      } else {
        // If we have featured IDs in localStorage, fetch all properties and filter
        const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"
        const response = await fetch(`${API_URL}/properties?_=${Date.now()}`)
        const data = await response.json()

        // Extract the properties array
        let allProperties = data
        if (!Array.isArray(allProperties)) {
          if (allProperties.properties) {
            allProperties = allProperties.properties
          } else if (allProperties.data) {
            allProperties = allProperties.data
          }
        }

        // Filter for properties that match our featured IDs
        const featuredProperties = allProperties.filter((property) => {
          const propertyId = property._id || property.id
          return featuredIds.includes(propertyId)
        })

        setFeaturedListings(featuredProperties)
      }
    } catch (error) {
      console.error("Error refreshing featured properties:", error)
      setError("Failed to refresh featured properties")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  return (
    <div className="home-page">
      <header className="header">
        <div className="container">
          <Link to="/" className="logo">
            <HomeIcon size={24} />
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
                <div className="auth-buttons-container">
                  <Link to="/login" className="auth-signup">
                    Sign In
                  </Link>
                  <Link to="/register" className="auth-signin">
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
            <button type="submit" className="btn btn-search">
              Search Rooms
            </button>
          </form>
        </div>
      </section>

      <section className="rental-map">
        <div className="container">
          <h2>Explore Available Rentals</h2>

          <RentalMap key={mapKey} />
          <div className="rental-map-info"></div>
        </div>
      </section>

      <section className="featured-listings">
        <div className="container">
          <div className="section-header">
            <h2>Featured Rooms</h2>
            <button onClick={refreshFeaturedProperties} className="btn btn-refresh" disabled={isLoading}>
              {isLoading ? "Refreshing..." : "Refresh Listings"}
            </button>
          </div>

          {featuredListings.length > 0 ? (
            <div className="listings-grid">
              {featuredListings.map((listing) => (
                <div key={listing._id || listing.id} className="listing-card">
                  <div className="listing-image-container">
                    <img
                      src={getImageUrl(listing.images && listing.images[0]) || "/placeholder.svg"}
                      alt={listing.title}
                      className="listing-image"
                      width={250}
                      height={167}
                      onError={handleImageError}
                    />
                    <div className="listing-overlay">
                      <Link to={`/room/${listing._id || listing.id}`} className="btn btn-view">
                        <Eye size={20} /> View
                      </Link>
                    </div>
                  </div>
                  <div className="listing-details">
                    <h3>{listing.title}</h3>
                    <span
                      className={`availability-badge ${
                        !listing.status || listing.status === "Available"
                          ? "available"
                          : listing.status === "Booked"
                            ? "booked"
                            : listing.status === "Not Available"
                              ? "not-available"
                              : listing.status === "Maintenance"
                                ? "maintenance"
                                : listing.status === "Reserved"
                                  ? "reserved"
                                  : "not-available"
                      }`}
                    >
                      <Badge size={14} />
                      <span>{listing.status || "Available"}</span>
                    </span>
                    <p className="listing-location">{listing.location}</p>
                    <p className="listing-price">Rs {listing.price ? listing.price.toLocaleString() : "0"}/month</p>
                    <p className="furnished-status">{listing.furnished ? "Furnished" : "Unfurnished"}</p>
                    <div className="amenities">
                      {/* Predefined amenities with icons */}
                      {listing.amenities && listing.amenities.includes("wifi") && (
                        <div className="amenity">
                          <Wifi size={16} />
                          <span>WiFi</span>
                        </div>
                      )}
                      {listing.amenities && listing.amenities.includes("parking") && (
                        <div className="amenity">
                          <Car size={16} />
                          <span>Parking</span>
                        </div>
                      )}
                      {listing.amenities && listing.amenities.includes("water") && (
                        <div className="amenity">
                          <Droplet size={16} />
                          <span>Water</span>
                        </div>
                      )}
                      {listing.amenities && listing.amenities.includes("ac") && (
                        <div className="amenity">
                          <Snowflake size={16} />
                          <span>AC</span>
                        </div>
                      )}

                      {/* Custom amenities */}
                      {listing.customAmenities &&
                        listing.customAmenities.map((amenity, index) => (
                          <div className="amenity custom-amenity" key={`custom-${index}`}>
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
                      <button
                        className="btn btn-chat"
                        onClick={() => handleChatWithLandlord(listing.owner?.name || "Landlord")}
                      >
                        <MessageCircle size={16} /> Chat with landlord
                      </button>
                      <button
                        className={`btn-favorite ${favorites.some((fav) => fav._id === listing._id) ? "btn-favorite-active" : ""}`}
                        onClick={() => toggleFavorite(listing)}
                        aria-label={
                          favorites.some((fav) => fav._id === listing._id)
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                      >
                        <Heart
                          size={20}
                          fill={favorites.some((fav) => fav._id === listing._id) ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-listings-message">
              <p>No featured rooms available at the moment.</p>
              <p className="no-listings-subtext">Check back later or browse all available rooms.</p>
            </div>
          )}
          <div className="view-more-container">
            <Link to="/rooms" className="btn btn-view-all">
              View All Rooms
            </Link>
          </div>
        </div>
      </section>

      <section className="landlord-cta">
        <div className="container">
          <h2>Are You a Landlord?</h2>
          <p>List your room on RoomRental and connect with thousands of potential tenants.</p>
          <Link to="/add-property" className="btn btn-add-property">
            Add Your Property
          </Link>
        </div>
      </section>

      <section className="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps-grid">
            <div className="step">
              <div className="step-icon">
                <Search size={24} />
              </div>
              <h3>Search</h3>
              <p>
                Browse through our extensive list of available rooms in Nepal and apply filters to find your perfect
                match.
              </p>
            </div>
            <div className="step">
              <div className="step-icon">
                <MessageSquare size={24} />
              </div>
              <h3>Connect</h3>
              <p>Reach out to landlords directly through our platform to ask questions and schedule viewings.</p>
            </div>
            <div className="step">
              <div className="step-icon">
                <HomeIcon size={24} />
              </div>
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
              <div className="benefit-icon">
                <Lock size={24} />
              </div>
              <h3>Secure Transactions</h3>
              <p>Our platform ensures safe and secure transactions for both tenants and landlords.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <BarChart2 size={24} />
              </div>
              <h3>Extensive Listings</h3>
              <p>Access a wide variety of rooms and properties to suit every need and budget.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <PenTool size={24} />
              </div>
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
                    <Star
                      key={i}
                      size={16}
                      fill={i < testimonial.rating ? "currentColor" : "none"}
                      stroke={i < testimonial.rating ? "currentColor" : "currentColor"}
                    />
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
      {showChat && (
        <ChatBox onClose={() => setShowChat(false)} landlordName={currentLandlord} isLoggedIn={isLoggedIn} />
      )}
    </div>
  )
}

export default HomePage

