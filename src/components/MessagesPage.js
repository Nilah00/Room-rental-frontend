"use client"

import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getUserChats, markMessagesAsRead } from "../services/api"
import { MessageCircle, ArrowLeft } from "lucide-react"
import ChatConversation from "./ChatConversation"
import messageStore from "../services/messageStore"
import "./MessagesPage.css"
import { Link } from "react-router-dom"

function MessagesPage() {
  const [chats, setChats] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { chatId } = useParams()
  const navigate = useNavigate()

  // Get current user ID from localStorage
  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return null

      const payload = token.split(".")[1]
      if (!payload) return null

      const decodedPayload = JSON.parse(atob(payload))
      return decodedPayload.userId || decodedPayload.id || decodedPayload.sub
    } catch (error) {
      console.error("Error getting user ID from token:", error)
      return null
    }
  }

  const currentUserId = getCurrentUserId()

  // Fetch chats when component mounts
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check if user is authenticated
        const token = localStorage.getItem("token")
        if (!token) {
          setError("Authentication required. Please log in to view your messages.")
          setIsLoading(false)
          return
        }

        console.log("Fetching chats with token:", token.substring(0, 10) + "...")
        const chatsData = await getUserChats()
        console.log("Fetched chats:", chatsData)

        if (!Array.isArray(chatsData)) {
          console.error("Expected array of chats but got:", chatsData)
          setChats([])
        } else {
          // For each chat, ensure its messages are in our message store
          chatsData.forEach((chat) => {
            if (chat.messages && chat.messages.length > 0) {
              chat.messages.forEach((message) => {
                messageStore.addMessage(chat._id, message)
              })
            }
          })

          setChats(chatsData)
        }

        // If no chat is selected but we have chats, select the first one
        if (!chatId && chatsData.length > 0) {
          navigate(`/messages/${chatsData[0]._id}`)
        }
      } catch (err) {
        console.error("Error fetching chats:", err)

        let errorMessage = "Failed to load chats. Please try again."

        // Extract more specific error message if available
        if (err.response && err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message
        } else if (err.message) {
          errorMessage = err.message
        }

        if (err.response && err.response.status === 403) {
          errorMessage = "You don't have permission to access your chats. Please check your login status."
        }

        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChats()

    // Set up interval to refresh chats
    const intervalId = setInterval(fetchChats, 60000) // 60 seconds

    return () => {
      clearInterval(intervalId)
    }
  }, [chatId, navigate])

  // Listen for new messages and chat notifications
  useEffect(() => {
    const handleNewMessage = (event) => {
      const { chatId } = event.detail

      // Update the chat list to show the new message
      setChats((prevChats) => {
        // Check if this chat exists in our list
        const chatExists = prevChats.some((chat) => chat._id === chatId)

        // If the chat doesn't exist in our list, fetch all chats
        if (!chatExists) {
          getUserChats().then((newChats) => setChats(newChats))
          return prevChats
        }

        return prevChats.map((chat) => {
          if (chat._id === chatId) {
            // If this is the chat that received a new message, update it
            return {
              ...chat,
              unreadCount: chat.unreadCount + 1,
              updatedAt: new Date(),
            }
          }
          return chat
        })
      })
    }

    const handleChatNotification = () => {
      // Simply refresh the chat list without additional processing
      getUserChats().then((chatsData) => setChats(chatsData))
    }

    window.addEventListener("newMessage", handleNewMessage)
    window.addEventListener("chatNotification", handleChatNotification)

    return () => {
      window.removeEventListener("newMessage", handleNewMessage)
      window.removeEventListener("chatNotification", handleChatNotification)
    }
  }, [])

  // Handle chat selection
  const handleChatSelect = (chat) => {
    try {
      console.log("Selecting chat:", chat)

      // Mark messages as read
      if (chat.unreadCount > 0) {
        markMessagesAsRead(chat._id)
          .then(() => console.log("Messages marked as read"))
          .catch((err) => console.error("Error marking messages as read:", err))
      }

      // Navigate to the selected chat
      navigate(`/messages/${chat._id}`)
    } catch (error) {
      console.error("Error selecting chat:", error)
      alert("Failed to open chat. Please try again.")
    }
  }

  // Format date for chat list
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      // Today - show time
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffDays === 1) {
      // Yesterday
      return "Yesterday"
    } else if (diffDays < 7) {
      // This week - show day name
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      // Older - show date
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  // Handle back button click
  const handleBack = () => {
    navigate("/")
  }

  if (error && error.includes("Authentication required")) {
    return (
      <div className="messages-page">
        <div className="auth-required">
          <h2>Authentication Required</h2>
          <p>{error}</p>
          <Link to="/login" className="login-button">
            Log In
          </Link>
          <button onClick={() => navigate("/")} className="back-button-large">
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="messages-page">
      <div className="messages-sidebar">
        <div className="messages-header">
          <button onClick={handleBack} className="back-button">
            <ArrowLeft size={20} />
          </button>
          <h2>Messages</h2>
        </div>

        {isLoading ? (
          <div className="messages-loading">Loading chats...</div>
        ) : error ? (
          <div className="messages-error">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="retry-button">
              Retry
            </button>
          </div>
        ) : chats.length === 0 ? (
          <div className="messages-empty">
            <MessageCircle size={48} />
            <p>No messages yet</p>
            <p className="messages-empty-subtitle">
              Start a conversation by clicking "Chat with landlord" on any property
            </p>
          </div>
        ) : (
          <div className="chat-list">
            {chats.map((chat) => (
              <div
                key={chat._id}
                className={`chat-list-item ${chat.unreadCount > 0 ? "unread" : ""} ${
                  chatId === chat._id ? "active" : ""
                }`}
                onClick={() => handleChatSelect(chat)}
                role="button"
                tabIndex={0}
              >
                <div className="user-avatar">
                  <div className="avatar-circle"></div>
                </div>
                <div className="chat-list-item-content">
                  <div className="chat-list-item-header">
                    <h4>{chat.otherParticipant?.name || "User"}</h4>
                    <span className="chat-list-item-time">{formatDate(chat.updatedAt)}</span>
                  </div>
                  <p className="chat-list-item-property">
                    {chat.property?.title || chat.propertyTitle || "Property Chat"}
                  </p>
                  <p className="chat-list-item-preview">
                    {chat.lastMessage && chat.lastMessage.content ? chat.lastMessage.content : "No messages yet"}
                  </p>
                  {chat.unreadCount > 0 && <span className="chat-list-item-badge">{chat.unreadCount}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="messages-content">
        {chatId ? (
          <ChatConversation
            chatId={chatId}
            currentUserId={currentUserId}
            chat={chats.find((chat) => chat._id === chatId)}
            key={chatId} // Add key to force re-render when chatId changes
          />
        ) : (
          <div className="no-chat-selected">
            <MessageCircle size={64} />
            <h3>Select a conversation</h3>
            <p>Choose a chat from the list to view messages</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessagesPage

