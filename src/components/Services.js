"use client"

import { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  HomeIcon,
  Search,
  ClipboardList,
  MessageCircle,
  BarChart2,
  Calendar,
  CreditCard,
  Bell,
  User,
} from "lucide-react"
import "./Services.css"
import { isAuthenticated, logout } from "../services/auth"
// Add this import for the Notifications component
import Notifications from "./NotificationSystem"

function Services() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [username, setUsername] = useState("")
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [isLandlord, setIsLandlord] = useState(false)
  const [showChatList, setShowChatList] = useState(false)

  const navigate = useNavigate()
  const notificationRef = useRef(null)
  const chatListRef = useRef(null)

  useEffect(() => {
    // Check if user is authenticated
    const authStatus = isAuthenticated(false)
    setIsLoggedIn(authStatus)

    if (authStatus) {
      // Get the user data
      const user = JSON.parse(localStorage.getItem("user"))
      if (user) {
        setUsername(user.name)
        setIsLandlord(user.role === "landlord" || user.isLandlord === true)
      }
    }
  }, [])

  const toggleChatList = () => {
    // Navigate to messages page
    navigate("/messages")
  }

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev)
    // Reset unread count when opening notifications
    if (!showNotifications) {
      setUnreadNotifications(0)
    }
  }

  const handleLogout = () => {
    logout(false)
    setIsLoggedIn(false)
    setUsername("")
    setIsLandlord(false)
  }

  return (
    <div className="services-page">
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
              {isLandlord && (
                <li>
                  <Link to="/manage-bookings" className="nav-link">
                    Booking Requests
                  </Link>
                </li>
              )}
            </ul>
            <div className="nav-actions">
              <div className="nav-icons">
                <div className="notification-icon-wrapper" ref={notificationRef}>
                  <button className="icon-link" onClick={toggleNotifications}>
                    <Bell size={20} />
                    {unreadNotifications > 0 && <span className="notification-badge">{unreadNotifications}</span>}
                  </button>
                  {showNotifications && (
                    <Notifications isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
                  )}
                </div>
                <div className="chat-icon-wrapper" ref={chatListRef}>
                  <button className="icon-link" onClick={toggleChatList}>
                    <MessageCircle size={20} />
                    {unreadMessages > 0 && <span className="notification-badge">{unreadMessages}</span>}
                  </button>
                </div>
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
                      <Link to="/bookings" className="dropdown-item">
                        My Bookings
                      </Link>
                      {isLandlord && (
                        <Link to="/manage-bookings" className="dropdown-item">
                          Booking Requests
                        </Link>
                      )}
                      <button onClick={handleLogout} className="dropdown-item logout-btn">
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

      <main className="services-content">
        <div className="container">
          <h1>Our Services</h1>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">
                <Search size={24} />
              </div>
              <h2>Room Search</h2>
              <p>
                Find your perfect room with our advanced search filters. Browse through a wide range of options tailored
                to your preferences.
              </p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <ClipboardList size={24} />
              </div>
              <h2>Property Listing</h2>
              <p>
                List your property easily and reach thousands of potential tenants. Our platform ensures maximum
                visibility for your listings.
              </p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <MessageCircle size={24} />
              </div>
              <h2>Tenant-Landlord Communication</h2>
              <p>
                Facilitate smooth communication between tenants and landlords through our integrated messaging system.
              </p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <BarChart2 size={24} />
              </div>
              <h2>Market Insights</h2>
              <p>
                Access valuable insights about the rental market in Nepal, including pricing trends and popular
                locations.
              </p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <Calendar size={24} />
              </div>
              <h2>Booking Management</h2>
              <p>
                Manage your bookings and appointments efficiently with our integrated calendar and notification system.
              </p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <CreditCard size={24} />
              </div>
              <h2>Secure Transactions</h2>
              <p>Enjoy peace of mind with our secure payment gateway for rent transactions and booking fees.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>RoomRental</h3>
              <p>Connecting rooms and people seamlessly across Nepal.</p>
            </div>
            <div className="footer-section">
              <h3>Quick Links</h3>
              <ul>
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li>
                  <Link to="/services">Services</Link>
                </li>
                <li>
                  <Link to="/about">About Us</Link>
                </li>
                <li>
                  <Link to="/add-property">List Your Property</Link>
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
    </div>
  )
}

export default Services
