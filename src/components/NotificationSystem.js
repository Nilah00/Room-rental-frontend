"use client"

import { useState, useEffect } from "react"
import { Bell, Check, Clock, X, AlertCircle, Trash2 } from "lucide-react"
import { getUserNotifications, markNotificationAsRead, clearAllNotifications } from "../services/api"
import { useNavigate } from "react-router-dom"
import "./Notifications.css"

export default function Notifications({ onClose, isOpen }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [clearingAll, setClearingAll] = useState(false)
  const [error, setError] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const navigate = useNavigate()

  // Get current user from token when component mounts
  useEffect(() => {
    const getCurrentUser = () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) return null

        const payload = token.split(".")[1]
        if (!payload) return null

        const decodedPayload = JSON.parse(atob(payload))
        return {
          id: decodedPayload.id || decodedPayload.userId || decodedPayload.sub,
          email: decodedPayload.email,
          name: decodedPayload.name,
        }
      } catch (error) {
        console.error("Error getting user from token:", error)
        return null
      }
    }

    setCurrentUser(getCurrentUser())
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, currentUser])

  // Update the fetchNotifications function to log more details
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("Fetching notifications for user:", currentUser?.id)
      const data = await getUserNotifications()
      console.log("Received notifications:", data)
      setNotifications(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error fetching notifications:", err)
      setError("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId)
      // Update local state
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification._id === notificationId ? { ...notification, read: true } : notification,
        ),
      )
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  // Update the handleClearAllNotifications function
  const handleClearAllNotifications = async () => {
    try {
      setClearingAll(true)

      if (!currentUser?.id) {
        console.error("Cannot clear notifications: User not logged in")
        setError("You must be logged in to clear notifications")
        return
      }

      console.log("Clearing notifications for user:", currentUser.id)

      // Call the clearAllNotifications function from api.js
      const result = await clearAllNotifications()
      console.log("Notifications cleared result:", result)

      // Update UI immediately
      setNotifications([])

      // Dispatch event to update notification count in other components
      window.dispatchEvent(new CustomEvent("notificationsCleared"))
    } catch (error) {
      console.error("Error clearing all notifications:", error)
    } finally {
      setClearingAll(false)
    }
  }

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.read) {
      handleMarkAsRead(notification._id)
    }

    // Navigate based on notification type
    if (notification.type === "booking_request") {
      navigate(`/manage-bookings`)
    } else if (notification.type === "booking_status_update") {
      // Check if the booking was approved
      if (notification.status === "approved" || notification.message.includes("approved")) {
        // Navigate to the booking confirmation page with the booking ID
        navigate(
          `/booking-confirmation/${notification.bookingId || notification.entityId}?propertyId=${notification.propertyId}`,
        )
      } else {
        // For other status updates, navigate to the bookings page
        navigate(`/bookings`)
      }
    } else if (notification.type === "property_update" && notification.propertyId) {
      navigate(`/room/${notification.propertyId}`)
    }

    // Close notifications panel
    onClose()
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case "booking_request":
        return <Clock size={18} className="notification-icon booking" />
      case "booking_status_update":
        return <Check size={18} className="notification-icon status" />
      case "property_update":
        return <Bell size={18} className="notification-icon property" />
      default:
        return <Bell size={18} className="notification-icon" />
    }
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hr ago`
    if (diffDays < 7) return `${diffDays} day ago`

    return date.toLocaleDateString()
  }

  if (!isOpen) return null

  return (
    <div className="notifications-panel">
      <div className="notifications-header">
        <h3>Notifications {currentUser?.name ? `for ${currentUser.name}` : ""}</h3>
        <div className="notifications-actions">
          {notifications.length > 0 && (
            <button className="clear-all-button" onClick={handleClearAllNotifications} disabled={clearingAll}>
              <Trash2 size={16} />
              {clearingAll ? "Clearing..." : "Clear All"}
            </button>
          )}
          <button className="close-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="notifications-content">
        {loading ? (
          <div className="notifications-loading">Loading notifications...</div>
        ) : error ? (
          <div className="notifications-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <Bell size={24} />
            <p>No notifications yet</p>
          </div>
        ) : (
          <ul className="notifications-list">
            {notifications.map((notification) => (
              <li
                key={notification._id}
                className={`notification-item ${notification.read ? "read" : "unread"}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-content">
                  {getNotificationIcon(notification.type)}
                  <div className="notification-text">
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">{formatTimestamp(notification.createdAt)}</span>
                  </div>
                </div>
                {!notification.read && (
                  <button
                    className="mark-read-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMarkAsRead(notification._id)
                    }}
                  >
                    <Check size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

