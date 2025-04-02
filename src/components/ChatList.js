"use client"

import { useState, useEffect } from "react"
import { getUserChats, markMessagesAsRead } from "../services/api"
import { MessageCircle, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import "./ChatList.css"

function ChatList({ isOpen, onClose, currentUserId, onChatSelect }) {
  const [chats, setChats] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const [chatId, setChatId] = useState(null)
  const [deletedChats, setDeletedChats] = useState([])

  // Load deleted chats when component mounts
  useEffect(() => {
    try {
      const deletedChatsKey = `deleted_chats_${currentUserId}`
      const deletedChatsJson = localStorage.getItem(deletedChatsKey) || "[]"
      const userDeletedChats = JSON.parse(deletedChatsJson)
      setDeletedChats(userDeletedChats)
    } catch (e) {
      console.error("Error loading deleted chats:", e)
      setDeletedChats([])
    }
  }, [currentUserId])

  // Fetch chats when component mounts
  useEffect(() => {
    if (!isOpen) return

    const fetchChats = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const chatsData = await getUserChats()
        console.log("Fetched chats:", chatsData)

        // Filter out deleted chats
        const filteredChats = chatsData.filter((chat) => !deletedChats.includes(chat._id))
        setChats(filteredChats)
      } catch (err) {
        console.error("Error fetching chats:", err)
        setError("Failed to load chats. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchChats()

    // Reduce polling frequency to prevent flickering
    const intervalId = setInterval(fetchChats, 60000) // 60 seconds

    return () => {
      clearInterval(intervalId)
    }
  }, [isOpen, deletedChats])

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
          getUserChats().then((newChats) => {
            // Filter out deleted chats
            const filteredChats = newChats.filter((chat) => !deletedChats.includes(chat._id))
            setChats(filteredChats)
          })
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

    const handleChatNotification = (event) => {
      // Simply refresh the chat list without additional processing
      getUserChats().then((chatsData) => {
        // Filter out deleted chats
        const filteredChats = chatsData.filter((chat) => !deletedChats.includes(chat._id))
        setChats(filteredChats)
      })
    }

    window.addEventListener("newMessage", handleNewMessage)
    window.addEventListener("chatNotification", handleChatNotification)

    return () => {
      window.removeEventListener("newMessage", handleNewMessage)
      window.removeEventListener("chatNotification", handleChatNotification)
    }
  }, [deletedChats])

  // Add this effect to listen for chat cleared events
  useEffect(() => {
    const handleChatCleared = (event) => {
      const { chatId: clearedChatId } = event.detail

      // Update the chat list to show the chat with no messages
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat._id === clearedChatId) {
            // Return the chat with empty messages and reset unreadCount
            return {
              ...chat,
              messages: [],
              lastMessage: null,
              unreadCount: 0,
            }
          }
          return chat
        })
      })
    }

    window.addEventListener("chatCleared", handleChatCleared)

    return () => {
      window.removeEventListener("chatCleared", handleChatCleared)
    }
  }, [])

  // Add this effect to listen for chat deleted events
  useEffect(() => {
    const handleChatDeleted = (event) => {
      const { chatId: deletedChatId, userId } = event.detail

      // Only process if this is for the current user
      if (userId === currentUserId) {
        // Update the deleted chats list
        setDeletedChats((prev) => {
          if (!prev.includes(deletedChatId)) {
            return [...prev, deletedChatId]
          }
          return prev
        })

        // Remove the chat from the displayed list
        setChats((prevChats) => {
          return prevChats.filter((chat) => chat._id !== deletedChatId)
        })
      }
    }

    window.addEventListener("chatDeleted", handleChatDeleted)

    return () => {
      window.removeEventListener("chatDeleted", handleChatDeleted)
    }
  }, [currentUserId])

  // Handle chat selection
  const handleChatSelect = (chat) => {
    try {
      console.log("Chat item clicked:", chat._id)
      setChatId(chat._id)

      // Mark messages as read
      if (chat.unreadCount > 0) {
        markMessagesAsRead(chat._id)
          .then(() => console.log("Messages marked as read"))
          .catch((err) => console.error("Error marking messages as read:", err))
      }

      // Store the full chat data in localStorage before navigating
      try {
        const chatStorageKey = `chat_${chat._id}`
        localStorage.setItem(chatStorageKey, JSON.stringify(chat))
        console.log("Stored chat in localStorage before navigation:", chat)
      } catch (storageError) {
        console.error("Error storing chat in localStorage:", storageError)
      }

      // Navigate to messages page with the chat ID
      navigate(`/messages/${chat._id}`, {
        state: {
          otherParticipant: chat.otherParticipant,
          propertyId: chat.property?._id || chat.propertyId,
          propertyTitle: chat.property?.title || chat.propertyTitle || "Property Chat",
          fullChat: chat, // Pass the full chat data
        },
      })

      // Close the chat list
      if (onClose) {
        console.log("Closing chat list")
        onClose()
      }
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

  if (!isOpen) return null

  return (
    <div className="chat-list-container">
      <div className="chat-list-header">
        <h3>Messages</h3>
        <button onClick={onClose} className="close-btn">
          <X size={20} />
        </button>
      </div>

      {isLoading ? (
        <div className="chat-list-loading">Loading chats...</div>
      ) : error ? (
        <div className="chat-list-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      ) : chats.length === 0 ? (
        <div className="chat-list-empty">
          <MessageCircle size={48} />
          <p>No messages yet</p>
          <p className="chat-list-empty-subtitle">
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
                  <h4>
                    {chat.otherParticipant?.name ||
                      (chat.participants && chat.participants.find((p) => p._id !== currentUserId)?.name) ||
                      "Landlord"}
                  </h4>
                  <span className="chat-list-item-time">{formatDate(chat.updatedAt)}</span>
                </div>
                <p className="chat-list-item-property">
                  {chat.property?.title || chat.propertyTitle || "Property Chat"}
                </p>
                <p className={`chat-list-item-preview ${chat.unreadCount > 0 ? "font-bold" : ""}`}>
                  {chat.lastMessage && chat.lastMessage.content
                    ? chat.lastMessage.content
                    : chat.messages && chat.messages.length > 0
                      ? chat.messages[chat.messages.length - 1].content
                      : "No messages yet"}
                </p>
                {chat.unreadCount > 0 && <span className="chat-list-item-badge">{chat.unreadCount}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChatList

