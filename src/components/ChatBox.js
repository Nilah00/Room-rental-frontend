"use client"

import { useState, useEffect, useRef } from "react"
import { X, Send, Check, CheckCheck } from "lucide-react"
import { Link } from "react-router-dom"
import { getChatByIdOrCreate, markMessagesAsRead, sendMessageApi } from "../services/api"
import { joinChatRoom, leaveChatRoom } from "../services/socket"
import messageStore from "../services/messageStore"
import "./ChatBox.css"

// Add this function to get the property title
const getChatTitle = (data) => {
  console.log("Getting chat title from:", data)

  // If propertyTitle is directly provided as a prop
  if (data && data.propertyTitle) {
    return data.propertyTitle
  }

  // If chatData has propertyTitle
  if (data && data.chatData && data.chatData.propertyTitle) {
    return data.chatData.propertyTitle
  }

  // If property object exists with title
  if (data && data.property && data.property.title) {
    return data.property.title
  }

  // If propertyId is an object with title (sometimes the case in MongoDB populated fields)
  if (data && data.propertyId && typeof data.propertyId === "object" && data.propertyId.title) {
    return data.propertyId.title
  }

  // Default fallback
  return "Property Chat"
}

// Add this function inside the ChatBox component or before it
const getOtherParticipantName = (chatData, currentUserId) => {
  if (!chatData || !currentUserId) return "User"

  console.log("Getting other participant name from:", chatData)

  // Try direct properties first
  if (chatData.otherParticipant && chatData.otherParticipant.name) {
    return chatData.otherParticipant.name
  }

  if (chatData.landlordName) {
    return chatData.landlordName
  }

  if (chatData.tenantName) {
    return chatData.tenantName
  }

  // Try to find the other participant in the participants array
  if (chatData.participants && Array.isArray(chatData.participants)) {
    const otherParticipant = chatData.participants.find((p) => (p._id || p.id) !== currentUserId)

    if (otherParticipant) {
      return otherParticipant.name || `User ${otherParticipant._id || otherParticipant.id}`
    }
  }

  // Try landlord or tenant objects
  if (chatData.landlord && currentUserId !== (chatData.landlord._id || chatData.landlord.id)) {
    return chatData.landlord.name || "Landlord"
  }

  if (chatData.tenant && currentUserId !== (chatData.tenant._id || chatData.tenant.id)) {
    return chatData.tenant.name || "Tenant"
  }

  // Try participantDetails array
  if (chatData.participantDetails && Array.isArray(chatData.participantDetails)) {
    const otherParticipant = chatData.participantDetails.find((p) => (p._id || p.id) !== currentUserId)

    if (otherParticipant) {
      return otherParticipant.name || `User ${otherParticipant._id || otherParticipant.id}`
    }
  }

  return "User"
}

function ChatBox({ onClose, landlordName, landlordId, propertyId, propertyTitle, isLoggedIn, currentUserId }) {
  const [message, setMessage] = useState("")
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chatId, setChatId] = useState(null)
  const messagesEndRef = useRef(null)
  const [isSending, setIsSending] = useState(false)
  const processedMessageIds = useRef(new Set()) // Track processed message IDs
  const [chatData, setChatData] = useState(null)

  // Fetch chat history when component mounts
  useEffect(() => {
    if (!isLoggedIn || !landlordId || !propertyId) {
      console.log("Missing required props:", { isLoggedIn, landlordId, propertyId })
      setIsLoading(false)
      return
    }

    const fetchChat = async () => {
      try {
        setIsLoading(true)
        setError(null)
        console.log("Fetching chat with:", { landlordId, propertyId, propertyTitle })

        const chatDataResponse = await getChatByIdOrCreate(propertyId, landlordId, propertyTitle)
        console.log("Chat data received:", chatDataResponse)

        if (!chatDataResponse || !chatDataResponse._id) {
          console.error("Invalid chat data received:", chatDataResponse)
          setError("Failed to create chat. Please try again.")
          setIsLoading(false)
          return
        }

        setChatId(chatDataResponse._id)
        setChatData(chatDataResponse)

        // Get messages from message store
        const storedMessages = messageStore.getMessages(chatDataResponse._id)

        if (storedMessages.length > 0) {
          console.log("Using messages from store:", storedMessages.length)
          setChatHistory(storedMessages)
        } else if (chatDataResponse.messages && chatDataResponse.messages.length > 0) {
          // If no messages in store but we have messages in the response, add them to store
          console.log("Adding messages to store:", chatDataResponse.messages.length)
          messageStore.addMessages(chatDataResponse._id, chatDataResponse.messages)
          setChatHistory(chatDataResponse.messages)
        } else {
          // If no messages, add a welcome message from the landlord
          console.log("No messages found, adding welcome message")
          const welcomeMessage = {
            sender: landlordId,
            content: `Hello! How can I help you with ${propertyTitle || "this property"}?`,
            timestamp: new Date(),
            _id: "welcome-message",
            status: "delivered",
            read: true,
          }

          messageStore.addMessage(chatDataResponse._id, welcomeMessage)
          setChatHistory([welcomeMessage])
        }

        // Mark messages as read and explicitly clear badge
        try {
          await markMessagesAsRead(chatDataResponse._id)
          console.log("Messages marked as read")

          // Force clear notification badges
          if (window.notificationBadges) {
            window.notificationBadges.clearBadgeCount(chatDataResponse._id)
          } else {
            try {
              // Try to import and use directly
              const notificationBadges = require("../services/notificationBadges").default
              notificationBadges.clearBadgeCount(chatDataResponse._id)
              notificationBadges.forceClearBadgeCount(chatDataResponse._id)
            } catch (err) {
              console.error("Failed to clear badge count:", err)
            }
          }

          // Dispatch events to update UI
          window.dispatchEvent(
            new CustomEvent("badgeCountUpdated", {
              detail: { chatId: chatDataResponse._id, count: 0 },
            }),
          )

          window.dispatchEvent(
            new CustomEvent("messagesRead", {
              detail: { chatId: chatDataResponse._id, userId: currentUserId },
            }),
          )
        } catch (markError) {
          console.error("Error marking messages as read:", markError)
        }

        // Join the chat room for real-time updates
        joinChatRoom(chatDataResponse._id)
        console.log("Joined chat room:", chatDataResponse._id)
      } catch (err) {
        console.error("Error fetching chat:", err)
        setError("Failed to load chat history. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchChat()

    // Clean up function to leave the chat room
    return () => {
      if (chatId) {
        console.log("Leaving chat room:", chatId)
        leaveChatRoom(chatId)
      }
    }
  }, [isLoggedIn, landlordId, propertyId, propertyTitle, currentUserId])

  // Listen for new messages
  useEffect(() => {
    const handleNewMessage = (event) => {
      console.log("New message event received:", event.detail)

      if (!event.detail) {
        console.error("Invalid message event:", event)
        return
      }

      const { chatId: receivedChatId, message: newMessage } = event.detail

      // Only update if the message is for this chat
      if (receivedChatId === chatId) {
        // Check if we've already processed this message
        const messageId = newMessage._id || newMessage.tempId

        if (messageId && !processedMessageIds.current.has(messageId)) {
          console.log("Processing new message:", messageId)
          processedMessageIds.current.add(messageId)

          // Add to message store
          messageStore.addMessage(chatId, newMessage)

          // Update chat history from store
          setChatHistory(messageStore.getMessages(chatId))

          // Mark message as read if it's not from the current user
          if (newMessage.sender !== currentUserId) {
            console.log("Marking message as read")
            markMessagesAsRead(chatId).catch((err) => console.error("Error marking message as read:", err))
          }
        } else {
          console.log("Duplicate message, ignoring:", messageId)
        }
      } else {
        console.log("Message is for a different chat:", receivedChatId)
      }
    }

    // Listen for message status updates
    const handleMessageStatus = (event) => {
      if (!event.detail) return

      const { chatId: statusChatId, messageId, status } = event.detail

      if (statusChatId === chatId && messageId) {
        console.log(`Updating message ${messageId} status to ${status}`)

        // Update message in store
        messageStore.updateMessage(chatId, messageId, { status })

        // Update chat history from store
        setChatHistory(messageStore.getMessages(chatId))
      }
    }

    // Listen for messages read event
    const handleMessagesRead = (event) => {
      if (!event.detail) return

      const { chatId: readChatId, userId: readByUserId } = event.detail

      if (readChatId === chatId && readByUserId !== currentUserId) {
        console.log("Messages marked as read by:", readByUserId)

        // Update all messages from current user as read
        messageStore.markAllAsRead(chatId, readByUserId)

        // Update chat history from store
        setChatHistory(messageStore.getMessages(chatId))
      }
    }

    console.log("Setting up message listeners for chatId:", chatId)
    window.addEventListener("newMessage", handleNewMessage)
    window.addEventListener("messageStatus", handleMessageStatus)
    window.addEventListener("messagesRead", handleMessagesRead)

    return () => {
      console.log("Removing message listeners")
      window.removeEventListener("newMessage", handleNewMessage)
      window.removeEventListener("messageStatus", handleMessageStatus)
      window.removeEventListener("messagesRead", handleMessagesRead)
    }
  }, [chatId, currentUserId])

  // Scroll to bottom when chat history changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory])

  const handleSendMessage = async (e) => {
    e.preventDefault()

    // Prevent multiple sends
    if (isSending) {
      console.log("Already sending a message, preventing duplicate")
      return
    }

    // Get the latest chatId from state to ensure we have the most current value
    const currentChatId = chatId

    if (!message.trim()) {
      console.log("Message is empty, not sending")
      return
    }

    if (!currentChatId) {
      console.error("Cannot send message: Chat ID is null or undefined")
      setError("Unable to send message. Please try refreshing the page.")
      return
    }

    console.log("Sending message to chatId:", currentChatId, "with content:", message.trim())

    // Set sending state to prevent duplicates
    setIsSending(true)

    // Store message content and clear input immediately
    const messageContent = message.trim()
    setMessage("")

    // Generate a unique ID for this message
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    try {
      // Send message
      await sendMessageApi(currentChatId, messageContent, tempId)
      console.log("Message sent successfully")

      // Update chat history from store
      setChatHistory(messageStore.getMessages(currentChatId))
    } catch (error) {
      console.error("Error sending message:", error)

      // Show error in UI
      setError("Failed to send message. Please try again.")
      setTimeout(() => setError(null), 3000)
    } finally {
      // Reset sending state
      setIsSending(false)
    }
  }

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Get message status icon
  const getMessageStatusIcon = (message) => {
    if (message.sender !== currentUserId) {
      return null // Don't show status for received messages
    }

    if (message.error) {
      return <span className="status-error">Failed</span>
    }

    if (message.pending) {
      return <span className="status-pending">Sending...</span>
    }

    if (message.read) {
      return <CheckCheck size={14} className="status-read" />
    }

    return <Check size={14} className="status-delivered" />
  }

  useEffect(() => {
    console.log("Current chatId:", chatId)
  }, [chatId])

  if (!isLoggedIn) {
    return (
      <div className="chat-box">
        <div className="chat-header">
          <h3>Chat with {landlordName || "Landlord"}</h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>
        <div className="chat-messages">
          <p>Please log in to chat with the landlord.</p>
          <Link to="/login" className="btn btn-primary">
            Log In
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="chat-box">
        <div className="chat-header">
          <h3>Chat with {landlordName || "Landlord"}</h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>
        <div className="chat-messages">
          <p>Loading chat history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="chat-box">
        <div className="chat-header">
          <h3>Chat with {landlordName || "Landlord"}</h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>
        <div className="chat-messages">
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-box">
      <div className="chat-header">
        <div className="chat-header-info">
          <h3 className="chat-title">{getChatTitle({ propertyTitle, chatData })}</h3>
          <p className="chat-participant">{getOtherParticipantName(chatData, currentUserId)}</p>
        </div>
        <button onClick={onClose} className="close-btn">
          <X size={20} />
        </button>
      </div>
      <div className="chat-messages">
        {chatHistory.map((chat, index) => (
          <div
            key={chat._id || chat.tempId || index}
            className={`message ${chat.sender === currentUserId ? "sent" : "received"} ${chat.pending ? "pending" : ""} ${chat.error ? "error" : ""}`}
          >
            <div className="message-content">{chat.content}</div>
            <div className="message-footer">
              <span className="message-time">{formatTime(chat.timestamp)}</span>
              <span className="message-status">{getMessageStatusIcon(chat)}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="chat-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isSending}
        />
        <button type="submit" disabled={!message.trim() || isSending}>
          <Send size={20} />
        </button>
      </form>
    </div>
  )
}

export default ChatBox
