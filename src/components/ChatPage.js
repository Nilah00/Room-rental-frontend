"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useLocation, useNavigate } from "react-router-dom"
import { getChatById, markMessagesAsRead, sendMessageApi } from "../services/api"
import { joinChatRoom, leaveChatRoom } from "../services/socket"
import { ArrowLeft, Send } from "lucide-react"
import "./ChatPage.css"

function ChatPage() {
  console.log("ChatPage component rendering")
  const { chatId } = useParams()
  console.log("Chat ID from URL params:", chatId)
  const location = useLocation()
  console.log("Location state:", location.state)
  const navigate = useNavigate()

  // Get data from location state or set defaults
  const otherParticipant = location.state?.otherParticipant || { name: "User" }
  const propertyId = location.state?.propertyId
  const propertyTitle = location.state?.propertyTitle || "Property Chat"

  const [message, setMessage] = useState("")
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const chatIdRef = useRef(chatId)

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

  // Log component mount and props
  useEffect(() => {
    console.log("ChatPage mounted with chatId:", chatId)
    console.log("Location state:", location.state)
  }, [chatId, location.state])

  // Fetch chat data when component mounts
  useEffect(() => {
    if (!chatId) {
      console.error("Chat ID is missing")
      setError("Chat ID is missing")
      setIsLoading(false)
      return
    }

    chatIdRef.current = chatId

    const fetchChatData = async () => {
      try {
        setIsLoading(true)
        console.log("Attempting to fetch chat data for ID:", chatId)

        // Join the chat room for real-time updates
        joinChatRoom(chatId)

        // Fetch chat data
        console.log("Making API call to get chat data")
        const chatData = await getChatById(chatId)
        console.log("Chat data received:", chatData)

        if (!chatData) {
          throw new Error("Failed to load chat data")
        }

        // Set chat history
        if (chatData.messages && chatData.messages.length > 0) {
          console.log("Setting chat history with", chatData.messages.length, "messages")
          setChatHistory(chatData.messages)
        } else {
          console.log("No messages found in chat data")
        }

        // Mark messages as read
        await markMessagesAsRead(chatId)
        console.log("Messages marked as read")

        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching chat data:", err)
        setError(`Failed to load chat: ${err.message}`)
        setIsLoading(false)
      }
    }

    console.log("Starting chat data fetch process")
    fetchChatData()

    // Clean up function
    return () => {
      console.log("Leaving chat room:", chatId)
      leaveChatRoom(chatId)
    }
  }, [chatId])

  // Listen for new messages
  useEffect(() => {
    const handleNewMessage = (event) => {
      console.log("New message event received:", event.detail)

      if (!event.detail) return

      const { chatId: receivedChatId, message: newMessage } = event.detail

      // Only update if the message is for this chat
      if (receivedChatId === chatId) {
        console.log("Adding new message to chat history")
        setChatHistory((prev) => [...prev, newMessage])

        // Mark message as read if it's not from the current user
        if (newMessage.sender !== currentUserId) {
          markMessagesAsRead(chatId).catch((err) => console.error("Error marking message as read:", err))
        }
      }
    }

    console.log("Setting up new message listener")
    window.addEventListener("newMessage", handleNewMessage)

    return () => {
      console.log("Removing new message listener")
      window.removeEventListener("newMessage", handleNewMessage)
    }
  }, [chatId, currentUserId])

  // Scroll to bottom when chat history changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory])

  const handleSendMessage = async (e) => {
    e.preventDefault()

    if (!message.trim() || !chatId) {
      console.log("Message is empty or chatId is missing")
      return
    }

    // Store message content and clear input
    const messageContent = message.trim()
    setMessage("")

    // Create temporary message for UI
    const tempId = `temp-${Date.now()}`
    const newMessage = {
      sender: currentUserId,
      content: messageContent,
      timestamp: new Date(),
      _id: tempId,
      pending: true,
    }

    // Add to chat history
    setChatHistory((prev) => [...prev, newMessage])

    try {
      // Send message via API
      console.log("Sending message via API:", messageContent)
      const apiResponse = await sendMessageApi(chatId, messageContent)
      console.log("Message sent successfully:", apiResponse)

      // Update message in chat history
      if (apiResponse && apiResponse.message) {
        setChatHistory((prev) =>
          prev.map((msg) => (msg._id === tempId ? { ...apiResponse.message, pending: false } : msg)),
        )
      } else {
        setChatHistory((prev) => prev.map((msg) => (msg._id === tempId ? { ...msg, pending: false } : msg)))
      }
    } catch (error) {
      console.error("Error sending message:", error)

      // Show error state for the message
      setChatHistory((prev) => prev.map((msg) => (msg._id === tempId ? { ...msg, pending: false, error: true } : msg)))
    }
  }

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Handle back button click
  const handleBack = () => {
    navigate(-1)
  }

  if (isLoading) {
    return (
      <div className="chat-page">
        <div className="chat-page-loading">
          <div className="loading-spinner"></div>
          <p>Loading chat...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="chat-page">
        <div className="chat-page-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
          <button onClick={handleBack} className="back-button">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-page">
      <div className="chat-page-header">
        <button onClick={handleBack} className="back-button">
          <ArrowLeft size={20} />
        </button>
        <div className="chat-page-header-info">
          <h2>{otherParticipant.name}</h2>
          <p className="property-title">{propertyTitle}</p>
        </div>
      </div>

      <div className="chat-page-messages">
        {chatHistory.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          chatHistory.map((chat, index) => (
            <div
              key={chat._id || index}
              className={`message ${chat.sender === currentUserId ? "sent" : "received"} ${chat.pending ? "pending" : ""} ${chat.error ? "error" : ""}`}
            >
              <div className="message-content">{chat.content}</div>
              <div className="message-time">{formatTime(chat.timestamp)}</div>
              {chat.error && <div className="message-error">Failed to send</div>}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-page-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button type="submit" disabled={!message.trim()}>
          <Send size={20} />
        </button>
      </form>
    </div>
  )
}

export default ChatPage

