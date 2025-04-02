// Global message store to ensure consistency across components
const messageStore = {
  // Store messages by chat ID
  messages: {},

  // Add a message to a specific chat
  addMessage(chatId, message) {
    if (!this.messages[chatId]) {
      this.messages[chatId] = []
    }

    // Check if message already exists to avoid duplicates
    const exists = this.messages[chatId].some(
      (m) => (m._id && m._id === message._id) || (m.tempId && m.tempId === message.tempId),
    )

    if (!exists) {
      this.messages[chatId].push(message)
      console.log(`Added message to store for chat ${chatId}:`, message)

      // Save to localStorage as backup
      this.saveToLocalStorage(chatId)

      // Dispatch event to notify components
      window.dispatchEvent(
        new CustomEvent("messageStoreUpdated", {
          detail: { chatId, messages: this.messages[chatId] },
        }),
      )
    }

    return this.messages[chatId]
  },

  // Get all messages for a specific chat
  getMessages(chatId) {
    if (!this.messages[chatId]) {
      // Try to load from localStorage
      const stored = localStorage.getItem(`messages_${chatId}`)
      if (stored) {
        try {
          this.messages[chatId] = JSON.parse(stored)
        } catch (e) {
          console.error("Error parsing stored messages:", e)
          this.messages[chatId] = []
        }
      } else {
        this.messages[chatId] = []
      }
    }

    return this.messages[chatId]
  },

  // Set all messages for a specific chat
  setMessages(chatId, messages) {
    this.messages[chatId] = messages

    // Save to localStorage
    this.saveToLocalStorage(chatId)

    // Dispatch event to notify components
    window.dispatchEvent(
      new CustomEvent("messageStoreUpdated", {
        detail: { chatId, messages: this.messages[chatId] },
      }),
    )

    return this.messages[chatId]
  },

  // Save messages to localStorage
  saveToLocalStorage(chatId) {
    try {
      localStorage.setItem(`messages_${chatId}`, JSON.stringify(this.messages[chatId]))
    } catch (e) {
      console.error("Error saving messages to localStorage:", e)
    }
  },

  // Update a specific message in a chat
  updateMessage(chatId, messageId, updates) {
    if (!this.messages[chatId]) {
      return null
    }

    const index = this.messages[chatId].findIndex(
      (m) => (m._id && m._id === messageId) || (m.tempId && m.tempId === messageId),
    )

    if (index !== -1) {
      this.messages[chatId][index] = {
        ...this.messages[chatId][index],
        ...updates,
      }

      // Save to localStorage
      this.saveToLocalStorage(chatId)

      // Dispatch event to notify components
      window.dispatchEvent(
        new CustomEvent("messageStoreUpdated", {
          detail: { chatId, messages: this.messages[chatId] },
        }),
      )

      return this.messages[chatId][index]
    }

    return null
  },
}

export default messageStore

