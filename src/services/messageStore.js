class MessageStore {
  constructor() {
    this.messages = {}
    this.loadFromLocalStorage()
  }

  getMessages(chatId) {
    // Return a copy to prevent direct modification
    return this.messages[chatId] ? [...this.messages[chatId]] : []
  }

  // Add or update the addMessage method:
  addMessage(chatId, message) {
    if (!this.messages[chatId]) {
      this.messages[chatId] = []
    }

    // CRITICAL FIX: Check if this is a message from the current user
    const currentUserId = this._getCurrentUserId()
    const isOwnMessage = message.sender === currentUserId

    this.messages[chatId].push(message)
    this._saveToLocalStorage()

    // CRITICAL FIX: If this is our own message, update the chat in localStorage to clear unread count
    if (isOwnMessage) {
      try {
        const chatStorageKey = `chat_${chatId}`
        const chatJson = localStorage.getItem(chatStorageKey)
        if (chatJson) {
          const chat = JSON.parse(chatJson)
          chat.unreadCount = 0
          chat.lastMessage = message
          localStorage.setItem(chatStorageKey, JSON.stringify(chat))
        }
      } catch (e) {
        console.error("Error updating chat in localStorage:", e)
      }
    }

    // Dispatch event to notify components
    window.dispatchEvent(
      new CustomEvent("messageStoreUpdated", {
        detail: {
          chatId,
          messages: this.getMessages(chatId), // Use getter to get a copy
          isOwnMessage: isOwnMessage,
        },
      }),
    )
  }

  // Add or update the markAllAsRead function:
  markAllAsRead(chatId, userId) {
    if (!chatId || !userId || !this.messages[chatId]) return

    let updated = false

    // Update read status for all messages not sent by this user
    this.messages[chatId].forEach((message) => {
      if (message.sender !== userId && !message.read) {
        message.read = true
        updated = true
      }
    })

    if (updated) {
      console.log("Marked all messages as read for user:", userId)

      // Save to localStorage
      this._saveToLocalStorage()

      // Dispatch event to notify components
      window.dispatchEvent(
        new CustomEvent("messageStoreUpdated", {
          detail: {
            chatId,
            messages: this.getMessages(chatId), // Use getter to get a copy
          },
        }),
      )

      // Also dispatch a specific event for unread count updates
      window.dispatchEvent(
        new CustomEvent("unreadCountUpdated", {
          detail: {
            chatId,
            unreadCount: 0, // We've just marked all as read
            userId,
          },
        }),
      )
    }
  }

  _saveToLocalStorage() {
    localStorage.setItem("messages", JSON.stringify(this.messages))
  }

  loadFromLocalStorage() {
    const storedMessages = localStorage.getItem("messages")
    if (storedMessages) {
      this.messages = JSON.parse(storedMessages)
    }
  }

  // CRITICAL FIX: Add the missing reloadFromLocalStorage method
  reloadFromLocalStorage() {
    console.log("Reloading messages from localStorage")
    this.loadFromLocalStorage()

    // Notify components that messages have been reloaded
    for (const chatId in this.messages) {
      window.dispatchEvent(
        new CustomEvent("messageStoreUpdated", {
          detail: {
            chatId,
            messages: this.getMessages(chatId),
          },
        }),
      )
    }
  }

  // Add this helper method to messageStore
  _getCurrentUserId() {
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

  // Add method to update message status
  updateMessageStatus(chatId, messageId, updates) {
    if (!chatId || !messageId || !this.messages[chatId]) return false

    let updated = false
    this.messages[chatId] = this.messages[chatId].map((message) => {
      if (message._id === messageId || message.tempId === messageId) {
        updated = true
        return { ...message, ...updates }
      }
      return message
    })

    if (updated) {
      this._saveToLocalStorage()

      // Dispatch event to notify components
      window.dispatchEvent(
        new CustomEvent("messageStoreUpdated", {
          detail: {
            chatId,
            messages: this.getMessages(chatId),
          },
        }),
      )
    }

    return updated
  }

  // Add method to update a message
  updateMessage(chatId, messageId, updates) {
    return this.updateMessageStatus(chatId, messageId, updates)
  }

  // Add method to add multiple messages
  addMessages(chatId, messages) {
    if (!chatId || !messages || !Array.isArray(messages) || messages.length === 0) return

    if (!this.messages[chatId]) {
      this.messages[chatId] = []
    }

    // Add each message
    let added = false
    messages.forEach((message) => {
      // Check if message already exists
      const exists = this.messages[chatId].some(
        (m) => (m._id && m._id === message._id) || (m.tempId && m.tempId === message.tempId),
      )

      if (!exists) {
        this.messages[chatId].push(message)
        added = true
      }
    })

    if (added) {
      this._saveToLocalStorage()

      // Dispatch event to notify components
      window.dispatchEvent(
        new CustomEvent("messageStoreUpdated", {
          detail: {
            chatId,
            messages: this.getMessages(chatId),
          },
        }),
      )
    }
  }
}

const messageStore = new MessageStore()
export default messageStore
