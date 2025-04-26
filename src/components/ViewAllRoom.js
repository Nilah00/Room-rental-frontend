"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import axios from "axios"
import { Heart, Eye, MessageCircle, Car, Wifi, Droplet, Bed, Bath, Snowflake, Search, Badge } from "lucide-react"
import ChatBox from "./ChatBox"
import { getImageUrl, handleImageError } from "./imageUtils"
import "./ViewAllRoom.css"

// Helper function to check if a property is in the deletion blacklist
const isPropertyDeleted = (propertyId) => {
  try {
    // Get the blacklist from localStorage
    const blacklistJson = localStorage.getItem("deletedProperties")
    if (!blacklistJson) return false

    const blacklist = JSON.parse(blacklistJson)
    return Array.isArray(blacklist) && blacklist.includes(propertyId)
  } catch (error) {
    console.error("Error checking deletion blacklist:", error)
    return false
  }
}

function ViewAllRooms() {
  const [rooms, setRooms] = useState([])
  const [favorites, setFavorites] = useState([])
  const [searchParams, setSearchParams] = useState({
    location: "",
    priceRange: "",
    furnished: "",
    availability: "",
  })
  const [filteredRooms, setFilteredRooms] = useState([])
  const [showChat, setShowChat] = useState(false)
  const [currentLandlord, setCurrentLandlord] = useState("")
  const [currentLandlordId, setCurrentLandlordId] = useState("") // Add state for landlord ID
  const [currentPropertyId, setCurrentPropertyId] = useState("") // Add state for property ID
  const [currentPropertyTitle, setCurrentPropertyTitle] = useState("") // Add state for property title
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState("") // Add state for current user ID

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const token = localStorage.getItem("token")
    setIsLoggedIn(!!token)

    // Get current user ID from token
    if (token) {
      try {
        const payload = token.split(".")[1]
        if (payload) {
          const decodedPayload = JSON.parse(atob(payload))
          setCurrentUserId(decodedPayload.userId || decodedPayload.id || decodedPayload.sub)
        }
      } catch (error) {
        console.error("Error getting user ID from token:", error)
      }
    }
  }, [])

  const handleSearch = useCallback(() => {
    const filtered = rooms.filter((room) => {
      const matchesLocation =
        !searchParams.location || room.location.toLowerCase().includes(searchParams.location.toLowerCase())
      const matchesPrice =
        !searchParams.priceRange ||
        (searchParams.priceRange === "0-15000" && room.price <= 15000) ||
        (searchParams.priceRange === "15001-25000" && room.price > 15000 && room.price <= 25000) ||
        (searchParams.priceRange === "25001-35000" && room.price > 25000 && room.price <= 35000) ||
        (searchParams.priceRange === "35001+" && room.price > 35000)
      const matchesFurnished =
        !searchParams.furnished ||
        searchParams.furnished === "all" ||
        (searchParams.furnished === "furnished" && room.furnished) ||
        (searchParams.furnished === "unfurnished" && !room.furnished)

      // Standardize status for filtering
      const roomStatus = room.status || "Available"
      const matchesAvailability =
        !searchParams.availability || searchParams.availability === "all" || roomStatus === searchParams.availability

      return matchesLocation && matchesPrice && matchesFurnished && matchesAvailability
    })

    setFilteredRooms(filtered)
  }, [rooms, searchParams])

  useEffect(() => {
    fetchRooms()
    loadFavorites()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearchParams({
      location: params.get("location") || "",
      priceRange: params.get("priceRange") || "",
      furnished: params.get("furnished") || "",
      availability: params.get("availability") || "",
    })
  }, [location.search])

  useEffect(() => {
    handleSearch()
  }, [handleSearch])

  const fetchRooms = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await axios.get("http://localhost:5000/api/properties")

      // Filter out deleted properties
      const filteredResponse = response.data.filter((room) => !isPropertyDeleted(room._id))

      if (filteredResponse.length < response.data.length) {
        console.log(`Filtered out ${response.data.length - filteredResponse.length} deleted properties`)
      }

      const standardizedRooms = filteredResponse.map((room) => {
        // If status is missing, set to "Available"
        if (!room.status) {
          return { ...room, status: "Available" }
        }

        // Map "Not Available" and "Maintenance" to "Booked"
        if (room.status === "Not Available" || room.status === "Maintenance") {
          return { ...room, status: "Booked" }
        }

        // Map "Reserved" to "Pending"
        if (room.status === "Reserved") {
          return { ...room, status: "Pending" }
        }

        return room
      })

      setRooms(standardizedRooms)
      setFilteredRooms(standardizedRooms)
    } catch (error) {
      console.error("Error fetching rooms:", error)
      setError("Failed to load rooms. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  const loadFavorites = () => {
    const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || []
    setFavorites(storedFavorites)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setSearchParams((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const toggleFavorite = (room) => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }
    setFavorites((prev) => {
      const newFavorites = prev.some((fav) => fav._id === room._id)
        ? prev.filter((fav) => fav._id !== room._id)
        : [...prev, room]
      localStorage.setItem("favorites", JSON.stringify(newFavorites))
      return newFavorites
    })
  }

  const handleBookNow = (room) => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }
    navigate(`/booknow/${room._id}`, { state: { roomDetails: room } })
  }

  // Updated function to handle chat with landlord
  const handleChatWithLandlord = (landlordName, landlordId, propertyId, propertyTitle) => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }

    // Check if current user is the landlord
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

    if (!propertyId) {
      console.error("Missing propertyId in handleChatWithLandlord")
      alert("Cannot start chat: Missing property information")
      return
    }

    console.log("Starting chat with:", {
      landlordName,
      landlordId,
      propertyId,
      propertyTitle,
    })

    setCurrentLandlord(landlordName)
    setCurrentLandlordId(landlordId)
    setCurrentPropertyId(propertyId)
    setCurrentPropertyTitle(propertyTitle || "Property Chat") // Provide default if missing
    setShowChat(true)
  }

  // Add this useEffect to listen for property deletion events
  useEffect(() => {
    const handlePropertyDeleted = (event) => {
      const { propertyId } = event.detail
      console.log(`Received property deletion event for property ${propertyId}`)

      // Update rooms state to filter out the deleted property
      setRooms((prevRooms) => prevRooms.filter((room) => room._id !== propertyId))
      setFilteredRooms((prevFilteredRooms) => prevFilteredRooms.filter((room) => room._id !== propertyId))
    }

    // Listen for property deletion events
    window.addEventListener("propertyDeleted", handlePropertyDeleted)

    // Cleanup
    return () => {
      window.removeEventListener("propertyDeleted", handlePropertyDeleted)
    }
  }, [])

  if (isLoading) {
    return <div className="loading">Loading rooms...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  // Helper function to get button text based on status
  const getBookButtonText = (status) => {
    switch (status) {
      case "Booked":
        return "Booked"
      case "Pending":
        return "Pending"
      default:
        return "Book Now"
    }
  }

  return (
    <div className="view-all-rooms-page">
      <div className="container">
        <Link to="/" className="btn btn-secondary back-to-home">
          Back to Home
        </Link>
        <h1>All Available Rooms</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSearch()
          }}
          className="search-form"
        >
          <div className="search-row">
            <input
              type="text"
              name="location"
              placeholder="Where do you want to live?"
              value={searchParams.location}
              onChange={handleInputChange}
              className="location-input"
            />

            <select
              name="priceRange"
              value={searchParams.priceRange}
              onChange={handleInputChange}
              className="price-range-select"
            >
              <option value="">Price Range</option>
              <option value="0-15000">Rs 0 - Rs 15,000</option>
              <option value="15001-25000">Rs 15,001 - Rs 25,000</option>
              <option value="25001-35000">Rs 25,001 - Rs 35,000</option>
              <option value="35001+">Rs 35,001+</option>
            </select>

            <div className="filter-group">
              <label htmlFor="furnished">Furnished Status</label>
              <select id="furnished" name="furnished" value={searchParams.furnished} onChange={handleInputChange}>
                <option value="all">All</option>
                <option value="furnished">Furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="availability">Availability Status</label>
              <select
                id="availability"
                name="availability"
                value={searchParams.availability}
                onChange={handleInputChange}
              >
                <option value="all">All</option>
                <option value="Available">Available</option>
                <option value="Pending">Pending</option>
                <option value="Booked">Booked</option>
              </select>
            </div>

            <button type="submit" className="search-button">
              <Search size={20} /> Search Rooms
            </button>
          </div>
        </form>

        <div className="listings-grid">
          {filteredRooms.map((room) => (
            <div key={room._id} className="listing-card">
              <div className="listing-image-container">
                <img
                  src={getImageUrl(room.images[0]) || "/placeholder.svg"}
                  alt={room.title}
                  className="listing-image"
                  onError={handleImageError}
                />
                <div className="listing-overlay">
                  <Link to={`/room/${room._id}`} className="btn btn-view">
                    <Eye size={20} /> View
                  </Link>
                </div>
              </div>
              <div className="listing-details">
                <h3>{room.title}</h3>
                <div className={`availability-badge ${room.status.toLowerCase().replace(/\s+/g, "-")}`}>
                  <Badge size={14} />
                  <span>{room.status}</span>
                </div>
                <p className="listing-location">{room.location}</p>
                <p className="listing-price">Rs {room.price.toLocaleString()}/month</p>
                <p className="furnished-status">{room.furnished ? "Furnished" : "Unfurnished"}</p>
                <div className="amenities">
                  <div className="amenity">
                    <Bed size={16} />
                    <span>
                      {room.bedrooms} {room.bedrooms === 1 ? "bed" : "beds"}
                    </span>
                  </div>
                  <div className="amenity">
                    <Bath size={16} />
                    <span>
                      {room.bathrooms} {room.bathrooms === 1 ? "bath" : "baths"}
                    </span>
                  </div>
                  {room.amenities && room.amenities.includes("parking") && (
                    <div className="amenity">
                      <Car size={16} />
                      <span>Parking</span>
                    </div>
                  )}
                  {room.amenities && room.amenities.includes("wifi") && (
                    <div className="amenity">
                      <Wifi size={16} />
                      <span>WiFi</span>
                    </div>
                  )}
                  {room.amenities && room.amenities.includes("water") && (
                    <div className="amenity">
                      <Droplet size={16} />
                      <span>Water</span>
                    </div>
                  )}
                  {room.amenities && room.amenities.includes("ac") && (
                    <div className="amenity">
                      <Snowflake size={16} />
                      <span>AC</span>
                    </div>
                  )}

                  {/* Custom amenities */}
                  {room.customAmenities &&
                    room.customAmenities.map((amenity, index) => (
                      <div key={`custom-${index}`} className="amenity custom-amenity">
                        <span>{amenity}</span>
                      </div>
                    ))}
                </div>
                <div className="listing-actions">
                  <button
                    className="btn btn-book"
                    onClick={() => handleBookNow(room)}
                    disabled={room.status !== "Available"}
                  >
                    {getBookButtonText(room.status)}
                  </button>
                  <button
                    className="btn btn-chat"
                    onClick={() =>
                      handleChatWithLandlord(
                        room.owner?.name || "Landlord",
                        room.owner?.id || room.owner?._id || room.landlordId,
                        room._id,
                        room.title,
                      )
                    }
                  >
                    <MessageCircle size={16} /> Chat with landlord
                  </button>
                  <button
                    className={`btn-favorite ${favorites.some((fav) => fav._id === room._id) ? "btn-favorite-active" : ""}`}
                    onClick={() => toggleFavorite(room)}
                    aria-label={
                      favorites.some((fav) => fav._id === room._id) ? "Remove from favorites" : "Add to favorites"
                    }
                  >
                    <Heart size={20} fill={favorites.some((fav) => fav._id === room._id) ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
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

export default ViewAllRooms
