import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { Home } from "lucide-react"
import { getPropertyById } from "../services/api"
import "./BookNow.css"

export default function BookNow() {
  const { id } = useParams()
  const [roomDetails, setRoomDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bookingData, setBookingData] = useState({
    name: "",
    email: "",
    phone: "",
    moveInDate: "",
    leaseDuration: "6",
    familyMembers: 1,
    message: "",
  })

  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        const data = await getPropertyById(id)
        setRoomDetails(data)
      } catch (error) {
        console.error("Error fetching room details:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRoomDetails()
  }, [id])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setBookingData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    alert("Booking details submitted successfully!")
    console.log("Booking Details:", bookingData)
  }

  if (loading) {
    return <div className="book-now-container">Loading...</div>
  }

  if (!roomDetails) {
    return <div className="book-now-container">Error: Room not found</div>
  }

  return (
    <div className="book-now-container">
      <div className="book-now-card">
        <header className="book-now-header">
          <h1 className="book-now-header-title">Booking for "{roomDetails.title}"</h1>
          <p className="book-now-header-subtitle">Complete your rental request</p>
          <Link to="/" className="book-now-back-button">
            <Home size={18} />
            Back to Home
          </Link>
        </header>
        <main className="book-now-content">
          <form onSubmit={handleSubmit} className="book-now-form">
            <h3 className="book-now-form-title">Booking Details</h3>

            <div className="book-now-form-group">
              <label htmlFor="name" className="book-now-label">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={bookingData.name}
                onChange={handleInputChange}
                className="book-now-input"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="book-now-form-group">
              <label htmlFor="email" className="book-now-label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={bookingData.email}
                onChange={handleInputChange}
                className="book-now-input"
                placeholder="Enter your email address"
                required
              />
            </div>

            <div className="book-now-form-group">
              <label htmlFor="phone" className="book-now-label">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={bookingData.phone}
                onChange={handleInputChange}
                className="book-now-input"
                placeholder="Enter your phone number"
                required
              />
            </div>

            <div className="book-now-form-group">
              <label htmlFor="moveInDate" className="book-now-label">
                Preferred Move-in Date
              </label>
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

            <div className="book-now-form-group">
              <label htmlFor="leaseDuration" className="book-now-label">
                Lease Duration (in months)
              </label>
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
              </select>
            </div>

            <div className="book-now-form-group">
              <label htmlFor="familyMembers" className="book-now-label">
                Number of Family Members
              </label>
              <input
                type="number"
                id="familyMembers"
                name="familyMembers"
                value={bookingData.familyMembers}
                onChange={handleInputChange}
                className="book-now-input"
                min="1"
                required
              />
            </div>

            <div className="book-now-form-group">
              <label htmlFor="message" className="book-now-label">
                Message to Landlord
              </label>
              <textarea
                id="message"
                name="message"
                value={bookingData.message}
                onChange={handleInputChange}
                className="book-now-input"
                rows="3"
                placeholder="Introduce yourself or ask any questions you have for the landlord."
              />
            </div>

            <button type="submit" className="book-now-submit-button">
              Submit Booking Request
            </button>
          </form>
        </main>
      </div>
    </div>
  )
}

