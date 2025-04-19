"use client"

import { useState, useEffect } from "react"
import { Search, MessageSquare, User, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { getUserChats } from "../services/api"
import notificationBadges from "../services/notificationBadges"
import { initializeSocket } from "../services/socket"
import "./ChatList.css"

const ChatList = ({ onSelectChat, currentUserId }) => {
  const [chats, setChats] = useState([])
  const [filteredChats, setFilteredChats] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [badgeCounts, setBadgeCounts] = useState({})

  // Initialize socket and fetch chats when component mounts
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Initialize socket connection
        initializeSocket()

        // Fetch chats
        await fetchChats()
      } catch (error) {
        console.error("Error initializing chat:", error)
        setError("Failed to initialize chat. Please try again.")
      }
    }

    initializeChat()
  }, [])

  // Fetch chats from API
  const fetchChats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await getUserChats()
      console.log("Fetched chats:", response)

      if (!response || !Array.isArray(response)) {
        throw new Error("Invalid response format")
      }

      // Process chats
      const processedChats = response.map((chat) => {
        // Get unread count from notification badges
        const unreadCount = notificationBadges.getBadgeCount(chat._id)

        // Get the other participant(s)
        const otherParticipants = chat.participants?.filter((p) => p._id !== currentUserId) || []

        // Get the last message
        const lastMessage =
          chat.lastMessage ||
          (chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null)

        return {
          ...chat,
          unreadCount,
          otherParticipants,
          lastMessage,
        }
      })

      // Sort chats by last message timestamp (newest first)
      processedChats.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp || a.updatedAt || a.createdAt || 0
        const timeB = b.lastMessage?.timestamp || b.updatedAt || b.createdAt || 0
        return new Date(timeB) - new Date(timeA)
      })

      setChats(processedChats)
      setFilteredChats(processedChats)

      // Update badge counts
      const counts = {}
      processedChats.forEach((chat) => {
        counts[chat._id] = chat.unreadCount || 0
      })
      setBadgeCounts(counts)

      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching chats:", error)
      setError("Failed to load chats. Please try again.")
      setIsLoading(false)
    }
  }

  // Listen for badge count updates
  useEffect(() => {
    const handleBadgeCountUpdated = (event) => {
      if (!event.detail) return

      const { chatId, count } = event.detail
      if (!chatId) return

      setBadgeCounts((prev) => ({
        ...prev,
        [chatId]: count,
      }))

      // Update the unread count in the chats array
      setChats((prevChats) => prevChats.map((chat) => (chat._id === chatId ? { ...chat, unreadCount: count } : chat)))

      // Also update filtered chats
      setFilteredChats((prevChats) =>
        prevChats.map((chat) => (chat._id === chatId ? { ...chat, unreadCount: count } : chat)),
      )
    }

    window.addEventListener("badgeCountUpdated", handleBadgeCountUpdated)

    return () => {
      window.removeEventListener("badgeCountUpdated", handleBadgeCountUpdated)
    }
  }, [])

  // Listen for new messages to update chat list
  useEffect(() => {
    const handleNewMessage = (event) => {
      if (!event.detail) return

      const { chatId, message } = event.detail
      if (!chatId || !message) return

      // Update the chat with the new message
      setChats((prevChats) => {
        // Find the chat
        const chatIndex = prevChats.findIndex((c) => c._id === chatId)

        if (chatIndex === -1) {
          // If chat doesn't exist in our list, we should refresh the whole list
          fetchChats()
          return prevChats
        }

        // Create a copy of the chats array
        const updatedChats = [...prevChats]

        // Update the chat with the new message
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          lastMessage: message,
          updatedAt: new Date().toISOString(),
        }

        // If the message is from someone else, increment unread count
        if (message.sender !== currentUserId) {
          updatedChats[chatIndex].unreadCount = (updatedChats[chatIndex].unreadCount || 0) + 1
        }

        // Sort chats by last message timestamp (newest first)
        updatedChats.sort((a, b) => {
          const timeA = a.lastMessage?.timestamp || a.updatedAt || a.createdAt || 0
          const timeB = b.lastMessage?.timestamp || b.updatedAt || b.createdAt || 0
          return new Date(timeB) - new Date(timeA)
        })

        // Update filtered chats as well
        setFilteredChats(
          updatedChats.filter(
            (chat) =>
              searchTerm === "" ||
              chat.otherParticipants.some((p) => p.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
              chat.propertyTitle?.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
        )

        return updatedChats
      })
    }

    window.addEventListener("newMessage", handleNewMessage)

    return () => {
      window.removeEventListener("newMessage", handleNewMessage)
    }
  }, [currentUserId, searchTerm])

  // Handle search input change
  const handleSearchChange = (e) => {
    const term = e.target.value
    setSearchTerm(term)

    if (term === "") {
      setFilteredChats(chats)
    } else {
      const filtered = chats.filter(
        (chat) =>
          chat.otherParticipants.some((p) => p.name?.toLowerCase().includes(term.toLowerCase())) ||
          chat.propertyTitle?.toLowerCase().includes(term.toLowerCase()),
      )
      setFilteredChats(filtered)
    }
  }

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return ""

    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else {
      // If it's within the last 7 days, show the day name
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
      if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: "short" })
      } else {
        return date.toLocaleDateString([], { month: "short", day: "numeric" })
      }
    }
  }

  // Get message preview text
  const getMessagePreview = (message) => {
    if (!message) return "No messages yet"

    // If it's a system message, return it directly
    if (message.type === "system") {
      return message.content
    }

    // If it's from the current user, prepend "You: "
    if (message.sender === currentUserId) {
      return `You: ${message.content}`
    }

    // Otherwise, just return the content
    return message.content
  }

  // Handle chat selection
  const handleChatClick = (chat) => {
    // Clear badge count when selecting a chat
    notificationBadges.clearBadgeCount(chat._id)

    // Call the onSelectChat callback
    onSelectChat(chat)
  }

  if (isLoading) {
    return (
      <div className="chat-list">
        <div className="chat-list-header">
          <h2>Messages</h2>
        </div>
        <div className="chat-list-search">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search conversations..." disabled />
        </div>
        <div className="chat-list-loading">
          <div className="loading-spinner"></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="chat-list">
        <div className="chat-list-header">
          <h2>Messages</h2>
        </div>
        <div className="chat-list-error">
          <p>{error}</p>
          <button onClick={fetchChats} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h2>Messages</h2>
        <Link to="/messages/new" className="new-message-button">
          <MessageSquare size={20} />
        </Link>
      </div>

      <div className="chat-list-search">
        <Search size={18} className="search-icon" />
        <input type="text" placeholder="Search conversations..." value={searchTerm} onChange={handleSearchChange} />
      </div>

      {filteredChats.length === 0 ? (
        <div className="no-chats">
          {searchTerm ? (
            <p>No conversations matching "{searchTerm}"</p>
          ) : (
            <>
              <p>No conversations yet</p>
              <Link to="/messages/new" className="start-chat-button">
                Start a new conversation
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="chat-list-items">
          {filteredChats.map((chat) => {
            const unreadCount = badgeCounts[chat._id] || 0
            const otherParticipant = chat.otherParticipants[0] || {}
            const lastMessageTime = chat.lastMessage?.timestamp || chat.updatedAt || chat.createdAt

            return (
              <div
                key={chat._id}
                className={`chat-list-item ${unreadCount > 0 ? "unread" : ""}`}
                onClick={() => handleChatClick(chat)}
              >
                <div className="chat-list-item-avatar">
                  {otherParticipant.profileImage ? (
                    <img
                      src={otherParticipant.profileImage || "/placeholder.svg"}
                      alt={otherParticipant.name || "User"}
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = "/vibrant-street-market.png"
                      }}
                    />
                  ) : (
                    <div className="default-avatar">
                      <User size={20} />
                    </div>
                  )}
                </div>

                <div className="chat-list-item-content">
                  <div className="chat-list-item-header">
                    <h3 className="chat-list-item-name">
                      {chat.propertyTitle ? (
                        <span className="property-chat-title">
                          {otherParticipant.name || "User"}
                          <span className="property-title">{chat.propertyTitle}</span>
                        </span>
                      ) : (
                        otherParticipant.name || "User"
                      )}
                    </h3>
                    <span className="chat-list-item-time">{formatTime(lastMessageTime)}</span>
                  </div>

                  <p className={`chat-list-item-preview ${unreadCount > 0 ? "font-bold" : ""}`}>
                    {getMessagePreview(chat.lastMessage)}
                  </p>
                </div>

                {unreadCount > 0 && (
                  <div className="chat-list-item-badge">{unreadCount > 99 ? "99+" : unreadCount}</div>
                )}

                <ChevronRight size={16} className="chat-list-item-arrow" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ChatList
