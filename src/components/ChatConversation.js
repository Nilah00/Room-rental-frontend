"use client"

import { useState, useEffect, useRef } from "react"
import { Send } from "lucide-react"
import { joinChatRoom, leaveChatRoom } from "../services/socket"
import { getChatById, markMessagesAsRead, getCurrentUserId, sendMessageApi } from "../services/api"
import messageStore from "../services/messageStore"
import "./ChatConversation.css"

const ChatConversation = ({ chatId, currentUserId, chat: initialChat }) => {
  const [message, setMessage] = useState("")
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [chatData, setChatData] = useState(null)
  const messagesEndRef = useRef(null)
  const chatIdRef = useRef(chatId)

  // Update the ref whenever chatId changes
  useEffect(() => {
    chatIdRef.current = chatId
    console.log("chatId updated:", chatId)
  }, [chatId])

  // Listen for message store updates
  useEffect(() => {
    const handleMessageStoreUpdate = (event) => {
      const { chatId: updatedChatId, messages } = event.detail

      if (updatedChatId === chatId) {
        console.log("Message store updated for current chat:", messages)
        setChatHistory(messages)
      }
    }

    window.addEventListener("messageStoreUpdated", handleMessageStoreUpdate)

    return () => {
      window.removeEventListener("messageStoreUpdated", handleMessageStoreUpdate)
    }
  }, [chatId])

  // Fetch chat history when component mounts
  useEffect(() => {
    if (!chatId) {
      setError("Chat ID is missing")
      setIsLoading(false)
      return
    }

    // First, check if we have messages in the store
    const storedMessages = messageStore.getMessages(chatId)
    if (storedMessages.length > 0) {
      console.log("Using messages from store:", storedMessages)
      setChatHistory(storedMessages)
    }

    // If we already have initial chat data, use it
    if (initialChat) {
      console.log("Using initial chat data:", initialChat)
      setChatData(initialChat)

      // If the initial chat has messages, add them to our store
      if (initialChat.messages && initialChat.messages.length > 0) {
        initialChat.messages.forEach((msg) => {
          messageStore.addMessage(chatId, msg)
        })
      }

      // Set chat history from our store (which now includes any messages from initialChat)
      setChatHistory(messageStore.getMessages(chatId))
      setIsLoading(false)
      return
    }

    const fetchChatData = async () => {
      try {
        setIsLoading(true)
        console.log("Fetching chat data for ID:", chatId)

        // Join the chat room for real-time updates
        joinChatRoom(chatId)

        // Check if token exists
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("Authentication required. Please log in again.")
        }

        // Get current user ID for debugging
        const userId = getCurrentUserId()
        console.log("Current user ID:", userId)

        // Fetch chat data from API
        console.log("Making API call to get chat data")
        const chatData = await getChatById(chatId)
        console.log("Chat data received:", chatData)

        if (!chatData) {
          throw new Error("Failed to load chat data")
        }

        // Store the chat data
        setChatData(chatData)

        // Set chat history from our message store
        setChatHistory(messageStore.getMessages(chatId))

        // Mark messages as read
        try {
          await markMessagesAsRead(chatId)
          console.log("Messages marked as read")
        } catch (markError) {
          console.error("Error marking messages as read:", markError)
          // Continue even if marking as read fails
        }

        setIsLoading(false)
        setError(null)
      } catch (err) {
        console.error("Error fetching chat data:", err)

        // If we've tried less than 3 times, retry
        if (retryCount < 3) {
          console.log(`Retrying (${retryCount + 1}/3)...`)
          setRetryCount((prev) => prev + 1)
          setTimeout(fetchChatData, 1000) // Retry after 1 second
          return
        }

        setError("Failed to load chat. Please try again.")
        setIsLoading(false)
      }
    }

    console.log("Starting chat data fetch process")
    fetchChatData()

    // Clean up function
    return () => {
      console.log("Leaving chat room:", chatId)
      if (chatId) {
        leaveChatRoom(chatId)
      }
    }
  }, [chatId, initialChat, retryCount])

  // Listen for new messages
  useEffect(() => {
    const handleNewMessage = (event) => {
      if (!event.detail) return

      const { chatId: receivedChatId, message: newMessage } = event.detail

      // Only update if the message is for this chat
      if (receivedChatId === chatId) {
        // Add to message store
        messageStore.addMessage(chatId, newMessage)

        // Mark message as read if it's not from the current user
        if (newMessage.sender !== currentUserId) {
          markMessagesAsRead(chatId).catch((err) => console.error("Error marking message as read:", err))
        }
      }
    }

    window.addEventListener("newMessage", handleNewMessage)

    return () => {
      window.removeEventListener("newMessage", handleNewMessage)
    }
  }, [chatId, currentUserId])

  // Scroll to bottom when chat history changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory])

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!message.trim() || !chatId) return

    // Store message content and clear input
    const messageContent = message.trim()
    setMessage("")

    try {
      // Send message via API (which now handles adding to message store)
      console.log("Sending message via API:", messageContent)
      await sendMessageApi(chatId, messageContent)
      console.log("Message sent successfully")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleRetry = () => {
    setRetryCount(0)
    setError(null)
    setIsLoading(true)
  }

  // Get other participant name and property title
  const getOtherParticipantName = () => {
    if (initialChat?.otherParticipant?.name) {
      return initialChat.otherParticipant.name
    }

    if (chatData?.otherParticipant?.name) {
      return chatData.otherParticipant.name
    }

    return "User"
  }

  const getPropertyTitle = () => {
    if (initialChat?.property?.title) {
      return initialChat.property.title
    }

    if (initialChat?.propertyTitle) {
      return initialChat.propertyTitle
    }

    if (chatData?.property?.title) {
      return chatData.property.title
    }

    if (chatData?.propertyTitle) {
      return chatData.propertyTitle
    }

    return "Property Chat"
  }

  if (error) {
    return (
      <div className="chat-error">
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={handleRetry} className="retry-button">
            Retry
          </button>
          <button onClick={() => window.history.back()} className="back-button">
            Go Back
          </button>
        </div>
        <div className="error-help">
          <p>If you continue to experience issues, try these steps:</p>
          <ol>
            <li>Refresh the page</li>
            <li>Log out and log back in</li>
            <li>Clear your browser cache</li>
            <li>Try accessing from the main messages page</li>
          </ol>
        </div>
      </div>
    )
  }

  if (isLoading && chatHistory.length === 0) {
    return (
      <div className="chat-loading">
        <div className="loading-spinner"></div>
        <p>Loading chat...</p>
      </div>
    )
  }

  return (
    <div className="chat-conversation">
      <div className="chat-conversation-header">
        <div className="chat-user-info">
          <h3>{getOtherParticipantName()}</h3>
          <p className="property-title">{getPropertyTitle()}</p>
        </div>
      </div>

      <div className="chat-messages">
        {chatHistory.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
            <p className="start-conversation-hint">Type a message below to begin chatting.</p>
          </div>
        ) : (
          chatHistory.map((chat, index) => (
            <div
              key={chat._id || chat.tempId || index}
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

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          autoFocus
        />
        <button type="submit" disabled={!message.trim()}>
          <Send size={20} />
        </button>
      </form>
    </div>
  )
}

export default ChatConversation

