"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate, Link, useLocation } from "react-router-dom"
import { ArrowLeft, AlertCircle, CreditCard, RefreshCw, ImageIcon, Info, HelpCircle } from "lucide-react"
import { getPropertyById } from "../services/api"
import { createEsewaPayment } from "./esewaPayment"
import { getImageUrl, handleImageError } from "./imageUtils"
import "./Payment.css"

export default function Payment() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [booking, setBooking] = useState(null)
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("esewa")
  const esewaFormRef = useRef(null)
  const [imageError, setImageError] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [customAmount, setCustomAmount] = useState(false)
  const [customAmountValue, setCustomAmountValue] = useState("")
  const [showEsewaHelp, setShowEsewaHelp] = useState(false)

  // Check if we have property data from the location state
  const propertyFromState = location.state?.property || location.state?.roomDetails

  // This function creates a mock booking when we don't have real data
  const createMockBooking = (bookingId, propertyData) => {
    const property = propertyData || {
      _id: "mock-property-id",
      title: "Sample Property",
      price: 10000,
      location: "Sample Location",
      images: [],
    }

    return {
      _id: bookingId,
      propertyId: property._id || property.id,
      property: property,
      status: "approved",
      moveInDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentStatus: "pending",
      amount: property.price || 10000,
      depositAmount: Math.round((property.price || 10000) * 0.5), // 50% deposit
    }
  }

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setLoading(true)
        console.log("Fetching booking details for ID:", bookingId)

        // Check authentication
        const token = localStorage.getItem("token")
        if (!token) {
          console.warn("No authentication token found, proceeding with limited functionality")
        }

        // APPROACH 1: Use property data from location state (highest priority)
        if (propertyFromState) {
          console.log("Using property data from location state:", propertyFromState)
          setProperty(propertyFromState)

          // Create a mock booking if we don't have one
          const mockBooking = createMockBooking(bookingId, propertyFromState)
          setBooking(mockBooking)

          // Set default payment amount to 50% of property price
          const defaultAmount = Math.round((propertyFromState.price || 10000) * 0.5)
          setPaymentAmount(defaultAmount)

          // Save to localStorage for future reference
          localStorage.setItem(`booking_${bookingId}`, JSON.stringify(mockBooking))
          setLoading(false)
          return
        }

        // APPROACH 2: Try to get booking from localStorage
        const bookingData = localStorage.getItem(`booking_${bookingId}`)
        if (bookingData) {
          const bookingDetails = JSON.parse(bookingData)
          console.log("Booking data from localStorage:", bookingDetails)
          setBooking(bookingDetails)

          // If we have property ID but no property details yet, fetch them
          if (bookingDetails?.propertyId && !property) {
            try {
              const propertyDetails = await getPropertyById(bookingDetails.propertyId)
              setProperty(propertyDetails)

              // Set default payment amount to 50% of property price
              const defaultAmount = Math.round((propertyDetails.price || 10000) * 0.5)
              setPaymentAmount(defaultAmount)
            } catch (propertyError) {
              console.error("Error fetching property details:", propertyError)
              // If we already have property data in the booking, use that
              if (bookingDetails.property) {
                setProperty(bookingDetails.property)

                // Set default payment amount to 50% of property price
                const defaultAmount = Math.round((bookingDetails.property.price || 10000) * 0.5)
                setPaymentAmount(defaultAmount)
              }
            }
          } else if (bookingDetails?.property) {
            // If booking has property data embedded, use it
            setProperty(bookingDetails.property)

            // Set default payment amount to 50% of property price
            const defaultAmount = Math.round((bookingDetails.property.price || 10000) * 0.5)
            setPaymentAmount(defaultAmount)
          }

          setLoading(false)
          return
        }

        // APPROACH 3: Try to get data from URL params
        const urlParams = new URLSearchParams(window.location.search)
        const propertyId = urlParams.get("propertyId")

        if (propertyId) {
          console.log("Using URL params as fallback with propertyId:", propertyId)
          try {
            // Fetch property details
            const propertyDetails = await getPropertyById(propertyId)
            setProperty(propertyDetails)

            // Create a minimal booking object
            const bookingDetails = createMockBooking(bookingId, propertyDetails)

            // Set default payment amount to 50% of property price
            const defaultAmount = Math.round((propertyDetails.price || 10000) * 0.5)
            setPaymentAmount(defaultAmount)

            // Save to localStorage for future reference
            localStorage.setItem(`booking_${bookingId}`, JSON.stringify(bookingDetails))
            setBooking(bookingDetails)
          } catch (propertyError) {
            console.error("Error fetching property details:", propertyError)
            throw new Error("Failed to fetch property details")
          }
        } else {
          // APPROACH 4: Last resort - check if we have any properties in localStorage
          try {
            const storedPropertiesJson = localStorage.getItem("properties")
            if (storedPropertiesJson) {
              const storedProperties = JSON.parse(storedPropertiesJson)
              if (Array.isArray(storedProperties) && storedProperties.length > 0) {
                console.log("Using first property from localStorage as fallback")
                const fallbackProperty = storedProperties[0]
                setProperty(fallbackProperty)

                // Create a mock booking
                const mockBooking = createMockBooking(bookingId, fallbackProperty)

                // Set default payment amount to 50% of property price
                const defaultAmount = Math.round((fallbackProperty.price || 10000) * 0.5)
                setPaymentAmount(defaultAmount)

                setBooking(mockBooking)

                // Save to localStorage
                localStorage.setItem(`booking_${bookingId}`, JSON.stringify(mockBooking))
                return
              }
            }
          } catch (fallbackError) {
            console.error("Error with localStorage fallback:", fallbackError)
          }

          // If we get here, we have no data at all
          throw new Error("Booking details not found and no propertyId provided")
        }
      } catch (err) {
        console.error("Error fetching booking details:", err)
        setError("Failed to load booking details. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchBookingDetails()
  }, [bookingId, propertyFromState])

  const handlePayWithEsewa = () => {
    if (!booking || !property) {
      setError("Booking or property details not available")
      return
    }

    // Validate payment amount
    const propertyPrice = property.price || 10000
    const maxPaymentAmount = Math.round(propertyPrice * 0.5)

    let amountToPay = paymentAmount

    // If custom amount is selected, use that value
    if (customAmount && customAmountValue) {
      amountToPay = Number.parseInt(customAmountValue, 10)

      // Validate custom amount
      if (isNaN(amountToPay) || amountToPay <= 0) {
        setError("Please enter a valid payment amount")
        return
      }

      if (amountToPay > maxPaymentAmount) {
        setError(`Payment amount cannot exceed 50% of the property price (Rs. ${maxPaymentAmount.toLocaleString()})`)
        return
      }
    }

    try {
      setProcessingPayment(true)

      // Create eSewa payment with the selected amount
      const paymentDetails = {
        amount: amountToPay,
        bookingId: booking._id,
        propertyTitle: property.title || "Property Booking",
      }

      const { formUrl, formData } = createEsewaPayment(paymentDetails)

      // Create and submit form programmatically
      const form = document.createElement("form")
      form.method = "POST"
      form.action = formUrl
      form.style.display = "none"

      // Add form fields
      Object.keys(formData).forEach((key) => {
        const input = document.createElement("input")
        input.type = "hidden"
        input.name = key
        input.value = formData[key]
        form.appendChild(input)
      })

      // Add form to document and submit
      document.body.appendChild(form)
      form.submit()

      // Store payment attempt in localStorage
      localStorage.setItem(
        `payment_attempt_${bookingId}`,
        JSON.stringify({
          method: "esewa",
          amount: amountToPay,
          timestamp: new Date().toISOString(),
          transactionUuid: formData.transaction_uuid,
        }),
      )
    } catch (err) {
      console.error("Error processing eSewa payment:", err)
      setError("Failed to initiate payment. Please try again.")
      setProcessingPayment(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    // Force reload the current page
    window.location.reload()
  }

  const handleBackToHome = () => {
    navigate("/")
  }

  // Function to get property image with proper fallback
  const getPropertyImage = () => {
    if (!property) return "/placeholder.svg?height=300&width=400"

    // Check if property has images array
    if (property.images && Array.isArray(property.images) && property.images.length > 0) {
      // Find first non-empty image
      for (const img of property.images) {
        if (img) return getImageUrl(img)
      }
    }

    // If we have a single image property
    if (property.image) {
      return getImageUrl(property.image)
    }

    // Fallback to placeholder
    return "/placeholder.svg?height=300&width=400"
  }

  // Handle custom amount change
  const handleCustomAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setCustomAmountValue(value)
  }

  // Toggle between preset and custom amount
  const toggleCustomAmount = () => {
    setCustomAmount(!customAmount)
    if (!customAmount) {
      // When switching to custom, initialize with current amount
      setCustomAmountValue(paymentAmount.toString())
    }
  }

  // Toggle eSewa help section
  const toggleEsewaHelp = () => {
    setShowEsewaHelp(!showEsewaHelp)
  }

  if (loading) {
    return (
      <div className="payment-container">
        <div className="loading-spinner">Loading payment details...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="payment-container">
        <div className="error-message">
          <AlertCircle size={24} />
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={handleRetry} className="retry-button">
              <RefreshCw size={16} /> Retry
            </button>
            <button onClick={handleBackToHome} className="back-button">
              <ArrowLeft size={18} />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!booking || !property) {
    return (
      <div className="payment-container">
        <div className="error-message">
          <AlertCircle size={24} />
          <p>Booking or property details not found</p>
          <button onClick={handleBackToHome} className="back-button">
            <ArrowLeft size={18} />
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  // Calculate maximum payment amount (50% of property price)
  const propertyPrice = property.price || 10000
  const maxPaymentAmount = Math.round(propertyPrice * 0.5)

  // Use the selected amount directly without tax
  const selectedAmount = customAmount ? Number.parseInt(customAmountValue, 10) || 0 : paymentAmount
  const totalAmount = selectedAmount // No tax added

  return (
    <div className="payment-container">
      <div className="payment-card">
        <header className="payment-header">
          <h1>Complete Your Payment</h1>
          <Link to={`/booking-confirmation/${bookingId}`} className="back-button">
            <ArrowLeft size={18} />
            Back
          </Link>
        </header>

        <div className="payment-content">
          <div className="booking-summary">
            <h2>Booking Summary</h2>
            <div className="property-info">
              {imageError ? (
                <div className="property-thumbnail-fallback">
                  <ImageIcon size={40} />
                </div>
              ) : (
                <img
                  src={getPropertyImage() || "/placeholder.svg"}
                  alt={property.title || "Property"}
                  className="property-thumbnail"
                  onError={(e) => {
                    handleImageError(e)
                    setImageError(true)
                  }}
                />
              )}
              <div className="property-details">
                <h3>{property.title || "Property"}</h3>
                <p className="property-address">{property.location || property.address || "Location not specified"}</p>
                <p className="booking-id">Booking ID: {bookingId}</p>
              </div>
            </div>

            <div className="payment-info-box">
              <div className="payment-info-header">
                <Info size={20} />
                <h3>Payment Information</h3>
              </div>
              <p>
                You can pay any amount up to 50% of the property price (Rs.{" "}
                {Math.round(property.price * 0.5).toLocaleString()}) as a deposit.
              </p>
              <p className="refund-policy">
                <strong>Refund Policy:</strong> If you cancel your booking after making a payment, only 50% of your
                payment amount will be refundable.
              </p>
            </div>

            <div className="payment-amount-section">
              <h3>Select Payment Amount</h3>

              <div className="payment-amount-options">
                <div className="payment-amount-option">
                  <input
                    type="radio"
                    id="default-amount"
                    name="payment-amount-type"
                    checked={!customAmount}
                    onChange={() => setCustomAmount(false)}
                  />
                  <label htmlFor="default-amount">Pay maximum deposit (Rs. {maxPaymentAmount.toLocaleString()})</label>
                </div>

                <div className="payment-amount-option">
                  <input
                    type="radio"
                    id="custom-amount"
                    name="payment-amount-type"
                    checked={customAmount}
                    onChange={() => setCustomAmount(true)}
                  />
                  <label htmlFor="custom-amount">
                    Pay custom amount (up to Rs. {maxPaymentAmount.toLocaleString()})
                  </label>
                </div>
              </div>

              {customAmount && (
                <div className="custom-amount-input">
                  <label htmlFor="amount-input">Enter your desired amount (Rs.):</label>
                  <input
                    type="text"
                    id="amount-input"
                    value={customAmountValue}
                    onChange={handleCustomAmountChange}
                    placeholder={`Max: ${maxPaymentAmount.toLocaleString()}`}
                  />
                  {Number.parseInt(customAmountValue, 10) > maxPaymentAmount && (
                    <p className="amount-error">Amount cannot exceed Rs. {maxPaymentAmount.toLocaleString()}</p>
                  )}
                </div>
              )}
            </div>

            <div className="payment-details">
              <div className="payment-row">
                <span>Payment Amount</span>
                <span>Rs. {selectedAmount.toLocaleString()}</span>
              </div>
              <div className="payment-row total">
                <span>Total Amount</span>
                <span>Rs. {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="payment-methods">
            <h2>Select Payment Method</h2>
            <div className="payment-options">
              <div
                className={`payment-option ${paymentMethod === "esewa" ? "selected" : ""}`}
                onClick={() => setPaymentMethod("esewa")}
              >
                <div className="payment-option-logo">
                  <img src="/placeholder.svg?height=40&width=80" alt="eSewa" />
                </div>
                <div className="payment-option-details">
                  <h3>eSewa</h3>
                  <p>Pay securely using your eSewa account</p>
                </div>
                <div className="payment-option-radio">
                  <input
                    type="radio"
                    name="payment-method"
                    checked={paymentMethod === "esewa"}
                    onChange={() => setPaymentMethod("esewa")}
                  />
                </div>
              </div>
            </div>

            <button className="esewa-help-toggle" onClick={toggleEsewaHelp}>
              <HelpCircle size={16} />
              {showEsewaHelp ? "Hide eSewa Help" : "Need help with eSewa?"}
            </button>

            {showEsewaHelp && (
              <div className="esewa-help-section">
                <h3>eSewa Login Help</h3>
                <p>
                  You'll need an eSewa account to complete this payment. If you don't have one, you can register at{" "}
                  <a href="https://esewa.com.np" target="_blank" rel="noopener noreferrer">
                    esewa.com.np
                  </a>
                </p>
                <div className="esewa-tips">
                  <h4>Common Login Issues:</h4>
                  <ul>
                    <li>
                      <strong>Invalid eSewa ID or password:</strong> Make sure you're using the correct credentials.
                      Your eSewa ID is usually your registered mobile number.
                    </li>
                    <li>
                      <strong>Forgotten password:</strong> Use the "Forgot Password" option on the eSewa login page to
                      reset your password.
                    </li>
                    <li>
                      <strong>Account locked:</strong> If your account is locked due to multiple failed attempts,
                      contact eSewa customer support.
                    </li>
                  </ul>
                </div>
                <div className="esewa-test-credentials">
                  <h4>Test Credentials (For Development Only):</h4>
                  <p>When using eSewa in test mode, use these credentials:</p>
                  <ul>
                    <li>
                      <strong>eSewa ID:</strong> 9806800001
                    </li>
                    <li>
                      <strong>Password:</strong> Nepal@123
                    </li>
                    <li>
                      <strong>Token:</strong> 123456
                    </li>
                  </ul>
                  <p className="test-note">Note: These credentials only work in the eSewa sandbox environment.</p>
                </div>
                <div className="esewa-contact">
                  <p>
                    For further assistance, contact eSewa customer support at:
                    <br />
                    <strong>Phone:</strong> 9801110001 / 9801110002
                    <br />
                    <strong>Email:</strong> support@esewa.com.np
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="payment-actions">
            <button
              className="pay-now-button"
              onClick={handlePayWithEsewa}
              disabled={
                processingPayment ||
                (customAmount &&
                  (Number.parseInt(customAmountValue, 10) <= 0 ||
                    Number.parseInt(customAmountValue, 10) > maxPaymentAmount))
              }
            >
              {processingPayment ? (
                <>
                  <RefreshCw size={18} className="spinning" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  Pay Now with eSewa
                </>
              )}
            </button>
            <p className="payment-note">
              <AlertCircle size={16} />
              You will be redirected to eSewa to complete your payment
            </p>
          </div>
        </div>
      </div>

      {/* Hidden form for eSewa submission */}
      <div ref={esewaFormRef} style={{ display: "none" }}></div>
    </div>
  )
}
