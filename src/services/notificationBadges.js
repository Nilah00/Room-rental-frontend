// Notification badge management service

const notificationBadges = {
  // Store badge counts in memory
  badgeCounts: {},

  // Initialize from localStorage if available
  init() {
    try {
      const storedBadges = localStorage.getItem("notificationBadges")
      if (storedBadges) {
        this.badgeCounts = JSON.parse(storedBadges)
        console.log("Loaded notification badges from localStorage:", this.badgeCounts)
      }

      // Add CSS to forcibly hide ONLY chat-related badges
      this._injectTargetedBadgeKillerCSS()

      // CRITICAL FIX: Force clear all badges for the current user's messages
      this._clearBadgesForOwnMessages()

      // CRITICAL FIX: Forcibly remove badges from DOM, but only in chat list
      this._forciblyRemoveChatBadgesFromDOM()

      // CRITICAL FIX: Set up periodic cleaning
      setInterval(() => {
        this._clearBadgesForOwnMessages()
        this._forciblyRemoveChatBadgesFromDOM()
      }, 500) // Check every 500ms
    } catch (error) {
      console.error("Error loading notification badges from localStorage:", error)
      this.badgeCounts = {}
    }
  },

  // Inject CSS to forcibly hide ONLY chat-related badges
  _injectTargetedBadgeKillerCSS() {
    try {
      const style = document.createElement("style")
      style.id = "targeted-badge-killer-css"
      style.innerHTML = `
        /* Hide ONLY chat list badges */
        .chat-list-item .chat-list-item-badge,
        .chat-list-item[data-own-last-message="true"] .chat-list-item-badge {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        
        /* Remove unread styling ONLY in chat list */
        .chat-list-item.unread,
        .chat-list-item[data-own-last-message="true"].unread {
          font-weight: normal !important;
        }
        
        /* Remove bold styling ONLY from chat preview text */
        .chat-list-item .chat-list-item-preview.font-bold,
        .chat-list-item[data-own-last-message="true"] .chat-list-item-preview {
          font-weight: normal !important;
        }
      `
      document.head.appendChild(style)
      console.log("🎯 Targeted Badge Killer CSS injected")
    } catch (e) {
      console.error("Error injecting CSS:", e)
    }
  },

  // Forcibly remove ONLY chat-related badges from DOM
  _forciblyRemoveChatBadgesFromDOM() {
    try {
      // Only target badges within chat list items
      const chatBadges = document.querySelectorAll(".chat-list-item .chat-list-item-badge")
      chatBadges.forEach((badge) => {
        // Hide using multiple techniques
        badge.style.cssText = "display: none !important; visibility: hidden !important; opacity: 0 !important;"

        // Remove from DOM completely
        if (badge.parentNode) {
          badge.parentNode.removeChild(badge)
          console.log("🎯 Chat badge element REMOVED from DOM")
        }
      })

      // Remove unread class from chat items
      const chatItems = document.querySelectorAll(".chat-list-item")
      chatItems.forEach((item) => {
        // Check if this is a chat where the last message is from the current user
        const isOwnMessage = item.getAttribute("data-own-last-message") === "true"

        // If it's the user's own message or we're being aggressive, remove unread styling
        if (isOwnMessage || this._shouldBeAggressive()) {
          if (item.classList.contains("unread")) {
            item.classList.remove("unread")
          }

          // Find and fix preview text
          const preview = item.querySelector(".chat-list-item-preview")
          if (preview && preview.classList.contains("font-bold")) {
            preview.classList.remove("font-bold")
          }
        }
      })
    } catch (e) {
      console.error("Error removing chat badges from DOM:", e)
    }
  },

  // Helper to determine if we should be more aggressive
  _shouldBeAggressive() {
    // Check if we're on a page that looks like a chat or messages page
    const path = window.location.pathname.toLowerCase()
    return path.includes("message") || path.includes("chat") || path.includes("conversation")
  },

  // Save to localStorage
  _saveToLocalStorage() {
    try {
      localStorage.setItem("notificationBadges", JSON.stringify(this.badgeCounts))
    } catch (error) {
      console.error("Error saving notification badges to localStorage:", error)
    }
  },

  // Get badge count for a chat
  getBadgeCount(chatId) {
    // CRITICAL FIX: Always check if this is a chat where the last message is from the current user
    if (this._isLastMessageFromCurrentUser(chatId)) {
      return 0
    }
    return this.badgeCounts[chatId] || 0
  },

  // Increment badge count
  incrementBadgeCount(chatId, senderId) {
    if (!chatId) return 0

    // Get current user ID
    const currentUserId = this._getCurrentUserId()

    // CRITICAL FIX: NEVER increment badge count for our own messages
    if (senderId && senderId === currentUserId) {
      console.log("Not incrementing badge for our own message")
      this.clearBadgeCount(chatId)
      return 0
    }

    // CRITICAL FIX: Check if the last message in this chat is from the current user
    if (this._isLastMessageFromCurrentUser(chatId)) {
      console.log("Last message is from current user, not incrementing badge")
      this.clearBadgeCount(chatId)
      return 0
    }

    // Only increment if the sender is not the current user
    if (senderId !== currentUserId) {
      this.badgeCounts[chatId] = (this.badgeCounts[chatId] || 0) + 1
      this._saveToLocalStorage()

      // Dispatch event to notify components
      window.dispatchEvent(
        new CustomEvent("badgeCountUpdated", {
          detail: {
            chatId,
            count: this.badgeCounts[chatId],
            senderId: senderId,
          },
        }),
      )

      // Force DOM cleanup for chat badges
      setTimeout(() => this._forciblyRemoveChatBadgesFromDOM(), 0)

      return this.badgeCounts[chatId]
    }

    return 0
  },

  // Clear badge count
  clearBadgeCount(chatId) {
    if (!chatId) return

    // Check if we actually had a badge count to clear
    const hadBadge = this.badgeCounts[chatId] > 0

    // Delete the badge count
    delete this.badgeCounts[chatId]
    this._saveToLocalStorage()

    // Always dispatch event when clearing a badge
    console.log("Cleared notification badge for chat:", chatId)

    // Dispatch event to notify components
    window.dispatchEvent(
      new CustomEvent("badgeCountUpdated", {
        detail: {
          chatId,
          count: 0,
        },
      }),
    )

    // Force DOM cleanup for chat badges
    setTimeout(() => this._forciblyRemoveChatBadgesFromDOM(), 0)
  },

  // Get total badge count across all chats
  getTotalBadgeCount() {
    // CRITICAL FIX: Filter out badges for chats where the last message is from the current user
    let total = 0
    for (const chatId in this.badgeCounts) {
      if (!this._isLastMessageFromCurrentUser(chatId)) {
        total += this.badgeCounts[chatId]
      } else {
        // If last message is from current user, clear the badge
        delete this.badgeCounts[chatId]
      }
    }
    return total
  },

  // Clear all badge counts
  clearAllBadgeCounts() {
    this.badgeCounts = {}
    this._saveToLocalStorage()

    // Dispatch event to notify components
    window.dispatchEvent(
      new CustomEvent("badgeCountUpdated", {
        detail: {
          clearAll: true,
        },
      }),
    )
  },

  // Helper method to get current user ID
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
  },

  // CRITICAL FIX: Check if the last message in a chat is from the current user
  _isLastMessageFromCurrentUser(chatId) {
    try {
      const currentUserId = this._getCurrentUserId()
      if (!currentUserId) return false

      // Check localStorage for this chat
      const chatKey = `chat_${chatId}`
      const chatJson = localStorage.getItem(chatKey)
      if (!chatJson) return false

      const chat = JSON.parse(chatJson)
      return chat && chat.lastMessage && chat.lastMessage.sender === currentUserId
    } catch (error) {
      console.error("Error checking if last message is from current user:", error)
      return false
    }
  },

  // CRITICAL FIX: Completely clear all badges for chats where the last message is from the current user
  _clearBadgesForOwnMessages() {
    const currentUserId = this._getCurrentUserId()
    if (!currentUserId) return

    let updated = false

    // First, check all chats in localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("chat_")) {
          try {
            const chatData = JSON.parse(localStorage.getItem(key))
            const chatId = key.replace("chat_", "")

            // If the last message is from the current user, clear any badge and update localStorage
            if (chatData && chatData.lastMessage && chatData.lastMessage.sender === currentUserId) {
              // Clear badge
              if (this.badgeCounts[chatId]) {
                delete this.badgeCounts[chatId]
                updated = true
              }

              // Update chat data in localStorage
              if (chatData.unreadCount > 0) {
                chatData.unreadCount = 0
                localStorage.setItem(key, JSON.stringify(chatData))
                console.log("Updated chat in localStorage to clear unread count:", chatId)
              }
            }
          } catch (e) {
            console.error("Error processing chat data:", e)
          }
        }
      }

      // If we made changes, save to localStorage and dispatch event
      if (updated) {
        this._saveToLocalStorage()
        window.dispatchEvent(
          new CustomEvent("badgeCountUpdated", {
            detail: {
              forceUpdate: true,
            },
          }),
        )
      }
    } catch (e) {
      console.error("Error clearing badges for own messages:", e)
    }
  },
}

// Initialize on load
notificationBadges.init()

// Set up MutationObserver to catch dynamically added badges, but only for chat list
if (typeof window !== "undefined" && typeof document !== "undefined") {
  try {
    const observer = new MutationObserver((mutations) => {
      // Only run if we detect changes to elements that might be chat items or badges
      const shouldProcess = mutations.some((mutation) => {
        return Array.from(mutation.addedNodes).some((node) => {
          if (node.nodeType === 1) {
            // Element node
            const element = node
            return (
              element.classList &&
              (element.classList.contains("chat-list-item") ||
                element.classList.contains("chat-list-item-badge") ||
                element.querySelector(".chat-list-item") ||
                element.querySelector(".chat-list-item-badge"))
            )
          }
          return false
        })
      })

      if (shouldProcess) {
        notificationBadges._forciblyRemoveChatBadgesFromDOM()
      }
    })

    // Start observing once DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        observer.observe(document.body, { childList: true, subtree: true })
        console.log("🎯 Targeted Badge Killer observer started")
      })
    } else {
      observer.observe(document.body, { childList: true, subtree: true })
      console.log("🎯 Targeted Badge Killer observer started")
    }
  } catch (e) {
    console.error("Error setting up observer:", e)
  }
}

// Listen for storage events to sync across tabs
window.addEventListener("storage", (event) => {
  if (event.key === "notificationBadges") {
    try {
      const newBadges = JSON.parse(event.newValue)
      if (newBadges) {
        notificationBadges.badgeCounts = newBadges
        console.log("Updated notification badges from storage event:", newBadges)
      }
    } catch (error) {
      console.error("Error processing storage event for badges:", error)
    }
  }
})

// CRITICAL FIX: Add a direct event listener for new messages to clear badges for own messages
window.addEventListener("newMessage", (event) => {
  if (!event.detail) return

  const { chatId, message } = event.detail
  const currentUserId = notificationBadges._getCurrentUserId()

  // If this is our own message, clear any badge
  if (message && message.sender === currentUserId) {
    notificationBadges.clearBadgeCount(chatId)
    console.log("Cleared badge for own message from event listener:", chatId)

    // CRITICAL FIX: Also update the chat data in localStorage
    try {
      const chatKey = `chat_${chatId}`
      const chatJson = localStorage.getItem(chatKey)
      if (chatJson) {
        const chat = JSON.parse(chatJson)
        chat.unreadCount = 0
        chat.lastMessage = message
        localStorage.setItem(chatKey, JSON.stringify(chat))
      }
    } catch (e) {
      console.error("Error updating chat in localStorage:", e)
    }

    // Force DOM cleanup for chat badges
    setTimeout(() => notificationBadges._forciblyRemoveChatBadgesFromDOM(), 0)
  }
})

// CRITICAL FIX: Add a direct event listener for message sent events
window.addEventListener("messageSent", (event) => {
  if (!event.detail) return

  const { chatId } = event.detail

  // Clear badge for this chat
  notificationBadges.clearBadgeCount(chatId)
  console.log("Cleared badge after message sent event:", chatId)

  // Force clear badges for own messages
  notificationBadges._clearBadgesForOwnMessages()

  // Force DOM cleanup for chat badges
  setTimeout(() => notificationBadges._forciblyRemoveChatBadgesFromDOM(), 0)
})

// Add listeners for chat-related events
;["badgeCountUpdated", "messagesRead", "unreadCountUpdated"].forEach((eventName) => {
  window.addEventListener(eventName, () => {
    // Force DOM cleanup for chat badges after any badge-related event
    setTimeout(() => notificationBadges._forciblyRemoveChatBadgesFromDOM(), 0)
  })
})

export default notificationBadges
