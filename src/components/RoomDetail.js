"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { MessageCircle, MapPin, Badge, Eye, Bed, Bath, Wifi, Car, Droplet, Heart } from "lucide-react"
import { getProperties, getPropertyById } from "../services/api"
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
  const [relatedRooms, setRelatedRooms] = useState([])
  const [isLoadingRelated, setIsLoadingRelated] = useState(false)
  const [activeChatRoom, setActiveChatRoom] = useState(null)
  const { id } = useParams()
  const navigate = useNavigate()

  // Load favorites from localStorage
  const loadFavorites = useCallback(() => {
    const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || []
    setFavorites(storedFavorites)

    // Check if current room is in favorites
    const isCurrentRoomFavorite = storedFavorites.some((fav) => fav._id === id || fav.id === id)
    setIsFavorite(isCurrentRoomFavorite)
  }, [id])

  const fetchRoomData = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    setError(null)
    try {
      const roomData = await getPropertyById(id)
      setRoom(roomData)
    } catch (err) {
      console.error("Error fetching room data:", err)
      setError("Failed to load room details. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [id])

  // Fetch related rooms based on location
  const fetchRelatedRooms = useCallback(async () => {
    if (!room || !room.location) return

    try {
      setIsLoadingRelated(true)
      const response = await getProperties()

      if (response && response.data) {
        // Extract keywords from the current room's location
        // Split by common delimiters and filter out empty strings or very short words
        const locationKeywords = room.location
          .toLowerCase()
          .split(/[,\s-/]+/)
          .filter((keyword) => keyword.length > 2)
          .map((keyword) => keyword.trim())

        console.log("Location keywords:", locationKeywords)

        // Filter properties that match any of the keywords
        const related = response.data
          .filter((property) => {
            // Skip the current property
            if (property._id === room._id || property.id === room._id) return false

            // Skip properties without location
            if (!property.location) return false

            const propertyLocation = property.location.toLowerCase()

            // Check if any keyword is found in the property location
            return locationKeywords.some((keyword) => propertyLocation.includes(keyword))
          })
          .slice(0, 4) // Show up to 4 related properties

        setRelatedRooms(related)

        // If we don't have enough related properties by location keywords,
        // add some properties with similar price range
        if (related.length < 2 && room.price) {
          const priceRange = {
            min: room.price * 0.7, // 70% of current price
            max: room.price * 1.3, // 130% of current price
          }

          const similarPriceProperties = response.data
            .filter((property) => {
              // Skip properties already in related
              if (related.some((r) => r._id === property._id || r.id === property._id)) return false

              // Skip the current property
              if (property._id === room._id || property.id === room._id) return false

              // Check if price is within range
              return property.price >= priceRange.min && property.price <= priceRange.max
            })
            .slice(0, 4 - related.length) // Fill up to 4 total properties

          setRelatedRooms([...related, ...similarPriceProperties])
        }
      }
    } catch (err) {
      console.error("Error fetching related rooms:", err)
    } finally {
      setIsLoadingRelated(false)
    }
  }, [room])

  useEffect(() => {
    const checkAuth = () => {
      const authStatus = isAuthenticated()
      setIsLoggedIn(authStatus)
    }

    checkAuth()
    fetchRoomData()
    loadFavorites()

    // Listen for favorites updates from other components
    const handleFavoritesUpdate = () => {
      loadFavorites()
    }

    window.addEventListener("favoritesUpdated", handleFavoritesUpdate)

    return () => {
      window.removeEventListener("favoritesUpdated", handleFavoritesUpdate)
    }
  }, [fetchRoomData, loadFavorites])

  // Fetch related rooms when room data is loaded
  useEffect(() => {
    if (room) {
      fetchRelatedRooms()
    }
  }, [room, fetchRelatedRooms])

  const handleToggleFavorite = (e, roomToToggle) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }

    if (!isLoggedIn) {
      navigate("/login")
      return
    }

    const roomId = roomToToggle?._id || roomToToggle?.id || id
    const roomData = roomToToggle || room

    // Get current favorites from localStorage
    const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || []

    // Check if this room is already in favorites
    const isAlreadyFavorite = storedFavorites.some((fav) => fav._id === roomId || fav.id === roomId)

    let updatedFavorites

    if (isAlreadyFavorite) {
      // Remove from favorites
      updatedFavorites = storedFavorites.filter((fav) => fav._id !== roomId && fav.id !== roomId)
    } else {
      // Add to favorites
      updatedFavorites = [...storedFavorites, roomData]
    }

    // Update localStorage
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites))

    // Update state
    setFavorites(updatedFavorites)

    // If this is the main room, update isFavorite state
    if (roomId === id) {
      setIsFavorite(!isAlreadyFavorite)
    }

    // Notify other components about the change
    window.dispatchEvent(new CustomEvent("favoritesUpdated"))
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

  const handleChatWithLandlord = (relatedRoom = null) => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }

    if (relatedRoom) {
      setActiveChatRoom(relatedRoom)
    } else {
      setActiveChatRoom(null)
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

  // Handle viewing a related room
  const handleViewRelatedRoom = (roomId) => {
    navigate(`/room/${roomId}`)
    // Scroll to top when navigating to a new room
    window.scrollTo(0, 0)
  }

  // Check if a room is in favorites
  const isRoomFavorite = (roomId) => {
    return favorites.some((fav) => fav._id === roomId || fav.id === roomId)
  }

  const handleBookRelatedRoom = (relatedRoom) => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }

    // Check if room is available for booking
    if (
      relatedRoom.status === "Booked" ||
      relatedRoom.status === "Not Available" ||
      relatedRoom.status === "Maintenance"
    ) {
      alert(`This property is currently ${relatedRoom.status.toLowerCase()} and cannot be booked.`)
      return
    }

    navigate(`/booknow/${relatedRoom._id || relatedRoom.id}`, { state: { roomDetails: relatedRoom } })
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
              <button className="btn btn-outline" onClick={() => handleChatWithLandlord()}>
                <MessageCircle size={20} /> Chat with Landlord
              </button>
            </div>
          </div>
        </div>

        {/* Similar Properties Section */}
        {relatedRooms.length > 0 && (
          <div className="related-rooms-section">
            <h2>Similar Properties You Might Like</h2>
            <div className="listings-grid">
              {relatedRooms.map((relatedRoom) => (
                <div key={relatedRoom._id || relatedRoom.id} className="listing-card">
                  <div className="listing-image-container">
                    <img
                      src={getImageUrl(relatedRoom.images?.[0]) || "/placeholder.svg"}
                      alt={relatedRoom.title}
                      className="listing-image"
                      onError={handleImageError}
                    />
                    <div className="listing-overlay">
                      <button
                        className="related-room-view-button"
                        onClick={() => handleViewRelatedRoom(relatedRoom._id || relatedRoom.id)}
                      >
                        <Eye size={16} /> View
                      </button>
                    </div>
                  </div>
                  <div className="listing-details">
                    <h3>{relatedRoom.title}</h3>

                    <div
                      className={`availability-badge ${
                        relatedRoom.status ? relatedRoom.status.toLowerCase().replace(/\s+/g, "-") : "available"
                      }`}
                    >
                      <Badge size={12} />
                      <span>{relatedRoom.status || "Available"}</span>
                    </div>

                    <p className="listing-location">
                      <MapPin size={16} /> {relatedRoom.location}
                    </p>

                    <p className="listing-price">Rs {relatedRoom.price?.toLocaleString()}/month</p>

                    <p className="furnished-status">{relatedRoom.furnished ? "Furnished" : "Unfurnished"}</p>
                    <p className="relevance-indicator">
                      {relatedRoom.location
                        .toLowerCase()
                        .includes(room.location.toLowerCase().split(",")[0].trim().toLowerCase())
                        ? "Same area"
                        : "Similar price range"}
                    </p>

                    <div className="amenities">
                      <div className="amenity">
                        <Bed size={16} /> {relatedRoom.bedrooms || 1} bed
                      </div>
                      <div className="amenity">
                        <Bath size={16} /> {relatedRoom.bathrooms || 1} bath
                      </div>

                      {relatedRoom.amenities && relatedRoom.amenities.includes("WiFi") && (
                        <div className="amenity">
                          <Wifi size={16} /> WiFi
                        </div>
                      )}

                      {relatedRoom.amenities && relatedRoom.amenities.includes("Parking") && (
                        <div className="amenity">
                          <Car size={16} /> Parking
                        </div>
                      )}

                      {relatedRoom.amenities && relatedRoom.amenities.includes("Water") && (
                        <div className="amenity">
                          <Droplet size={16} /> Water
                        </div>
                      )}
                    </div>

                    <div className="listing-actions">
                      <button
                        className="btn-book"
                        onClick={() => handleBookRelatedRoom(relatedRoom)}
                        disabled={
                          relatedRoom.status === "Booked" ||
                          relatedRoom.status === "Not Available" ||
                          relatedRoom.status === "Maintenance"
                        }
                      >
                        {relatedRoom.status === "Available" || !relatedRoom.status ? "Book Now" : relatedRoom.status}
                      </button>
                      <button className="btn-chat" onClick={() => handleChatWithLandlord(relatedRoom)}>
                        <MessageCircle size={16} /> Chat with landlord
                      </button>
                      <button
                        className={`btn-favorite ${isRoomFavorite(relatedRoom._id || relatedRoom.id) ? "btn-favorite-active" : ""}`}
                        onClick={(e) => handleToggleFavorite(e, relatedRoom)}
                        aria-label={
                          isRoomFavorite(relatedRoom._id || relatedRoom.id)
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                      >
                        <Heart
                          size={20}
                          fill={isRoomFavorite(relatedRoom._id || relatedRoom.id) ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showChat && (
        <ChatBox
          onClose={() => setShowChat(false)}
          landlordName={activeChatRoom?.owner?.name || room.owner?.name || "Landlord"}
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  )
}

export default RoomDetail

