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

  // CRITICAL FIX: Function to check if the last message is from the current user
  const isLastMessageFromCurrentUser = (chat) => {
    return chat && chat.lastMessage && chat.lastMessage.sender === currentUserId
  }

  // CRITICAL FIX: Function to check if a chat should show a badge
  const shouldShowBadge = (chat) => {
    // Never show badge if last message is from current user
    if (isLastMessageFromCurrentUser(chat)) {
      return false
    }
    // Only show badge if there are unread messages
    return chat.unreadCount > 0
  }

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

  // CRITICAL FIX: Add effect to clear badges for own messages
  useEffect(() => {
    // Function to clear badges for own messages
    const clearBadgesForOwnMessages = () => {
      setChats((prevChats) => {
        let updated = false
        const newChats = prevChats.map((chat) => {
          if (isLastMessageFromCurrentUser(chat) && chat.unreadCount > 0) {
            updated = true
            return { ...chat, unreadCount: 0 }
          }
          return chat
        })
        return updated ? newChats : prevChats
      })
    }

    // Run immediately
    clearBadgesForOwnMessages()

    // Set up interval to periodically check
    const intervalId = setInterval(clearBadgesForOwnMessages, 1000)

    return () => {
      clearInterval(intervalId)
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

        // CRITICAL FIX: Process chats to remove unread counts for chats where the last message is from the current user
        const processedChats = filteredChats.map((chat) => {
          if (isLastMessageFromCurrentUser(chat)) {
            return { ...chat, unreadCount: 0 }
          }
          return chat
        })

        setChats(processedChats)
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
  }, [isOpen, deletedChats, currentUserId])

  // Listen for new messages and chat notifications
  useEffect(() => {
    const handleNewMessage = (event) => {
      const { chatId, message } = event.detail

      // CRITICAL FIX: Don't increment unread count for messages sent by the current user
      if (message && message.sender === currentUserId) {
        console.log("Message was sent by current user, clearing unread count")

        // Update the chat list to clear unread count for this chat
        setChats((prevChats) => {
          return prevChats.map((chat) => {
            if (chat._id === chatId) {
              return {
                ...chat,
                unreadCount: 0,
                lastMessage: message,
                updatedAt: new Date(),
              }
            }
            return chat
          })
        })

        // Also update the chat in localStorage
        try {
          const chatKey = `chat_${chatId}`
          const chatJson = localStorage.getItem(chatKey)
          if (chatJson) {
            const chat = JSON.parse(chatJson)
            chat.unreadCount = 0
            chat.lastMessage = message
            localStorage.setItem(chatKey, JSON.stringify(chat))
          }
        } catch (e) {
          console.error("Error updating chat in localStorage:", e)
        }

        return
      }

      // Update the chat list to show the new message
      setChats((prevChats) => {
        // Check if this chat exists in our list
        const chatExists = prevChats.some((chat) => chat._id === chatId)

        // If the chat doesn't exist in our list, fetch all chats
        if (!chatExists) {
          getUserChats().then((newChats) => {
            // Filter out deleted chats
            const filteredChats = newChats.filter((chat) => !deletedChats.includes(chat._id))

            // Process chats to remove unread counts for chats where the last message is from the current user
            const processedChats = filteredChats.map((chat) => {
              if (isLastMessageFromCurrentUser(chat)) {
                return { ...chat, unreadCount: 0 }
              }
              return chat
            })

            setChats(processedChats)
          })
          return prevChats
        }

        return prevChats.map((chat) => {
          if (chat._id === chatId) {
            // If this is the chat that received a new message, update it
            return {
              ...chat,
              lastMessage: message,
              unreadCount: message.sender === currentUserId ? 0 : chat.unreadCount + 1,
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

        // Process chats to remove unread counts for chats where the last message is from the current user
        const processedChats = filteredChats.map((chat) => {
          if (isLastMessageFromCurrentUser(chat)) {
            return { ...chat, unreadCount: 0 }
          }
          return chat
        })

        setChats(processedChats)
      })
    }

    // CRITICAL FIX: Add handler for messagesRead events
    const handleMessagesRead = (event) => {
      if (!event.detail) return

      const { chatId: readChatId } = event.detail

      // Update the chat list to reflect read messages
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat._id === readChatId) {
            // Return the chat with unreadCount set to 0
            return {
              ...chat,
              unreadCount: 0,
            }
          }
          return chat
        })
      })
    }

    // CRITICAL FIX: Add handler for badge count updates
    const handleBadgeCountUpdated = (event) => {
      if (!event.detail) return

      const { chatId, count, senderId } = event.detail

      // If this is our own message, always set count to 0
      if (senderId === currentUserId) {
        setChats((prevChats) => {
          return prevChats.map((chat) => {
            if (chat._id === chatId) {
              return {
                ...chat,
                unreadCount: 0,
              }
            }
            return chat
          })
        })
        return
      }

      // Update the chat list with the new unread count
      if (chatId) {
        setChats((prevChats) => {
          return prevChats.map((chat) => {
            if (chat._id === chatId) {
              return {
                ...chat,
                unreadCount: count,
              }
            }
            return chat
          })
        })
      }
    }

    window.addEventListener("newMessage", handleNewMessage)
    window.addEventListener("chatNotification", handleChatNotification)
    window.addEventListener("messagesRead", handleMessagesRead)
    window.addEventListener("badgeCountUpdated", handleBadgeCountUpdated)

    return () => {
      window.removeEventListener("newMessage", handleNewMessage)
      window.removeEventListener("chatNotification", handleChatNotification)
      window.removeEventListener("messagesRead", handleMessagesRead)
      window.removeEventListener("badgeCountUpdated", handleBadgeCountUpdated)
    }
  }, [deletedChats, currentUserId])

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
          .then(() => {
            console.log("Messages marked as read")

            // Update the chat in the local state immediately
            setChats((prevChats) => prevChats.map((c) => (c._id === chat._id ? { ...c, unreadCount: 0 } : c)))

            // Dispatch an event to update other components
            window.dispatchEvent(
              new CustomEvent("messagesRead", {
                detail: { chatId: chat._id, userId: currentUserId },
              }),
            )
          })
          .catch((err) => console.error("Error marking messages as read:", err))
      }

      // Store the full chat data in localStorage before navigating
      try {
        const chatStorageKey = `chat_${chat._id}`
        localStorage.setItem(chatStorageKey, JSON.stringify({ ...chat, unreadCount: 0 }))
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
          fullChat: { ...chat, unreadCount: 0 }, // Pass the full chat data with unreadCount set to 0
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
          {chats.map((chat) => {
            // CRITICAL FIX: Check if last message is from current user
            const isOwnLastMessage = isLastMessageFromCurrentUser(chat)
            // CRITICAL FIX: Force unreadCount to 0 if last message is from current user
            const displayUnreadCount = isOwnLastMessage ? 0 : chat.unreadCount

            return (
              <div
                key={chat._id}
                className={`chat-list-item ${displayUnreadCount > 0 ? "unread" : ""} ${
                  chatId === chat._id ? "active" : ""
                }`}
                onClick={() => handleChatSelect(chat)}
                role="button"
                tabIndex={0}
                data-chat-id={chat._id}
                data-own-last-message={isOwnLastMessage ? "true" : "false"}
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
                  <p className={`chat-list-item-preview ${displayUnreadCount > 0 ? "font-bold" : ""}`}>
                    {chat.lastMessage && chat.lastMessage.content
                      ? chat.lastMessage.content
                      : chat.messages && chat.messages.length > 0
                        ? chat.messages[chat.messages.length - 1].content
                        : "No messages yet"}
                  </p>
                  {/* CRITICAL FIX: Only show badge if not own message and has unread count */}
                  {!isOwnLastMessage && displayUnreadCount > 0 && (
                    <span className="chat-list-item-badge">{displayUnreadCount}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ChatList
