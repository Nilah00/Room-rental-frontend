/**
 * Utility for synchronizing data across browser tabs
 */

// Set up a BroadcastChannel if supported by the browser
let broadcastChannel = null
try {
  if (typeof BroadcastChannel !== "undefined") {
    broadcastChannel = new BroadcastChannel("chat_sync")
  }
} catch (error) {
  console.warn("BroadcastChannel not supported:", error)
}

// Function to send a message to other tabs
export const sendCrossTabs = (type, data) => {
  try {
    // Use BroadcastChannel if available
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type, data })
      return
    }

    // Fallback to localStorage for older browsers
    const message = {
      type,
      data,
      timestamp: Date.now(),
    }

    localStorage.setItem("tab_sync_message", JSON.stringify(message))
    // Remove it after a short delay to trigger another storage event
    setTimeout(() => {
      localStorage.removeItem("tab_sync_message")
    }, 100)
  } catch (error) {
    console.error("Error sending cross-tab message:", error)
  }
}

// Initialize listeners
export const initTabSync = () => {
  // BroadcastChannel listener
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      handleSyncMessage(event.data)
    }
  }

  // localStorage listener for older browsers
  window.addEventListener("storage", (event) => {
    if (event.key === "tab_sync_message" && event.newValue) {
      try {
        const message = JSON.parse(event.newValue)
        handleSyncMessage(message)
      } catch (error) {
        console.error("Error processing tab sync message:", error)
      }
    }

    // Also listen for changes to chatMessages in localStorage
    if (event.key === "chatMessages" && event.newValue) {
      try {
        console.log("Chat messages updated in another tab")
        // Dispatch an event to notify components to reload messages
        window.dispatchEvent(new CustomEvent("chatMessagesUpdated"))
      } catch (error) {
        console.error("Error processing chatMessages update:", error)
      }
    }
  })
}

// Handle incoming sync messages
const handleSyncMessage = (message) => {
  if (!message || !message.type) return

  switch (message.type) {
    case "new_message":
      window.dispatchEvent(
        new CustomEvent("newMessage", {
          detail: message.data,
        }),
      )
      break

    case "chat_opened":
      // Notify that a chat was opened in another tab
      window.dispatchEvent(
        new CustomEvent("chatOpenedInOtherTab", {
          detail: message.data,
        }),
      )
      break

    case "message_read":
      window.dispatchEvent(
        new CustomEvent("messagesRead", {
          detail: message.data,
        }),
      )
      break

    case "request_chat_history":
      // Another tab is requesting chat history
      window.dispatchEvent(
        new CustomEvent("requestChatHistory", {
          detail: message.data,
        }),
      )
      break

    case "share_chat_history":
      // Receiving chat history from another tab
      window.dispatchEvent(
        new CustomEvent("receiveChatHistory", {
          detail: message.data,
        }),
      )
      break

    default:
      console.log("Unknown sync message type:", message.type)
  }
}

// Request chat history from other tabs
export const requestChatHistory = (chatId) => {
  sendCrossTabs("request_chat_history", { chatId })
}

// Share chat history with other tabs
export const shareChatHistory = (chatId, messages) => {
  sendCrossTabs("share_chat_history", { chatId, messages })
}

export default {
  sendCrossTabs,
  initTabSync,
  requestChatHistory,
  shareChatHistory,
}
