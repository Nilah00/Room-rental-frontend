"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import "./MessageNotification.css"

const MessageNotification = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Auto-hide notification after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade-out animation before removing
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  const handleClick = () => {
    if (notification.chatId) {
      navigate(`/messages/${notification.chatId}`)
    }
    onClose()
  }

  return (
    <div className={`message-notification ${isVisible ? "visible" : "hidden"}`}>
      <div className="message-notification-content" onClick={handleClick}>
        <div className="message-notification-avatar">
          <div className="avatar-circle"></div>
        </div>
        <div className="message-notification-text">
          <h4>{notification.sender || "User"}</h4>
          <p>{notification.content}</p>
        </div>
      </div>
      <button className="message-notification-close" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  )
}

export default MessageNotification

