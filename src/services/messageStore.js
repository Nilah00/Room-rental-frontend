class MessageStore {
  constructor() {
    this.messages = {}
    this.processedIds = new Set() // Track processed message IDs to prevent duplicates
    this.loadFromLocalStorage()
  }

  getMessages(chatId) {
    // Return a copy to prevent direct modification
    return this.messages[chatId] ? [...this.messages[chatId]] : []
  }

  addMessage(chatId, message) {
    if (!this.messages[chatId]) {
      this.messages[chatId] = []
    }

    // CRITICAL FIX: Check if this is a duplicate message
    const messageId = message._id || message.tempId
    if (messageId && this.processedIds.has(messageId)) {
      console.log("Duplicate message detected, not adding:", messageId)
      return false
    }

    // CRITICAL FIX: Check if this is a message from the current user
    const currentUserId = this._getCurrentUserId()
    const isOwnMessage = message.sender === currentUserId

    // Add message ID to processed set
    if (messageId) {
      this.processedIds.add(messageId)
    }

    // CRITICAL FIX: Check for content-based duplicates (within last 10 seconds)
    const isDuplicate = this.messages[chatId].some(existingMsg => 
      existingMsg.content === message.content && 
      existingMsg.sender === message.sender &&
      Math.abs(new Date(existingMsg.timestamp) - new Date(message.timestamp)) < 10000
    )

    if (isDuplicate) {
      console.log("Content-based duplicate detected, not adding:", message.content)
      return false
    }

    // Add default status if not present
    if (!message.status) {
      message.status = isOwnMessage ? "sent" : "received"
    }

    // Add the message
    this.messages[chatId].push(message)
    
    // Sort messages by timestamp
    this.messages[chatId].sort((a, b) => 
      new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
    )
    
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
      })
    )

    return true
  }

  markAllAsRead(chatId, userId) {
    if (!chatId || !userId || !this.messages[chatId]) return false

    let updated = false

    // Update read status for all messages not sent by this user
    this.messages[chatId].forEach((message) => {
      if (message.sender !== userId && !message.read) {
        message.read = true
        message.status = "read"
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
        })
      )

      // Also dispatch a specific event for unread count updates
      window.dispatchEvent(
        new CustomEvent("unreadCountUpdated", {
          detail: {
            chatId,
            unreadCount: 0, // We've just marked all as read
            userId,
          },
        })
      )

      // Also dispatch messagesRead event for consistency
      window.dispatchEvent(
        new CustomEvent("messagesRead", {
          detail: {
            chatId,
            userId,
          },
        })
      )
    }

    return updated
  }

  _saveToLocalStorage() {
    try {
      localStorage.setItem("messages", JSON.stringify(this.messages))
    } catch (e) {
      console.error("Error saving messages to localStorage:", e)
    }
  }

  loadFromLocalStorage() {
    try {
      const storedMessages = localStorage.getItem("messages")
      if (storedMessages) {
        this.messages = JSON.parse(storedMessages)
        
        // Rebuild the processedIds set
        this.processedIds = new Set()
        Object.values(this.messages).forEach(chatMessages => {
          chatMessages.forEach(message => {
            if (message._id) this.processedIds.add(message._id)
            if (message.tempId) this.processedIds.add(message.tempId)
          })
        })
      }
    } catch (e) {
      console.error("Error loading messages from localStorage:", e)
      this.messages = {}
    }
  }

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
        })
      )
    }
  }

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
        })
      )
    }

    return updated
  }

  updateMessage(chatId, messageId, updates) {
    return this.updateMessageStatus(chatId, messageId, updates)
  }

  addMessages(chatId, messages) {
    if (!chatId || !messages || !Array.isArray(messages) || messages.length === 0) return false

    if (!this.messages[chatId]) {
      this.messages[chatId] = []
    }

    // Add each message
    let added = false
    const currentUserId = this._getCurrentUserId()

    messages.forEach((message) => {
      const messageId = message._id || message.tempId
      
      // Check if message already exists by ID
      const existsById = messageId && (
        this.processedIds.has(messageId) || 
        this.messages[chatId].some(m => 
          (m._id && m._id === messageId) || 
          (m.tempId && m.tempId === messageId)
        )
      )

      // Check for content-based duplicates
      const existsByContent = this.messages[chatId].some(m => 
        m.content === message.content && 
        m.sender === message.sender &&
        Math.abs(new Date(m.timestamp) - new Date(message.timestamp)) < 10000
      )

      if (!existsById && !existsByContent) {
        // Add default status if not present
        if (!message.status) {
          message.status = message.sender === currentUserId ? "sent" : "received"
        }
        
        this.messages[chatId].push(message)
        
        // Add to processed IDs
        if (messageId) {
          this.processedIds.add(messageId)
        }
        
        added = true
      }
    })

    if (added) {
      // Sort messages by timestamp
      this.messages[chatId].sort((a, b) => 
        new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
      )
      
      this._saveToLocalStorage()

      // Dispatch event to notify components
      window.dispatchEvent(
        new CustomEvent("messageStoreUpdated", {
          detail: {
            chatId,
            messages: this.getMessages(chatId),
          },
        })
      )
    }

    return added
  }

  // Clear processed IDs cache (useful for testing or when switching users)
  clearProcessedIdsCache() {
    this.processedIds = new Set()
  }

  // Get the count of unread messages in a chat
  getUnreadCount(chatId) {
    if (!chatId || !this.messages[chatId]) return 0
    
    const currentUserId = this._getCurrentUserId()
    return this.messages[chatId].filter(msg => 
      msg.sender !== currentUserId && !msg.read
    ).length
  }

  // Clear all messages for a chat
  clearChat(chatId) {
    if (!chatId || !this.messages[chatId]) return false
    
    delete this.messages[chatId]
    this._saveToLocalStorage()
    
    return true
  }
}

const messageStore = new MessageStore()
export default messageStore
