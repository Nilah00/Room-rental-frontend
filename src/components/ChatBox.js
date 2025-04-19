"use client"

import { useState, useEffect, useRef } from "react"
import { X, Send } from "lucide-react"
import { Link } from "react-router-dom"
import { getChatByIdOrCreate, markMessagesAsRead, sendMessageApi } from "../services/api"
import { joinChatRoom, leaveChatRoom } from "../services/socket"
import "./ChatBox.css"

function ChatBox({ onClose, landlordName, landlordId, propertyId, propertyTitle, isLoggedIn, currentUserId }) {
  const [message, setMessage] = useState("")
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chatId, setChatId] = useState(null)
  const messagesEndRef = useRef(null)
  const [isSending, setIsSending] = useState(false)

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

        const chatData = await getChatByIdOrCreate(propertyId, landlordId, propertyTitle)
        console.log("Chat data received:", chatData)

        if (!chatData || !chatData._id) {
          console.error("Invalid chat data received:", chatData)
          setError("Failed to create chat. Please try again.")
          setIsLoading(false)
          return
        }

        setChatId(chatData._id)

        // If there are messages, set them in the state
        if (chatData.messages && chatData.messages.length > 0) {
          console.log("Setting chat history with", chatData.messages.length, "messages")
          setChatHistory(chatData.messages)
        } else {
          // If no messages, add a welcome message from the landlord
          console.log("No messages found, adding welcome message")
          setChatHistory([
            {
              sender: landlordId,
              content: `Hello! How can I help you today?`,
              timestamp: new Date(),
              _id: "welcome-message",
            },
          ])
        }

        // Mark messages as read
        try {
          await markMessagesAsRead(chatData._id)
          console.log("Messages marked as read")
        } catch (markError) {
          console.error("Error marking messages as read:", markError)
        }

        // Join the chat room for real-time updates
        joinChatRoom(chatData._id)
        console.log("Joined chat room:", chatData._id)
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
  }, [isLoggedIn, landlordId, propertyId, propertyTitle])

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
        console.log("Message is for current chat, updating history")
        setChatHistory((prev) => [...prev, newMessage])

        // Mark message as read if it's not from the current user
        if (newMessage.sender !== currentUserId) {
          console.log("Marking message as read")
          markMessagesAsRead(chatId).catch((err) => console.error("Error marking message as read:", err))
        }
      } else {
        console.log("Message is for a different chat:", receivedChatId)
      }
    }

    console.log("Setting up new message listener for chatId:", chatId)
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

    // Add message to local state immediately for UI responsiveness
    const newMessage = {
      sender: currentUserId,
      content: messageContent,
      timestamp: new Date(),
      _id: tempId,
      pending: true, // Mark as pending until confirmed by server
    }

    setChatHistory((prev) => [...prev, newMessage])

    try {
      // First try the API method as it's more reliable
      console.log("Sending message via API")
      const apiResponse = await sendMessageApi(currentChatId, messageContent, tempId)
      console.log("API message sent successfully:", apiResponse)

      // Update the message in chat history with the server response
      if (apiResponse && apiResponse.message) {
        setChatHistory((prev) =>
          prev.map((msg) => (msg._id === tempId ? { ...apiResponse.message, pending: false } : msg)),
        )
      } else {
        // Just mark as not pending if we got a response but no message data
        setChatHistory((prev) => prev.map((msg) => (msg._id === tempId ? { ...msg, pending: false } : msg)))
      }

      // Don't try to send via socket if API succeeded - this is causing duplicates
      // The API should trigger the appropriate socket events on the server
    } catch (error) {
      console.error("Error sending message:", error)

      // Show error state for the message
      setChatHistory((prev) => prev.map((msg) => (msg._id === tempId ? { ...msg, pending: false, error: true } : msg)))
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

  useEffect(() => {
    console.log("Current chatId:", chatId)
  }, [chatId])

  if (!isLoggedIn) {
    return (
      <div className="chat-box">
        <div className="chat-header">
          <h3>Chat with {landlordName}</h3>
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
          <h3>Chat with {landlordName}</h3>
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
          <h3>Chat with {landlordName}</h3>
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
        <h3>
          {propertyTitle ? (
            <>
              <span className="property-title">{propertyTitle}</span>
              <span className="landlord-name">with {landlordName}</span>
            </>
          ) : (
            <>Chat with {landlordName}</>
          )}
        </h3>
        <button onClick={onClose} className="close-btn">
          <X size={20} />
        </button>
      </div>
      <div className="chat-messages">
        {chatHistory.map((chat, index) => (
          <div
            key={chat._id || index}
            className={`message ${chat.sender === currentUserId ? "sent" : "received"} ${chat.pending ? "pending" : ""}`}
          >
            <div className="message-content">{chat.content}</div>
            <div className="message-time">{formatTime(chat.timestamp)}</div>
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
        />
        <button type="submit" disabled={!message.trim() || isSending}>
          <Send size={20} />
        </button>
      </form>
    </div>
  )
}

export default ChatBox
