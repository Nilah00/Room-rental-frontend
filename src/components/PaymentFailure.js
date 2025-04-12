"use client"

import { useState, useEffect } from "react"
import { useSearchParams, Link, useNavigate } from "react-router-dom"
import { XCircle, RefreshCw, Home, CheckCircle } from "lucide-react"
import "./PaymentResult.css"
import { updatePaymentStatus } from "./bookingUtils"

export default function PaymentFailure() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const bookingId = searchParams.get("booking_id")
  const errorCode = searchParams.get("error_code")
  const errorMessage = searchParams.get("error_message")
  const [showForceSuccess, setShowForceSuccess] = useState(false)

  // Log all search params for debugging
  console.log("Payment failure params:", Object.fromEntries([...searchParams.entries()]))

  const handleTryAgain = () => {
    if (bookingId) {
      navigate(`/payment/${bookingId}`)
    } else {
      navigate("/bookings")
    }
  }

  const handleForceSuccess = () => {
    if (!bookingId) {
      alert("No booking ID found. Cannot force success.")
      return
    }

    try {
      // Get payment details from localStorage
      const paymentData = localStorage.getItem(`payment_attempt_${bookingId}`)

      if (!paymentData) {
        // Create mock payment data if none exists
        const mockPayment = {
          transactionUuid: "MOCK-" + Date.now(),
          amount: 5000, // Default amount
          status: "PENDING",
          timestamp: new Date().toISOString(),
          bookingId,
        }
        localStorage.setItem(`payment_attempt_${bookingId}`, JSON.stringify(mockPayment))

        // Use the mock data
        const updatedPayment = {
          ...mockPayment,
          status: "COMPLETE",
          transactionCode: "FORCED-SUCCESS",
          refId: "FORCED-SUCCESS",
          verifiedAt: new Date().toISOString(),
          forcedSuccess: true,
        }

        localStorage.setItem(`payment_${bookingId}`, JSON.stringify(updatedPayment))
      } else {
        // Use existing payment data
        const paymentAttempt = JSON.parse(paymentData)

        // Force success - skip verification entirely
        const updatedPayment = {
          ...paymentAttempt,
          status: "COMPLETE",
          transactionCode: "FORCED-SUCCESS",
          refId: "FORCED-SUCCESS",
          verifiedAt: new Date().toISOString(),
          forcedSuccess: true,
        }

        localStorage.setItem(`payment_${bookingId}`, JSON.stringify(updatedPayment))
      }

      // Update booking payment status
      updatePaymentStatus(bookingId, "COMPLETE")

      // Navigate to success page
      navigate(`/booking-confirmation/${bookingId}`)
    } catch (error) {
      console.error("Error forcing success:", error)
      alert("An error occurred while forcing success. Please try again.")
    }
  }

  // Show force success option after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowForceSuccess(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="payment-result-container">
      <div className="payment-result-card failure">
        <div className="result-icon">
          <XCircle size={64} />
        </div>

        <h1>Payment Verification Failed</h1>

        <div className="verification-error">
          <p className="error-message">Payment was not completed successfully</p>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
          {errorCode && <p className="error-code">Error code: {errorCode}</p>}
          <p>Please try again or use a different payment method.</p>

          <div className="error-details-section">
            <h4>Troubleshooting Information</h4>
            <div className="error-details">
              <p>If you're using the test environment, please use these credentials:</p>
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
              <p>Common issues:</p>
              <ul>
                <li>The eSewa sandbox environment might be temporarily down</li>
                <li>The test account might be locked due to too many failed attempts</li>
                <li>Network connectivity issues</li>
                <li>
                  <strong>Important:</strong> The eSewa test environment is known to have intermittent issues with
                  verification. If you're sure the payment went through on the eSewa side, you can use the "Force
                  Success" button below.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="result-actions">
          <button className="primary-action" onClick={handleTryAgain}>
            <RefreshCw size={18} />
            Try Payment Again
          </button>

          <Link to="/" className="secondary-action">
            <Home size={18} />
            Return to Home
          </Link>
        </div>

        {showForceSuccess && (
          <div className="force-success-section">
            <p>
              If you're sure the payment was successful on eSewa's side, you can force the system to mark it as
              successful:
            </p>
            <button className="force-success-button" onClick={handleForceSuccess}>
              <CheckCircle size={18} />
              Force Success (Testing Only)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
