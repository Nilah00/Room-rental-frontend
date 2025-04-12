import CryptoJS from "crypto-js"

// eSewa configuration - Updated with latest test environment details
const ESEWA_CONFIG = {
  merchantId: "EPAYTEST",
  secretKey: "8gBm/:&EnhH.1/q",
  testMode: true, // Set to false for production
  testUrl: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
  prodUrl: "https://epay.esewa.com.np/api/epay/main/v2/form",
  testVerifyUrl: "https://rc-esewa.com.np/api/epay/transaction/status",
  prodVerifyUrl: "https://esewa.com.np/api/epay/transaction/status",
  // Alternative verification URLs
  altTestVerifyUrl: "https://uat.esewa.com.np/epay/transrec",
  altProdVerifyUrl: "https://esewa.com.np/epay/transrec",
}

/**
 * Generates a unique transaction ID
 * @returns {string} Transaction UUID
 */
export const generateTransactionId = () => {
  // Format: YYMMDD-HHMMSS-RANDOM
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  const seconds = String(now.getSeconds()).padStart(2, "0")

  const dateTime = `${year}${month}${day}-${hours}${minutes}${seconds}`
  const randomPart = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")

  return `${dateTime}-${randomPart}`
}

/**
 * Generates HMAC signature for eSewa payment
 * @param {Object} fields - Fields to include in signature
 * @returns {string} Base64 encoded signature
 */
export const generateSignature = (fields) => {
  // Create a string of fields in the format field1=value1,field2=value2
  const signedFieldNames = fields.signed_field_names.split(",")
  const signatureString = signedFieldNames.map((field) => `${field}=${fields[field]}`).join(",")

  // Generate HMAC-SHA256 signature
  const hash = CryptoJS.HmacSHA256(signatureString, ESEWA_CONFIG.secretKey)
  return CryptoJS.enc.Base64.stringify(hash)
}

/**
 * Creates eSewa payment form data
 * @param {Object} paymentDetails - Payment details
 * @returns {Object} Form data for eSewa payment
 */
export const createEsewaPayment = (paymentDetails) => {
  const { amount, bookingId, propertyTitle } = paymentDetails

  // Calculate tax and total amount
  // No tax calculation
  const totalAmount = amount

  // Generate transaction UUID
  const transactionUuid = generateTransactionId()

  // Base URL for the application
  const baseUrl = window.location.origin

  // Create payment data
  const paymentData = {
    amount: amount.toString(),
    tax_amount: "0",
    total_amount: totalAmount.toString(),
    transaction_uuid: transactionUuid,
    product_code: ESEWA_CONFIG.merchantId,
    product_service_charge: "0",
    product_delivery_charge: "0",
    success_url: `${baseUrl}/payment/success?booking_id=${bookingId}&amount=${amount}`,
    failure_url: `${baseUrl}/payment/failure?booking_id=${bookingId}`,
    signed_field_names: "total_amount,transaction_uuid,product_code",
  }

  // Generate signature
  paymentData.signature = generateSignature(paymentData)

  // Store transaction details in localStorage for verification later
  localStorage.setItem(
    `payment_attempt_${bookingId}`,
    JSON.stringify({
      transactionUuid,
      amount: totalAmount, // Store the total amount including tax
      originalAmount: amount,
      status: "PENDING",
      timestamp: new Date().toISOString(),
      bookingId,
    }),
  )

  // Log the payment data for debugging
  console.log("eSewa payment data:", paymentData)
  console.log("eSewa form URL:", ESEWA_CONFIG.testMode ? ESEWA_CONFIG.testUrl : ESEWA_CONFIG.prodUrl)

  return {
    formUrl: ESEWA_CONFIG.testMode ? ESEWA_CONFIG.testUrl : ESEWA_CONFIG.prodUrl,
    formData: paymentData,
  }
}

/**
 * Verifies eSewa payment status
 * @param {string} productCode - Merchant product code
 * @param {string} transactionUuid - Transaction UUID
 * @param {number} amount - Transaction amount
 * @returns {Promise<Object>} Payment verification result
 */
export const verifyEsewaPayment = async (productCode, transactionUuid, amount) => {
  // Try the primary verification URL first
  const baseUrl = ESEWA_CONFIG.testMode ? ESEWA_CONFIG.testVerifyUrl : ESEWA_CONFIG.prodVerifyUrl
  const verificationUrl = `${baseUrl}?product_code=${productCode}&total_amount=${amount}&transaction_uuid=${transactionUuid}`

  console.log("Verifying payment at URL:", verificationUrl)

  try {
    // Add a timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(verificationUrl, { signal: controller.signal })
    clearTimeout(timeoutId)

    // Log the raw response for debugging
    const responseText = await response.text()
    console.log("Raw verification response:", responseText)

    // Try to parse as JSON
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Error parsing verification response:", parseError)

      // Try alternative verification method
      console.log("Trying alternative verification method...")
      return await verifyEsewaPaymentAlternative(productCode, transactionUuid, amount)
    }

    return data
  } catch (error) {
    console.error("Payment verification error:", error)

    // Try alternative verification method
    console.log("Primary verification failed, trying alternative method...")
    return await verifyEsewaPaymentAlternative(productCode, transactionUuid, amount)
  }
}

/**
 * Alternative method to verify eSewa payment using direct API
 * This is a fallback in case the standard verification doesn't work
 */
export const verifyEsewaPaymentAlternative = async (productCode, transactionUuid, amount) => {
  try {
    // Try the alternative verification URL
    const altBaseUrl = ESEWA_CONFIG.testMode ? ESEWA_CONFIG.altTestVerifyUrl : ESEWA_CONFIG.altProdVerifyUrl
    const altVerificationUrl = `${altBaseUrl}?pid=${transactionUuid}&amt=${amount}&scd=${productCode}`

    console.log("Trying alternative verification URL:", altVerificationUrl)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(altVerificationUrl, { signal: controller.signal })
    clearTimeout(timeoutId)

    const responseText = await response.text()
    console.log("Alternative verification response:", responseText)

    // Check if the response contains success indicators
    if (responseText.includes("Success") || responseText.includes("success") || responseText.includes("COMPLETE")) {
      return {
        status: "COMPLETE",
        message: "Payment verified successfully (alternative method)",
      }
    }

    // If we get here, both verification methods failed
    return {
      status: "ERROR",
      message: "Payment verification failed with both methods",
      rawResponse: responseText,
    }
  } catch (error) {
    console.error("Alternative payment verification error:", error)
    return {
      status: "ERROR",
      message: error.message,
    }
  }
}
