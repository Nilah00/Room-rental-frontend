// services/socket.js

import { io } from "socket.io-client"
import messageStore from "./messageStore"
import tabSync from "../components/tab-sync"
import { refreshToken } from "./api" // Import refreshToken function
import notificationBadges from "./notificationBadges" // Import notification badges

const FORCE_CLEAR_OWN_MESSAGE_BADGES = true

let socket
let socketInitialized = false
const joinedRooms = new Set()
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const sentMessages = new Map() // Track sent messages by tempId

// Initialize socket connection
const initializeSocket = (forceRefresh = false) => {
  if (socketInitialized && socket && socket.connected && !forceRefresh) {
    console.log("Socket already initialized and connected:", socket.id)
    return socket
  }

  console.log("Initializing socket connection")

  // Initialize tab sync
  tabSync.initTabSync()

  // Get token from localStorage
  const token = localStorage.getItem("token")
  if (!token) {
    console.log("No token found, cannot initialize socket")
    return null
  }

  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"
  console.log("Socket URL:", SOCKET_URL)

  // Close existing socket if it exists
  if (socket) {
    console.log("Closing existing socket connection")
    socket.close()
  }

  // Create new socket connection with auth token
  console.log("Creating new socket connection with token")
  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ["websocket", "polling"], // Try both transports
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000,
  })

  // Socket event handlers
  socket.on("connect", () => {
    console.log("Socket connected successfully:", socket.id)
    socketInitialized = true
    reconnectAttempts = 0 // Reset reconnect attempts on successful connection

    // Rejoin all previously joined rooms after reconnection
    joinedRooms.forEach((chatId) => {
      console.log(`Rejoining chat room after reconnection: ${chatId}`)
      socket.emit("join_chat", chatId)
    })

    // Dispatch an event that socket is connected
    window.dispatchEvent(new Event("socketConnected"))
  })

  socket.on("connect_error", async (error) => {
    console.error("Socket connection error:", error)
    socketInitialized = false

    // Check if the error is due to authentication
    if (
      error.message &&
      (error.message.includes("Authentication error") ||
        error.message.includes("Invalid token") ||
        error.message.includes("jwt expired"))
    ) {
      console.log("Authentication error detected, attempting to refresh token")

      // Only attempt to refresh token if we haven't tried too many times
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++

        try {
          // Try to refresh the token
          const newToken = await refreshToken()
          console.log("Token refreshed successfully, reconnecting socket")

          // Reinitialize socket with new token
          setTimeout(() => initializeSocket(true), 1000)
        } catch (refreshError) {
          console.error("Failed to refresh token:", refreshError)

          // Dispatch authentication error event
          window.dispatchEvent(
            new CustomEvent("authError", {
              detail: { message: "Your session has expired. Please log in again." },
            }),
          )
        }
      } else {
        console.error("Max reconnect attempts reached, redirecting to login")
        // Dispatch authentication error event
        window.dispatchEvent(
          new CustomEvent("authError", {
            detail: { message: "Authentication failed. Please log in again." },
          }),
        )
      }
    }
  })

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason)
    socketInitialized = false

    // Attempt to reconnect if disconnected for certain reasons
    if (reason === "io server disconnect" || reason === "transport close") {
      console.log("Attempting to reconnect socket")
      socket.connect()
    }
  })

  // Listen for new messages
  socket.on("receive_message", (data) => {
    console.log("New message received via socket:", data)

    if (data && data.chatId && data.message) {
      try {
        // Check if this is a response to a message we sent
        const tempId = data.message.tempId || (data.message.metadata && data.message.metadata.tempId)
        const currentUserId = getCurrentUserId()

        if (tempId && sentMessages.has(tempId)) {
          console.log("Received confirmation for sent message with tempId:", tempId)
          const { chatId } = sentMessages.get(tempId)

          // Update the temporary message with the real message data
          messageStore.updateMessage(chatId, tempId, {
            ...data.message,
            pending: false,
            tempId: tempId, // Keep the tempId for reference
          })

          // Remove from sent messages
          sentMessages.delete(tempId)

          // CRITICAL FIX: Clear any notification badge for our own message
          notificationBadges.clearBadgeCount(data.chatId)
          console.log("Cleared notification badge for our own message confirmation:", data.chatId)

          // Dispatch event to update UI immediately
          window.dispatchEvent(
            new CustomEvent("messagesRead", {
              detail: { chatId: data.chatId, userId: currentUserId },
            }),
          )
        } else {
          // This is a new message from someone else, add it to store
          messageStore.addMessage(data.chatId, data.message)

          // Check if the message is from another user and we're not in the chat room
          if (data.message.sender !== currentUserId && !joinedRooms.has(data.chatId)) {
            // Increment the notification badge for this chat
            notificationBadges.incrementBadgeCount(data.chatId, data.message.sender)
            console.log("Incremented notification badge for chat:", data.chatId)
          } else if (data.message.sender === currentUserId) {
            // CRITICAL FIX: If this is our own message, make sure we don't have a badge for this chat
            notificationBadges.clearBadgeCount(data.chatId)
            console.log("Cleared notification badge for our own message in chat:", data.chatId)

            // CRITICAL FIX: Update any chat in localStorage to clear unread count
            try {
              const chatStorageKey = `chat_${data.chatId}`
              const chatJson = localStorage.getItem(chatStorageKey)
              if (chatJson) {
                const chat = JSON.parse(chatJson)
                chat.unreadCount = 0
                chat.lastMessage = data.message
                localStorage.setItem(chatStorageKey, JSON.stringify(chat))
                console.log("Updated chat in localStorage to clear unread count")
              }
            } catch (e) {
              console.error("Error updating chat in localStorage:", e)
            }

            // Dispatch event to update UI immediately
            window.dispatchEvent(
              new CustomEvent("messagesRead", {
                detail: { chatId: data.chatId, userId: currentUserId },
              }),
            )
          }
        }

        // Dispatch custom event to notify components
        window.dispatchEvent(
          new CustomEvent("newMessage", {
            detail: data,
          }),
        )

        // Sync with other tabs
        tabSync.sendCrossTabs("new_message", data)
      } catch (error) {
        console.error("Error handling received message:", error)
      }
    }
  })

  // Listen for chat notifications (when user is not in the chat room)
  socket.on("chat_notification", (data) => {
    console.log("Chat notification received:", data)

    try {
      // If this is a new message notification, check if it's from the current user
      if (data.type === "new_message" && data.chatId && !joinedRooms.has(data.chatId)) {
        const currentUserId = getCurrentUserId()

        // Only increment badge if the message is not from the current user
        if (data.message && data.message.sender !== currentUserId) {
          notificationBadges.incrementBadgeCount(data.chatId, data.message.sender)
          console.log("Incremented notification badge for chat from notification:", data.chatId)
        } else {
          // CRITICAL FIX: Clear badge for our own messages
          notificationBadges.clearBadgeCount(data.chatId)
          console.log("Cleared notification badge for our own message notification:", data.chatId)
        }
      }

      // Dispatch custom event for notifications
      window.dispatchEvent(
        new CustomEvent("chatNotification", {
          detail: data,
        }),
      )
    } catch (error) {
      console.error("Error handling chat notification:", error)
    }
  })

  // Listen for typing indicators
  socket.on("user_typing", (data) => {
    console.log("User typing:", data)

    try {
      window.dispatchEvent(
        new CustomEvent("userTyping", {
          detail: data,
        }),
      )
    } catch (error) {
      console.error("Error handling typing indicator:", error)
    }
  })

  // Listen for stop typing indicators
  socket.on("user_stop_typing", (data) => {
    console.log("User stopped typing:", data)

    try {
      window.dispatchEvent(
        new CustomEvent("userStopTyping", {
          detail: data,
        }),
      )
    } catch (error) {
      console.error("Error handling stop typing indicator:", error)
    }
  })

  // Listen for read receipts
  socket.on("messages_read", (data) => {
    console.log("Messages marked as read:", data)

    try {
      // Clear notification badge for this chat
      if (data.chatId) {
        notificationBadges.clearBadgeCount(data.chatId)
        console.log("Cleared notification badge for chat from read receipt:", data.chatId)
      }

      // Update read status in message store
      if (data.chatId && data.userId) {
        messageStore.markAllAsRead(data.chatId, data.userId)
      }

      window.dispatchEvent(
        new CustomEvent("messagesRead", {
          detail: data,
        }),
      )
    } catch (error) {
      console.error("Error handling messages read event:", error)
    }
  })

  // Listen for booking updates
  socket.on("booking_update", (data) => {
    console.log("Booking update received:", data)

    try {
      window.dispatchEvent(
        new CustomEvent("bookingUpdate", {
          detail: data,
        }),
      )
    } catch (error) {
      console.error("Error handling booking update:", error)
    }
  })

  // Listen for general notifications
  socket.on("notification", (data) => {
    console.log("Notification received:", data)

    try {
      window.dispatchEvent(
        new CustomEvent("notification", {
          detail: data,
        }),
      )
    } catch (error) {
      console.error("Error handling notification:", error)
    }
  })

  // Listen for errors
  socket.on("error", (error) => {
    console.error("Socket error:", error)

    try {
      window.dispatchEvent(
        new CustomEvent("socketError", {
          detail: error,
        }),
      )
    } catch (eventError) {
      console.error("Error dispatching socket error event:", eventError)
    }
  })

  return socket
}

// Join a specific chat room
const joinChatRoom = (chatId) => {
  if (!chatId) return

  // Add to joined rooms set
  joinedRooms.add(chatId)

  // Clear notification badge when joining a chat room
  notificationBadges.clearBadgeCount(chatId)
  console.log("Cleared notification badge when joining chat room:", chatId)

  // Dispatch an event to update the UI immediately
  window.dispatchEvent(
    new CustomEvent("messagesRead", {
      detail: { chatId, userId: getCurrentUserId() },
    }),
  )

  if (!socket || !socket.connected) {
    console.log("Socket not connected, initializing...")
    socket = initializeSocket()

    // If socket initialization failed, return
    if (!socket) {
      console.error("Failed to initialize socket")
      return
    }

    // If socket is still connecting, wait for connection
    if (!socket.connected) {
      console.log("Socket connecting, will join room when connected")
      return
    }
  }

  console.log(`Joining chat room: ${chatId}`)
  socket.emit("join_chat", chatId)

  // Notify other tabs that this chat was opened
  tabSync.sendCrossTabs("chat_opened", { chatId })

  // Request chat history from other tabs
  tabSync.requestChatHistory(chatId)
}

// Leave a specific chat room
const leaveChatRoom = (chatId) => {
  if (!chatId) return

  // Remove from joined rooms set
  joinedRooms.delete(chatId)

  if (socket && socket.connected) {
    console.log(`Leaving chat room: ${chatId}`)
    socket.emit("leave_chat", chatId)
  }
}

// Mark messages as read
const markMessagesAsRead = (chatId) => {
  // Return a Promise that resolves immediately if no chatId or socket
  if (!chatId) {
    console.log("Cannot mark messages as read: chatId missing")
    return Promise.resolve({ success: false, reason: "ChatId missing" })
  }

  try {
    console.log(`Marking messages as read for chat: ${chatId}`)

    // Clear notification badge immediately
    notificationBadges.clearBadgeCount(chatId)
    console.log("Cleared notification badge when marking messages as read:", chatId)

    // Update read status in message store immediately
    const currentUserId = getCurrentUserId()
    messageStore.markAllAsRead(chatId, currentUserId)

    // If socket is connected, send to server
    if (socket && socket.connected) {
      // Make sure we're using the correct event name and sending both chatId and userId
      socket.emit("mark_read", { chatId, userId: currentUserId })
    } else {
      // If socket is not connected, try to initialize it
      const newSocket = initializeSocket()
      if (newSocket && newSocket.connected) {
        newSocket.emit("mark_read", { chatId, userId: currentUserId })
      }
    }

    // Sync with other tabs
    tabSync.sendCrossTabs("message_read", { chatId, userId: currentUserId })

    // Dispatch event to update UI immediately
    window.dispatchEvent(
      new CustomEvent("messagesRead", {
        detail: { chatId, userId: currentUserId },
      }),
    )

    return Promise.resolve({ success: true })
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error)

    // Still try to update UI even if there's an error
    window.dispatchEvent(
      new CustomEvent("messagesRead", {
        detail: { chatId, userId: getCurrentUserId() },
      }),
    )

    return Promise.reject(error)
  }
}

// Update the sendMessage function to accept a tempId parameter
const sendMessage = (chatId, content, tempId = null) => {
  if (!chatId || !content) {
    console.error("Chat ID and content are required")
    return Promise.reject(new Error("Chat ID and content are required"))
  }

  // Use provided tempId or generate a new one
  const messageId = tempId || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  const currentUserId = getCurrentUserId()

  // Create a temporary message for immediate display
  const tempMessage = {
    _id: messageId,
    tempId: messageId,
    sender: currentUserId,
    content,
    timestamp: new Date(),
    pending: true,
  }

  // Add to message store for immediate display
  messageStore.addMessage(chatId, tempMessage)

  // CRITICAL FIX: Always clear notification badge when sending a message
  notificationBadges.clearBadgeCount(chatId)
  console.log("Cleared notification badge when sending message to chat:", chatId)

  // CRITICAL FIX: Update any chat in localStorage to clear unread count
  try {
    const chatStorageKey = `chat_${chatId}`
    const chatJson = localStorage.getItem(chatStorageKey)
    if (chatJson) {
      const chat = JSON.parse(chatJson)
      chat.unreadCount = 0
      chat.lastMessage = tempMessage
      localStorage.setItem(chatStorageKey, JSON.stringify(chat))
      console.log("Updated chat in localStorage to clear unread count")
    }
  } catch (e) {
    console.error("Error updating chat in localStorage:", e)
  }

  // CRITICAL FIX: Dispatch event to update UI immediately
  window.dispatchEvent(
    new CustomEvent("messagesRead", {
      detail: { chatId, userId: currentUserId },
    }),
  )

  // CRITICAL FIX: Dispatch a messageSent event
  window.dispatchEvent(
    new CustomEvent("messageSent", {
      detail: {
        chatId,
        message: tempMessage,
        userId: currentUserId,
      },
    }),
  )

  // Add to sent messages map
  sentMessages.set(messageId, {
    chatId,
    content,
    timestamp: Date.now(),
  })

  // Make sure we're in the chat room
  if (!joinedRooms.has(chatId)) {
    joinChatRoom(chatId)
  }

  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      console.log("Socket not connected, initializing...")
      socket = initializeSocket()

      // If socket initialization failed, return error
      if (!socket) {
        messageStore.updateMessageStatus(chatId, messageId, { pending: false, error: true })
        sentMessages.delete(messageId)
        return reject(new Error("Failed to initialize socket"))
      }

      // If socket is still connecting, wait for connection
      if (!socket.connected) {
        const timeout = setTimeout(() => {
          socket.off("connect")
          messageStore.updateMessageStatus(chatId, messageId, { pending: false, error: true })
          sentMessages.delete(messageId)
          reject(new Error("Socket connection timeout"))
        }, 5000)

        socket.once("connect", () => {
          clearTimeout(timeout)
          console.log("Socket connected, sending message")
          socket.emit("send_message", { chatId, content, tempId: messageId })
          resolve(true)
        })

        return
      }
    }

    console.log(`Sending message to chat ${chatId}:`, content)
    socket.emit("send_message", { chatId, content, tempId: messageId })

    // Set a timeout to clean up sent messages that don't get a response
    setTimeout(() => {
      if (sentMessages.has(messageId)) {
        console.log("No response received for message, marking as delivered:", messageId)
        messageStore.updateMessageStatus(chatId, messageId, { pending: false })
        sentMessages.delete(messageId)
      }
    }, 10000) // 10 seconds timeout

    resolve(true)
  })
}

// Helper function to get current user ID
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

// Send typing indicator
const sendTypingIndicator = (chatId) => {
  if (socket && socket.connected && chatId) {
    socket.emit("typing", chatId)
  }
}

// Send stop typing indicator
const sendStopTypingIndicator = (chatId) => {
  if (socket && socket.connected && chatId) {
    socket.emit("stop_typing", chatId)
  }
}

const disconnectSocket = () => {
  if (socket) {
    console.log("Disconnecting socket")
    socket.disconnect()
    socketInitialized = false
  }
}

const getSocket = () => {
  return socket
}

const isSocketConnected = () => {
  return socket && socket.connected
}

const loadChatHistory = (chatId) => {
  if (socket && socket.connected && chatId) {
    socket.emit("load_history", chatId)
  }
}

export {
  initializeSocket,
  joinChatRoom,
  leaveChatRoom,
  sendMessage,
  sendTypingIndicator,
  sendStopTypingIndicator,
  markMessagesAsRead,
  disconnectSocket,
  getSocket,
  isSocketConnected,
  getCurrentUserId,
  loadChatHistory,
}
