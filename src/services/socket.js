const { io } = require("socket.io-client")

let socket

// Update the initializeSocket function to be more robust
const initializeSocket = () => {
  console.log("Initializing socket connection")
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
    reconnectionAttempts: 10, // Increase reconnection attempts
    reconnectionDelay: 1000,
    timeout: 20000, // Increase timeout
  })

  // Socket event handlers
  socket.on("connect", () => {
    console.log("Socket connected successfully:", socket.id)
    // Dispatch an event that socket is connected
    window.dispatchEvent(new Event("socketConnected"))
  })

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error)

    // If the error is due to authentication, we might want to redirect to login
    if (error.message && (error.message.includes("auth") || error.message.includes("token"))) {
      console.error("Authentication error with socket, token may be invalid")
      // We could dispatch an event here to notify the app about auth issues
    }
  })

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason)

    // Attempt to reconnect if disconnected for certain reasons
    if (reason === "io server disconnect" || reason === "transport close") {
      console.log("Attempting to reconnect socket")
      socket.connect()
    }
  })

  socket.on("error", (error) => {
    console.error("Socket error:", error)
  })

  // Listen for new notifications
  socket.on("notification", (notification) => {
    console.log("New notification received:", notification)

    // Dispatch custom event to notify components
    window.dispatchEvent(
      new CustomEvent("newNotification", {
        detail: notification,
      }),
    )

    // Show browser notification if supported
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("RoomRental Notification", {
        body: notification.message,
        icon: "/favicon.ico",
      })
    }
  })

  // Listen for booking updates
  socket.on("booking_update", (booking) => {
    console.log("Booking update received:", booking)

    // Dispatch custom event to notify components
    window.dispatchEvent(
      new CustomEvent("bookingUpdate", {
        detail: booking,
      }),
    )
  })

  // Listen for new messages
  socket.on("receive_message", (data) => {
    console.log("New message received:", data)

    // Dispatch custom event to notify components
    window.dispatchEvent(
      new CustomEvent("newMessage", {
        detail: data,
      }),
    )

    // Show browser notification if supported and the app is not in focus
    if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
      // Try to get the sender's name from the chat data
      let senderName = "New message"

      // If we have chat data in localStorage, try to get the sender's name
      try {
        const chatStorageKey = `chat_${data.chatId}`
        const storedChatJson = localStorage.getItem(chatStorageKey)

        if (storedChatJson) {
          const storedChat = JSON.parse(storedChatJson)

          if (storedChat.otherParticipant && storedChat.otherParticipant.name) {
            senderName = storedChat.otherParticipant.name
          }
        }
      } catch (e) {
        console.error("Error getting sender name for notification:", e)
      }

      new Notification(senderName, {
        body: data.message.content,
        icon: "/favicon.ico",
      })
    }
  })

  socket.on("chat_notification", (notification) => {
    console.log("Chat notification received:", notification)

    // Dispatch custom event to notify components
    window.dispatchEvent(
      new CustomEvent("chatNotification", {
        detail: notification,
      }),
    )

    // Show browser notification if supported
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("New Message", {
        body: notification.message.content,
        icon: "/favicon.ico",
      })
    }
  })

  return socket
}

const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    console.log("Socket disconnected manually")
  }
}

const getSocket = () => {
  return socket
}

const emitEvent = (event, data) => {
  if (socket) {
    socket.emit(event, data)
  } else {
    console.error("Socket not initialized")
  }
}

// Chat-specific socket functions
const joinChatRoom = (chatId) => {
  if (socket) {
    socket.emit("join_chat", chatId)
  } else {
    console.error("Socket not initialized")
  }
}

const leaveChatRoom = (chatId) => {
  if (socket) {
    socket.emit("leave_chat", chatId)
  } else {
    console.error("Socket not initialized")
  }
}

// Update the sendMessage function to prevent it from being called directly from the ChatBox
// This function will now only be used internally by the socket service
const sendMessage = (chatId, content) => {
  console.log("sendMessage called with:", { chatId, content })

  if (!chatId) {
    console.error("Cannot send message: chatId is null or undefined")
    throw new Error("Chat ID is required")
  }

  if (!content) {
    console.error("Cannot send message: content is empty")
    throw new Error("Message content is required")
  }

  const socket = getSocket()
  if (!socket) {
    console.error("Socket not initialized")
    throw new Error("Socket not initialized")
  }

  if (!socket.connected) {
    console.warn("Socket not connected, attempting to reconnect")
    socket.connect()

    // Wait a short time for connection to establish
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (socket.connected) {
          console.log("Socket reconnected, sending message")
          socket.emit("send_message", { chatId, content })
          resolve(true)
        } else {
          console.error("Socket reconnection failed")
          reject(new Error("Socket reconnection failed"))
        }
      }, 500)
    })
  } else {
    // Socket is connected, send the message
    console.log("Socket is connected, emitting send_message event")
    socket.emit("send_message", { chatId, content })
    return Promise.resolve(true)
  }
}

module.exports = {
  initializeSocket,
  disconnectSocket,
  getSocket,
  emitEvent,
  joinChatRoom,
  leaveChatRoom,
  sendMessage,
}

