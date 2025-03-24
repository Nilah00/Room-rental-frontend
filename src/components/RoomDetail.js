"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { MessageCircle, MapPin, Badge } from "lucide-react"
import { getPropertyById, toggleFavorite as toggleFavoriteApi, getFavorites } from "../services/api"
import { getImageUrl, handleImageError } from "./imageUtils"
import { isAuthenticated } from "../services/auth"
import ChatBox from "./ChatBox"
import "./RoomDetail.css"

const RoomDetail = () => {
  const [room, setRoom] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const { id } = useParams()
  const navigate = useNavigate()

  // Load favorites from API or localStorage
  const loadFavorites = useCallback(async () => {
    try {
      if (isLoggedIn) {
        const response = await getFavorites()
        const favoritesData = response.data || []
        setFavorites(favoritesData)

        // Check if current room is in favorites
        const isCurrentRoomFavorite = favoritesData.some((fav) => {
          // Check direct match
          if (fav._id === id || fav.id === id) return true

          // Check if favorite has property field
          if (fav.property && (fav.property._id === id || fav.property.id === id)) return true

          return false
        })

        setIsFavorite(isCurrentRoomFavorite)
      } else {
        // If not logged in, check localStorage
        const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || []
        setFavorites(storedFavorites)

        // Check if current room is in favorites
        const isCurrentRoomFavorite = storedFavorites.some((fav) => {
          if (fav._id === id || fav.id === id) return true
          if (fav.property && (fav.property._id === id || fav.property.id === id)) return true
          return false
        })

        setIsFavorite(isCurrentRoomFavorite)
      }
    } catch (error) {
      console.error("Error loading favorites:", error)
      // Fallback to localStorage
      const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || []
      setFavorites(storedFavorites)

      const isCurrentRoomFavorite = storedFavorites.some((fav) => {
        if (fav._id === id || fav.id === id) return true
        if (fav.property && (fav.property._id === id || fav.property.id === id)) return true
        return false
      })

      setIsFavorite(isCurrentRoomFavorite)
    }
  }, [id, isLoggedIn])

  const fetchRoomData = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    setError(null)
    try {
      const roomData = await getPropertyById(id)
      setRoom(roomData)

      // After fetching room data, load favorites to check if this room is a favorite
      await loadFavorites()
    } catch (err) {
      console.error("Error fetching room data:", err)
      setError("Failed to load room details. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [id, loadFavorites])

  useEffect(() => {
    const checkAuth = () => {
      const authStatus = isAuthenticated()
      setIsLoggedIn(authStatus)
    }

    checkAuth()
    fetchRoomData()

    // Listen for favorites updates from other components
    const handleFavoritesUpdate = () => {
      loadFavorites()
    }

    window.addEventListener("favoritesUpdated", handleFavoritesUpdate)

    return () => {
      window.removeEventListener("favoritesUpdated", handleFavoritesUpdate)
    }
  }, [fetchRoomData, loadFavorites])

  const handleToggleFavorite = async () => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }

    try {
      console.log("Toggling favorite for room:", id)

      // Call the API to toggle favorite status
      await toggleFavoriteApi(id)

      // Refresh favorites to get updated status
      await loadFavorites()

      // Notify other components about the change
      window.dispatchEvent(new CustomEvent("favoritesUpdated"))
    } catch (err) {
      console.error("Error toggling favorite:", err)
    }
  }

  const handleBookNow = () => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }

    // Check if room is available for booking
    if (room.status === "Booked" || room.status === "Not Available" || room.status === "Maintenance") {
      alert(`This property is currently ${room.status.toLowerCase()} and cannot be booked.`)
      return
    }

    navigate(`/booknow/${id}`, { state: { roomDetails: room } })
  }

  const handleChatWithLandlord = () => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }
    setShowChat(true)
  }

  // Image slider navigation
  const goToPreviousImage = () => {
    if (room?.images?.length > 0) {
      setCurrentImageIndex((prevIndex) => (prevIndex === 0 ? room.images.length - 1 : prevIndex - 1))
    }
  }

  const goToNextImage = () => {
    if (room?.images?.length > 0) {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % room.images.length)
    }
  }

  if (isLoading) return <div className="loading">Loading room details...</div>
  if (error) return <div className="error">{error}</div>
  if (!room) return <div className="not-found">Room not found</div>

  return (
    <div className="room-detail-page">
      <div className="container">
        <Link to="/" className="btn btn-secondary back-to-home">
          Back to Home
        </Link>
        <h1>{room.title}</h1>

        {/* Display room status */}
        <div
          className={`availability-badge ${room.status ? room.status.toLowerCase().replace(/\s+/g, "-") : "available"}`}
        >
          <Badge size={14} />
          <span>{room.status || "Available"}</span>
        </div>

        <div className="room-detail-content">
          <div className="room-main-content">
            {/* Image Slider */}
            <div className="room-images-slider">
              {room.images && room.images.length > 0 ? (
                <>
                  <div className="slider-container">
                    <img
                      src={getImageUrl(room.images[currentImageIndex]) || "/placeholder.svg"}
                      alt={`${room.title} - ${currentImageIndex + 1}`}
                      className="room-image"
                      onError={handleImageError}
                    />

                    {/* Navigation arrows - only show if more than one image */}
                    {room.images.length > 1 && (
                      <>
                        <button className="slider-nav prev" onClick={goToPreviousImage} aria-label="Previous image">
                          &lt;
                        </button>
                        <button className="slider-nav next" onClick={goToNextImage} aria-label="Next image">
                          &gt;
                        </button>
                      </>
                    )}
                  </div>

                  {/* Image indicators - only show if more than one image */}
                  {room.images.length > 1 && (
                    <div className="slider-indicators">
                      {room.images.map((_, index) => (
                        <button
                          key={index}
                          className={`indicator ${index === currentImageIndex ? "active" : ""}`}
                          onClick={() => setCurrentImageIndex(index)}
                          aria-label={`Go to image ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <img src="/placeholder.svg" alt="No available" className="room-image" />
              )}
            </div>

            {room.video && (
              <div className="room-video">
                <h3>Property Video</h3>
                <video src={getImageUrl(room.video)} controls width="100%" />
              </div>
            )}
          </div>

          <div className="room-info">
            <p className="room-location">
              <MapPin size={20} />
              {room.location}
            </p>
            <p className="room-price">Rs {room.price.toLocaleString()}/month</p>
            <p className="room-furnished">{room.furnished ? "Furnished" : "Unfurnished"}</p>
            <div className="room-amenities">
              <h3>Amenities</h3>
              <ul>
                {room.amenities && room.amenities.length > 0 ? (
                  room.amenities.map((amenity, index) => <li key={index}>{amenity}</li>)
                ) : (
                  <li>No amenities listed</li>
                )}
              </ul>

              {/* Custom Amenities */}
              {room.customAmenities && room.customAmenities.length > 0 && (
                <div className="custom-amenities">
                  <h3>Custom Amenities</h3>
                  <ul className="custom-amenities-list">
                    {room.customAmenities.map((amenity, index) => (
                      <li key={`custom-${index}`} className="custom-amenity-item">
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <p className="room-description">{room.description}</p>
            <div className="room-details">
              <p>Bedrooms: {room.bedrooms}</p>
              <p>Bathrooms: {room.bathrooms}</p>
              <p>
                Status: <span className="status-text">{room.status || "Available"}</span>
              </p>
            </div>
            <div className="room-actions">
              <button
                className="btn btn-primary"
                onClick={handleBookNow}
                disabled={room.status === "Booked" || room.status === "Not Available" || room.status === "Maintenance"}
              >
                {room.status === "Available" || !room.status ? "Book Now" : room.status}
              </button>
              <button className="btn btn-outline" onClick={handleChatWithLandlord}>
                <MessageCircle size={20} /> Chat with Landlord
              </button>
            </div>
          </div>
        </div>
      </div>
      {showChat && (
        <ChatBox
          onClose={() => setShowChat(false)}
          landlordName={room.owner?.name || "Landlord"}
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  )
}

export default RoomDetail

