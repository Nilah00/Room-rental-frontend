import { useState, useEffect, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { Heart, MessageCircle, MapPin } from "lucide-react"
import { getPropertyById, toggleFavorite } from "../services/api"
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
  const { id } = useParams()
  const navigate = useNavigate()

  // Memoize checkIfFavorite to prevent unnecessary re-renders
  const checkIfFavorite = useCallback((roomId) => {
    try {
      const storedFavorites = JSON.parse(localStorage.getItem("favorites") || "[]")
      return storedFavorites.some((fav) => fav._id === roomId)
    } catch (error) {
      console.error("Error checking favorites:", error)
      return false
    }
  }, [])

  // Memoize fetchRoomData to prevent unnecessary re-renders
  const fetchRoomData = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    setError(null)
    try {
      console.log("Fetching room data for id:", id)
      const roomData = await getPropertyById(id)
      console.log("Received room data:", roomData)
      setRoom(roomData)
      setIsFavorite(checkIfFavorite(id))
    } catch (err) {
      console.error("Error fetching room data:", err)
      setError("Failed to load room details. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [id, checkIfFavorite])

  useEffect(() => {
    const checkAuth = () => {
      const authStatus = isAuthenticated()
      setIsLoggedIn(authStatus)
    }

    checkAuth()
    fetchRoomData()
  }, [fetchRoomData]) // Only depend on fetchRoomData

  const handleToggleFavorite = async () => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }

    try {
      const result = await toggleFavorite(id)
      setIsFavorite(result.isFavorite)

      // Update local storage
      const storedFavorites = JSON.parse(localStorage.getItem("favorites") || "[]")
      if (result.isFavorite) {
        if (!storedFavorites.some((fav) => fav._id === id) && room) {
          storedFavorites.push(room)
          localStorage.setItem("favorites", JSON.stringify(storedFavorites))
        }
      } else {
        const updatedFavorites = storedFavorites.filter((fav) => fav._id !== id)
        localStorage.setItem("favorites", JSON.stringify(updatedFavorites))
      }
    } catch (err) {
      console.error("Error toggling favorite:", err)
      alert("Failed to update favorite status. Please try again.")
    }
  }

  const handleBookNow = () => {
    if (!isLoggedIn) {
      navigate("/login")
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
        <div className="room-detail-content">
          <div className="room-images">
            {room.images && room.images.length > 0 ? (
              room.images.map((image, index) => (
                <img
                  key={index}
                  src={getImageUrl(image) || "/placeholder.svg"}
                  alt={`${room.title} - Image ${index + 1}`}
                  className="room-image"
                  onError={handleImageError}
                />
              ))
            ) : (
              <img src="/placeholder.svg" alt="No image available" className="room-image" />
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
            </div>
            <p className="room-description">{room.description}</p>
            <div className="room-details">
              <p>Bedrooms: {room.bedrooms}</p>
              <p>Bathrooms: {room.bathrooms}</p>
            </div>
            <div className="room-actions">
              <button className="btn btn-primary" onClick={handleBookNow}>
                Book Now
              </button>
              <button className="btn btn-outline" onClick={handleChatWithLandlord}>
                <MessageCircle size={20} /> Chat with Landlord
              </button>
              <button
                className={`btn btn-icon ${isFavorite ? "btn-favorite-active" : "btn-favorite"}`}
                onClick={handleToggleFavorite}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart size={20} fill={isFavorite ? "red" : "none"} />
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

