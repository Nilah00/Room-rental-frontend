/**
 * Format a number as Nepalese Rupees (NPR)
 * @param {number} amount - The amount to format
 * @param {boolean} showSymbol - Whether to show the Rs. symbol (default: true)
 * @returns {string} Formatted amount string
 */
export const formatNPR = (amount, showSymbol = true) => {
    // Handle null, undefined or non-numeric values
    if (amount === null || amount === undefined || isNaN(Number(amount))) {
      return showSymbol ? "Rs. 0.00" : "0.00"
    }
  
    // Convert to number if it's a string
    const numAmount = typeof amount === "string" ? Number.parseFloat(amount) : amount
  
    // Format with Nepali thousands separator and 2 decimal places
    const formattedAmount = numAmount.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })
  
    // Return with or without the Rs. symbol
    return showSymbol ? `Rs. ${formattedAmount}` : formattedAmount
  }
  
  /**
   * Format a date string to a readable format
   * @param {string} dateString - The date string to format
   * @param {object} options - Formatting options
   * @returns {string} Formatted date string
   */
  export const formatDate = (dateString, options = {}) => {
    if (!dateString) return "N/A"
  
    const defaultOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...options,
    }
  
    return new Date(dateString).toLocaleDateString("en-US", defaultOptions)
  }
  
  /**
   * Format a number as a percentage
   * @param {number} value - The value to format as percentage
   * @param {number} decimals - Number of decimal places (default: 1)
   * @returns {string} Formatted percentage string
   */
  export const formatPercentage = (value, decimals = 1) => {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return "0%"
    }
  
    return `${Number(value).toFixed(decimals)}%`
  }
  
  /**
   * Format a number with appropriate suffixes (K, M, B)
   * @param {number} num - The number to format
   * @returns {string} Formatted number with suffix
   */
  export const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(Number(num))) {
      return "0"
    }
  
    const absNum = Math.abs(Number(num))
  
    if (absNum >= 1000000000) {
      return (num / 1000000000).toFixed(1) + "B"
    }
  
    if (absNum >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    }
  
    if (absNum >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
  
    return num.toString()
  }
  