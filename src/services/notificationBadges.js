// Create or update the notification badges service
const notificationBadges = {
  badges: {},

  // Get badge count for a specific chat
  getBadgeCount(chatId) {
    return this.badges[chatId] || 0
  },

  // Set badge count for a specific chat
  setBadgeCount(chatId, count) {
    this.badges[chatId] = count
    this.notifyBadgeUpdate(chatId, count)
    return count
  },

  // Increment badge count for a specific chat
  incrementBadgeCount(chatId) {
    const currentCount = this.getBadgeCount(chatId)
    return this.setBadgeCount(chatId, currentCount + 1)
  },

  // Clear badge count for a specific chat
  clearBadgeCount(chatId) {
    console.log(`Clearing badge count for chat: ${chatId}`)
    this.badges[chatId] = 0
    this.notifyBadgeUpdate(chatId, 0)
    return 0
  },

  // Force clear badge count - more aggressive approach
  forceClearBadgeCount(chatId) {
    console.log(`Force clearing badge count for chat: ${chatId}`)
    // Clear in our local store
    this.badges[chatId] = 0

    // Dispatch multiple events to ensure UI updates
    window.dispatchEvent(
      new CustomEvent("badgeCountUpdated", {
        detail: { chatId, count: 0 },
      }),
    )

    window.dispatchEvent(
      new CustomEvent("updateNotificationBadges", {
        detail: { chatId },
      }),
    )

    window.dispatchEvent(
      new CustomEvent("messagesRead", {
        detail: { chatId },
      }),
    )

    // Also try to update DOM elements directly if they exist
    try {
      const badgeElements = document.querySelectorAll(
        `[data-chat-id="${chatId}"] .badge, [data-chat-id="${chatId}"] .notification-badge`,
      )
      badgeElements.forEach((element) => {
        element.textContent = "0"
        element.style.display = "none"
      })
    } catch (e) {
      console.error("Error updating badge DOM elements:", e)
    }

    return 0
  },

  // Notify badge update
  notifyBadgeUpdate(chatId, count) {
    window.dispatchEvent(
      new CustomEvent("badgeCountUpdated", {
        detail: { chatId, count },
      }),
    )
  },

  // Get total badge count
  getTotalBadgeCount() {
    return Object.values(this.badges).reduce((total, count) => total + count, 0)
  },
}

// Make the notification badges service globally available
if (typeof window !== "undefined") {
  window.notificationBadges = notificationBadges
}

export default notificationBadges
