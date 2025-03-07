"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import axios from "axios"
import { Heart, Eye, MessageCircle, Car, Wifi, Droplet, Bed, Bath, Snowflake, Search } from "lucide-react"
import ChatBox from "./ChatBox"
import { getImageUrl, handleImageError } from "./imageUtils"
import "./ViewAllRoom.css"

function ViewAllRooms() {
  const [rooms, setRooms] = useState([])
  const [favorites, setFavorites] = useState([])
  const [searchParams, setSearchParams] = useState({
    location: "",
    priceRange: "",
    furnished: "",
  })
  const [filteredRooms, setFilteredRooms] = useState([])
  const [showChat, setShowChat] = useState(false)
  const [currentLandlord, setCurrentLandlord] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const token = localStorage.getItem("token")
    setIsLoggedIn(!!token)
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
        (searchParams.furnished === "furnished" && room.furnished) ||
        (searchParams.furnished === "unfurnished" && !room.furnished)

      return matchesLocation && matchesPrice && matchesFurnished
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
      setRooms(response.data)
      setFilteredRooms(response.data)
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

  const handleChatWithLandlord = (landlordName) => {
    if (!isLoggedIn) {
      navigate("/login")
      return
    }
    setCurrentLandlord(landlordName)
    setShowChat(true)
  }

  if (isLoading) {
    return <div className="loading">Loading rooms...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
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
                  {room.amenities.includes("parking") && (
                    <div className="amenity">
                      <Car size={16} />
                      <span>Parking</span>
                    </div>
                  )}
                  {room.amenities.includes("wifi") && (
                    <div className="amenity">
                      <Wifi size={16} />
                      <span>WiFi</span>
                    </div>
                  )}
                  {room.amenities.includes("water") && (
                    <div className="amenity">
                      <Droplet size={16} />
                      <span>Water</span>
                    </div>
                  )}
                  {room.amenities.includes("ac") && (
                    <div className="amenity">
                      <Snowflake size={16} />
                      <span>AC</span>
                    </div>
                  )}
                </div>
                <div className="listing-actions">
                  <button className="btn btn-book" onClick={() => handleBookNow(room)}>
                    Book Now
                  </button>
                  <button
                    className="btn btn-chat"
                    onClick={() => handleChatWithLandlord(room.owner.name || "Landlord")}
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
        <ChatBox onClose={() => setShowChat(false)} landlordName={currentLandlord} isLoggedIn={isLoggedIn} />
      )}
    </div>
  )
}

export default ViewAllRooms

