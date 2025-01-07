import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Calendar, Users, MessageSquare, MapPin, CreditCard, Home, Wifi, Car, Droplet } from 'lucide-react'
import './BookNow.css'

// This function simulates fetching room details from an API
const fetchRoomDetails = async (id) => {
  // In a real application, this would be an API call
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return {
    id,
    title: 'Luxurious Ocean View Suite',
    price: 25000,
    image: '/placeholder.svg?height=300&width=400',
    furnished: true,
    location: 'Pokhara, Nepal',
    amenities: { parking: true, wifi: true, water: true, ac: true },
    videos: [
      { url: '/sample-video.mp4', description: 'Living Room Tour' },
      { url: '/sample-video2.mp4', description: 'Balcony View' },
    ],
  };
}

export default function BookNow() {
  const { id } = useParams()
  const [roomDetails, setRoomDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bookingData, setBookingData] = useState({
    moveInDate: '',
    leaseDuration: '6',
    familyMembers: 1,
    message: '',
    securityDeposit: 0,
  })

  const [showVideos, setShowVideos] = useState(false)

  useEffect(() => {
    const loadRoomDetails = async () => {
      try {
        const details = await fetchRoomDetails(id)
        setRoomDetails(details)
        setBookingData(prev => ({ ...prev, securityDeposit: details.price }))
      } catch (error) {
        console.error('Error fetching room details:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRoomDetails()
  }, [id])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setBookingData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Booking request submitted:', { roomId: id, ...bookingData })
    alert('Your rental request has been submitted. You will be redirected to eSewa for payment.')
    window.location.href = 'https://esewa.com.np/payment/placeholder'
  }

  const openMapDirections = () => {
    if (roomDetails) {
      const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(roomDetails.location)}`
      window.open(mapUrl, '_blank')
    }
  }

  if (loading) {
    return <div className="book-now-container">Loading...</div>
  }

  if (!roomDetails) {
    return <div className="book-now-container">Error loading room details.</div>
  }

  return (
    <div className="book-now-container">
      <div className="book-now-card">
        <header className="book-now-header">
          <h1 className="book-now-header-title">Request to Rent</h1>
          <p className="book-now-header-subtitle">Complete your rental request for {roomDetails.title}</p>
          <a href="/" className="book-now-back-button">
            <Home size={18} />
            Back to Home
          </a>
        </header>
        <main className="book-now-content">
          <section className="book-now-room-details">
            <div>
              <img src={roomDetails.image} alt={roomDetails.title} className="book-now-room-image" />
            </div>
            <div className="book-now-room-info">
              <h2 className="book-now-room-title">{roomDetails.title}</h2>
              <p className="book-now-room-price">Rs {roomDetails.price.toLocaleString()}/month</p>
              <p className="book-now-room-status">{roomDetails.furnished ? 'Furnished' : 'Unfurnished'}</p>
              <div className="book-now-location-info">
                <MapPin size={20} />
                <span className="book-now-location-text">{roomDetails.location}</span>
              </div>
              <button onClick={openMapDirections} className="book-now-button">
                Get Directions
              </button>
              <div className="book-now-amenities">
                <h3 className="book-now-amenities-title">Amenities</h3>
                <ul className="book-now-amenities-list">
                  {roomDetails.amenities.parking && (
                    <li className="book-now-amenity-item">
                      <Car size={20} />
                      Parking
                    </li>
                  )}
                  {roomDetails.amenities.wifi && (
                    <li className="book-now-amenity-item">
                      <Wifi size={20} />
                      WiFi
                    </li>
                  )}
                  {roomDetails.amenities.water && (
                    <li className="book-now-amenity-item">
                      <Droplet size={20} />
                      Water
                    </li>
                  )}
                  {roomDetails.amenities.ac && (
                    <li className="book-now-amenity-item">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3v2m0 14v2M4 7h2m12 0h2M4 17h2m12 0h2M3 11h18M3 13h18"/>
                      </svg>
                      AC
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </section>
          <section className="book-now-videos">
            <h3 className="book-now-videos-title">Room Videos</h3>
            <button 
              onClick={() => setShowVideos(!showVideos)} 
              className="book-now-button"
            >
              {showVideos ? 'Hide Videos' : 'Show Videos'}
            </button>
            {showVideos && (
              <div className="book-now-video-container">
                {roomDetails.videos && roomDetails.videos.map((video, index) => (
                  <div key={index} className="book-now-video-item">
                    <video controls style={{ width: '100%', height: 'auto' }}>
                      <source src={video.url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <p className="book-now-video-description">{video.description}</p>
                  </div>
                ))}
                {(!roomDetails.videos || roomDetails.videos.length === 0) && (
                  <p className="book-now-video-description">No videos available for this room.</p>
                )}
              </div>
            )}
          </section>
          <form onSubmit={handleSubmit} className="book-now-form">
            <div className="book-now-form-group">
              <label htmlFor="moveInDate" className="book-now-label">
                Preferred Move-in Date
              </label>
              <div className="book-now-input-wrapper">
                <Calendar className="book-now-icon" size={20} />
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
            </div>
            <div className="book-now-form-group">
              <label htmlFor="leaseDuration" className="book-now-label">
                Lease Duration
              </label>
              <div className="book-now-input-wrapper">
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
                  <option value="24">24 months</option>
                </select>
              </div>
            </div>
            <div className="book-now-form-group">
              <label htmlFor="familyMembers" className="book-now-label">
                Number of Family Members
              </label>
              <div className="book-now-input-wrapper">
                <Users className="book-now-icon" size={20} />
                <input
                  type="number"
                  id="familyMembers"
                  name="familyMembers"
                  min="1"
                  value={bookingData.familyMembers}
                  onChange={handleInputChange}
                  className="book-now-input"
                  required
                />
              </div>
            </div>
            <div className="book-now-form-group">
              <label htmlFor="message" className="book-now-label">
                Message to Landlord
              </label>
              <div className="book-now-input-wrapper">
                <MessageSquare className="book-now-icon" size={20} style={{ top: '12px' }} />
                <textarea
                  id="message"
                  name="message"
                  rows={3}
                  value={bookingData.message}
                  onChange={handleInputChange}
                  className="book-now-input"
                  placeholder="Introduce yourself and ask any questions you may have about the room or rental terms."
                />
              </div>
            </div>
            <div className="book-now-form-group">
              <label htmlFor="securityDeposit" className="book-now-label">
                Security Deposit (Rs)
              </label>
              <div className="book-now-input-wrapper">
                <CreditCard className="book-now-icon" size={20} />
                <input
                  type="number"
                  id="securityDeposit"
                  name="securityDeposit"
                  min="0"
                  value={bookingData.securityDeposit}
                  onChange={handleInputChange}
                  className="book-now-input"
                  required
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="book-now-submit-button"
            >
              Proceed to eSewa Payment
            </button>
          </form>
        </main>
      </div>
    </div>
  )
}

