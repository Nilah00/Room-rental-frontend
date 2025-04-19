// Standalone script to fix notification badges for own messages

;(() => {
    // Function to forcibly hide badges for own messages
    function hideBadgesForOwnMessages() {
      try {
        // Get current user ID from token
        const currentUserId = getCurrentUserId()
        if (!currentUserId) return
  
        // Find all chat list items
        const chatItems = document.querySelectorAll(".chat-list-item")
  
        chatItems.forEach((item) => {
          // Check if this chat has a badge
          const badge = item.querySelector(".chat-list-item-badge")
          if (!badge) return
  
          // Try to get the chat ID
          const chatId = item.getAttribute("data-chat-id")
          if (!chatId) return
  
          // Check if the last message in this chat is from the current user
          const isOwnMessage = checkIfLastMessageIsFromUser(chatId, currentUserId)
  
          if (isOwnMessage) {
            // Hide the badge
            badge.style.display = "none"
  
            // Remove unread class
            item.classList.remove("unread")
  
            // Find and reset any bold text
            const previewText = item.querySelector(".chat-list-item-preview")
            if (previewText) {
              previewText.classList.remove("font-bold")
            }
  
            // Clear the badge count in localStorage
            clearBadgeInStorage(chatId)
          }
        })
      } catch (e) {
        console.error("Error in hideBadgesForOwnMessages:", e)
      }
    }
  
    // Helper function to get current user ID
    function getCurrentUserId() {
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
  
    // Helper function to check if the last message is from the current user
    function checkIfLastMessageIsFromUser(chatId, userId) {
      try {
        // Check localStorage for this chat
        const chatKey = `chat_${chatId}`
        const chatJson = localStorage.getItem(chatKey)
        if (!chatJson) return false
  
        const chat = JSON.parse(chatJson)
        return chat && chat.lastMessage && chat.lastMessage.sender === userId
      } catch (error) {
        console.error("Error checking if last message is from user:", error)
        return false
      }
    }
  
    // Helper function to clear badge in storage
    function clearBadgeInStorage(chatId) {
      try {
        // Update the chat in localStorage
        const chatKey = `chat_${chatId}`
        const chatJson = localStorage.getItem(chatKey)
        if (chatJson) {
          const chat = JSON.parse(chatJson)
          if (chat.unreadCount > 0) {
            chat.unreadCount = 0
            localStorage.setItem(chatKey, JSON.stringify(chat))
          }
        }
  
        // Clear in notification badges storage
        const badgesJson = localStorage.getItem("notificationBadges")
        if (badgesJson) {
          const badges = JSON.parse(badgesJson)
          if (badges[chatId]) {
            delete badges[chatId]
            localStorage.setItem("notificationBadges", JSON.stringify(badges))
          }
        }
      } catch (e) {
        console.error("Error clearing badge in storage:", e)
      }
    }
  
    // Add CSS to forcibly hide badges
    function injectCSS() {
      const style = document.createElement("style")
      style.textContent = `
        .chat-list-item[data-own-last-message="true"] .chat-list-item-badge {
          display: none !important;
        }
        .chat-list-item[data-own-last-message="true"].unread {
          font-weight: normal !important;
        }
        .chat-list-item[data-own-last-message="true"] .chat-list-item-preview {
          font-weight: normal !important;
        }
      `
      document.head.appendChild(style)
    }
  
    // Set up a mutation observer to handle dynamically added elements
    function setupObserver() {
      const observer = new MutationObserver((mutations) => {
        // Run the hide badges function whenever DOM changes
        hideBadgesForOwnMessages()
      })
  
      // Start observing the document
      observer.observe(document.body, { childList: true, subtree: true })
    }
  
    // Run when DOM is loaded
    function initialize() {
      console.log("Initializing badge fix")
      injectCSS()
      setupObserver()
      hideBadgesForOwnMessages()
  
      // Run periodically
      setInterval(hideBadgesForOwnMessages, 500)
  
      // Listen for message events
      window.addEventListener("newMessage", () => {
        setTimeout(hideBadgesForOwnMessages, 100)
      })
  
      window.addEventListener("messageSent", () => {
        setTimeout(hideBadgesForOwnMessages, 100)
      })
    }
  
    // Run when DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initialize)
    } else {
      initialize()
    }
  })()
  