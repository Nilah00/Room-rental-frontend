"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Check, CheckCheck } from "lucide-react"
import { joinChatRoom, leaveChatRoom, sendMessage, markMessagesAsRead, getCurrentUserId } from "../services/socket"
import { getChatById, sendMessageApi } from "../services/api"
import messageStore from "../services/messageStore"
import notificationBadges from "../services/notificationBadges"
import "./ChatConversation.css"

const ChatConversation = ({ chatId, currentUserId: propCurrentUserId, chat: initialChat }) => {
  const [message, setMessage] = useState("")
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [chatData, setChatData] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef(null)
  const chatIdRef = useRef(chatId)
  const currentUserId = propCurrentUserId || getCurrentUserId()
  const processedMessageIds = useRef(new Set()) // Track processed message IDs
  const messageIds = useRef(new Set()) // Track message IDs to prevent duplicates
  const contentMap = useRef(new Map()) // Track message content to prevent duplicates
  const isInitialMount = useRef(true)

  // Update the ref whenever chatId changes
  useEffect(() => {
    chatIdRef.current = chatId
    console.log("chatId updated:", chatId)

    // Reset tracking sets when chat changes
    processedMessageIds.current = new Set()
    messageIds.current = new Set()
    contentMap.current = new Map()

    // Clear notification badge for this chat
    if (chatId) {
      notificationBadges.clearBadgeCount(chatId)
      console.log("Cleared notification badge for chat:", chatId)

      // Dispatch an event to update the UI immediately
      window.dispatchEvent(
        new CustomEvent("messagesRead", {
          detail: { chatId, userId: currentUserId },
        }),
      )
    }
  }, [chatId, currentUserId])

  // Listen for message store updates
  useEffect(() => {
    const handleMessageStoreUpdate = (event) => {
      const { chatId: updatedChatId, messages } = event.detail

      if (updatedChatId === chatId) {
        console.log("Message store updated for current chat:", messages.length)

        // Deduplicate messages before setting state
        const uniqueMessages = deduplicateMessages(messages)
        setChatHistory(uniqueMessages)
      }
    }

    window.addEventListener("messageStoreUpdated", handleMessageStoreUpdate)

    return () => {
      window.removeEventListener("messageStoreUpdated", handleMessageStoreUpdate)
    }
  }, [chatId])

  // Force reload from localStorage on initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false

      // Force reload from localStorage to ensure we have the latest data
      messageStore.reloadFromLocalStorage()

      // Set up a periodic check to reload from localStorage
      const intervalId = setInterval(() => {
        messageStore.reloadFromLocalStorage()
      }, 5000) // Check every 5 seconds

      return () => clearInterval(intervalId)
    }
  }, [])

  // Function to deduplicate messages
  const deduplicateMessages = (messages) => {
    if (!messages || messages.length === 0) return []

    // Reset tracking maps
    const seenContent = new Map()
    const seenIds = new Set()
    const uniqueMessages = []

    // First pass: collect all non-pending messages by content
    messages.forEach((msg) => {
      if (!msg) return

      const content = msg.content
      const id = msg._id || msg.tempId

      if (!msg.pending && content) {
        seenContent.set(content, msg)
      }

      if (id) {
        seenIds.add(id)
      }
    })

    // Second pass: add messages ensuring no duplicates
    messages.forEach((msg) => {
      if (!msg) return

      const content = msg.content
      const id = msg._id || msg.tempId

      // Skip if we've already added this ID
      if (id && uniqueMessages.some((m) => m._id === id || m.tempId === id)) {
        return
      }

      // If this is a pending message and we have a non-pending version with same content, skip it
      if (msg.pending && content && seenContent.has(content) && seenContent.get(content) !== msg) {
        return
      }

      // Add the message
      uniqueMessages.push(msg)
    })

    // Sort by timestamp
    uniqueMessages.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime()
      const timeB = new Date(b.timestamp || 0).getTime()
      return timeA - timeB
    })

    return uniqueMessages
  }

  // Fetch chat history when component mounts
  useEffect(() => {
    if (!chatId) {
      setError("Chat ID is missing")
      setIsLoading(false)
      return
    }

    // Reset message tracking when loading a new chat
    messageIds.current = new Set()
    contentMap.current = new Map()

    const fetchChatData = async () => {
      try {
        setIsLoading(true)
        console.log("Fetching chat data for ID:", chatId)

        // Clear notification badge immediately when opening a chat
        notificationBadges.clearBadgeCount(chatId)
        console.log("Cleared notification badge for chat:", chatId)

        // Dispatch an event to update the UI immediately
        window.dispatchEvent(
          new CustomEvent("messagesRead", {
            detail: { chatId, userId: currentUserId },
          }),
        )

        // Join the chat room for real-time updates
        joinChatRoom(chatId)

        // First, check if we have messages in the store
        const storedMessages = messageStore.getMessages(chatId)
        if (storedMessages.length > 0) {
          console.log("Using messages from store:", storedMessages.length)

          // Deduplicate messages before setting state
          const uniqueMessages = deduplicateMessages(storedMessages)
          setChatHistory(uniqueMessages)
          setIsLoading(false)
        }

        // If we already have initial chat data, use it
        if (initialChat) {
          console.log("Using initial chat data:", initialChat)
          setChatData(initialChat)

          // If the initial chat has messages, add them to our store
          if (initialChat.messages && initialChat.messages.length > 0) {
            console.log("Adding messages from initial chat to store:", initialChat.messages.length)
            messageStore.addMessages(chatId, initialChat.messages)
          }

          // Set chat history from our store (which now includes any messages from initialChat)
          const messages = messageStore.getMessages(chatId)
          const uniqueMessages = deduplicateMessages(messages)
          setChatHistory(uniqueMessages)
          setIsLoading(false)
        }

        // Always fetch chat data from API to ensure we have the latest
        console.log("Making API call to get chat data")
        const chatData = await getChatById(chatId)
        console.log("Chat data received:", chatData)

        if (!chatData) {
          throw new Error("Failed to load chat data")
        }

        // Store the chat data
        setChatData(chatData)

        
        if (chatData.messages && chatData.messages.length > 0) {
          console.log("Adding messages from API to store:", chatData.messages.length)
          messageStore.addMessages(chatId, chatData.messages)

          // Update chat history from our store
          const messages = messageStore.getMessages(chatId)
          const uniqueMessages = deduplicateMessages(messages)
          setChatHistory(uniqueMessages)
        }

        setIsLoading(false)

        // Mark messages as read
        try {
          await markMessagesAsRead(chatId)
          console.log("Messages marked as read")

          // Update read status in message store
          messageStore.markAllAsRead(chatId, currentUserId)

          // Clear notification badge again to be sure
          notificationBadges.clearBadgeCount(chatId)

          // Dispatch an event to update the UI immediately
          window.dispatchEvent(
            new CustomEvent("messagesRead", {
              detail: { chatId, userId: currentUserId },
            }),
          )
        } catch (markError) {
          console.error("Error marking messages as read:", markError)
          // Continue even if marking as read fails

        
          notificationBadges.clearBadgeCount(chatId)

          // Still update the message store
          messageStore.markAllAsRead(chatId, currentUserId)

          // Still dispatch the event
          window.dispatchEvent(
            new CustomEvent("messagesRead", {
              detail: { chatId, userId: currentUserId },
            }),
          )
        }

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

        // If we still have messages in the store, show them even if API failed
        const storedMessages = messageStore.getMessages(chatId)
        if (storedMessages.length > 0) {
          console.log("Using stored messages despite API error:", storedMessages.length)
          const uniqueMessages = deduplicateMessages(storedMessages)
          setChatHistory(uniqueMessages)
          setIsLoading(false)
          setError(null)
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
  }, [chatId, initialChat, retryCount, currentUserId])

  // Listen for new messages
  useEffect(() => {
    const handleNewMessage = (event) => {
      if (!event.detail) return

      const { chatId: receivedChatId, message: newMessage } = event.detail

      // Only update if the message is for this chat
      if (receivedChatId === chatId) {
        console.log("New message received for current chat:", newMessage)

        // Mark message as read if it's not from the current user
        if (newMessage.sender !== currentUserId) {
          try {
            // Wrap in try/catch and ensure we're calling a function that returns a Promise
            const markReadPromise = Promise.resolve(markMessagesAsRead(chatId))
            markReadPromise.catch((err) => {
              console.error("Error marking message as read:", err)
            })

            // Update read status in message store
            const msgId = newMessage._id || newMessage.tempId
            if (msgId) {
              messageStore.updateMessage(chatId, msgId, { read: true })
            }

            // Clear notification badge for this chat
            notificationBadges.clearBadgeCount(chatId)

            // Dispatch an event to update the UI immediately
            window.dispatchEvent(
              new CustomEvent("messagesRead", {
                detail: { chatId, userId: currentUserId },
              }),
            )
          } catch (err) {
            console.error("Error in markMessagesAsRead:", err)
          }
        }

        // Update chat history with deduplicated messages
        const messages = messageStore.getMessages(chatId)
        const uniqueMessages = deduplicateMessages(messages)
        setChatHistory(uniqueMessages)
      }
    }

    // Listen for messages read event
    const handleMessagesRead = (event) => {
      if (!event.detail) return

      const { chatId: readChatId, userId: readByUserId } = event.detail

      if (readChatId === chatId && readByUserId !== currentUserId) {
        console.log("Messages marked as read by:", readByUserId)

        // Update read status in message store
        messageStore.markAllAsRead(chatId, readByUserId)

        // Update chat history with deduplicated messages
        const messages = messageStore.getMessages(chatId)
        const uniqueMessages = deduplicateMessages(messages)
        setChatHistory(uniqueMessages)
      }
    }

    console.log("Setting up new message listener for chatId:", chatId)
    window.addEventListener("newMessage", handleNewMessage)
    window.addEventListener("messagesRead", handleMessagesRead)

    return () => {
      window.removeEventListener("newMessage", handleNewMessage)
      window.removeEventListener("messagesRead", handleMessagesRead)
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

  // Add this useEffect to handle authentication errors
  useEffect(() => {
    const handleAuthError = (event) => {
      console.log("Auth error event received:", event.detail)
      setError(event.detail.message || "Authentication error. Please log in again.")

      // Optionally redirect to login page after a delay
      setTimeout(() => {
        window.location.href = "/login?expired=true"
      }, 3000)
    }

    window.addEventListener("authError", handleAuthError)

    return () => {
      window.removeEventListener("authError", handleAuthError)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!message.trim() || !chatId || isSending) return

    // Store message content and clear input
    const messageContent = message.trim()
    setMessage("")
    setIsSending(true)

    // Generate a unique ID for this message to prevent duplicates
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    try {
      // Send message via socket directly for real-time delivery
      console.log("Sending message via socket:", messageContent)
      await sendMessage(chatId, messageContent, tempId)
      console.log("Message sent successfully via socket")
      setIsSending(false)
    } catch (error) {
      console.error("Error sending message via socket:", error)
      setIsSending(false)

      // Check if it's an auth error
      if (
        error.message &&
        (error.message.includes("Authentication") || error.message.includes("token") || error.message.includes("auth"))
      ) {
        setError("Authentication error. Please log in again.")

        // Dispatch auth error event
        window.dispatchEvent(
          new CustomEvent("authError", {
            detail: { message: "Your session has expired. Please log in again." },
          }),
        )

        return
      }

      // If socket fails, try API as fallback
      try {
        console.log("Trying API fallback for sending message")
        await sendMessageApi(chatId, messageContent, tempId)
        console.log("Message sent successfully via API fallback")
      } catch (apiError) {
        console.error("API fallback also failed:", apiError)

        // Check if it's an auth error
        if (
          apiError.message &&
          (apiError.message.includes("Authentication") ||
            apiError.message.includes("token") ||
            apiError.message.includes("auth"))
        ) {
          setError("Authentication error. Please log in again.")

          // Dispatch auth error event
          window.dispatchEvent(
            new CustomEvent("authError", {
              detail: { message: "Your session has expired. Please log in again." },
            }),
          )

          return
        }

        // Show general error to user
        setError("Failed to send message. Please try again.")
        setTimeout(() => setError(null), 3000)
      }
    }
  }

  const handleRetry = () => {
    setRetryCount(0)
    setError(null)
    setIsLoading(true)

    // Force reload from localStorage
    messageStore.reloadFromLocalStorage()
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

  // Get message status (sent, delivered, read)
  const getMessageStatus = (message) => {
    if (message.sender !== currentUserId) {
      return null 
    }

    if (message.error) {
      return "error"
    }

    if (message.pending) {
      return "pending"
    }

    if (message.read) {
      return "read"
    }

    return "delivered"
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
              <div className="message-footer">
                <span className="message-time">{formatTime(chat.timestamp)}</span>
                {chat.sender === currentUserId && (
                  <span className="message-status">
                    {chat.pending && <span className="status-pending">Sending...</span>}
                    {chat.error && <span className="status-error">Failed</span>}
                    {!chat.pending && !chat.error && !chat.read && <Check size={14} className="status-delivered" />}
                    {!chat.pending && !chat.error && chat.read && <CheckCheck size={14} className="status-read" />}
                  </span>
                )}
              </div>
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
          disabled={isSending}
        />
        <button type="submit" disabled={!message.trim() || isSending}>
          <Send size={20} />
        </button>
      </form>
    </div>
  )
}

export default ChatConversation