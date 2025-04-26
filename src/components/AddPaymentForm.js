"use client"

import { useState, useEffect } from "react"
import { createPayment, getAllUsers, getProperties } from "../services/adminApi"
import { formatNPR } from "./utils/formatters"
import "./AddPaymentForm.css"

const AddPaymentForm = ({ onSuccess, onCancel, userId: initialUserId, propertyId: initialPropertyId }) => {
  const [formData, setFormData] = useState({
    userId: initialUserId || "",
    propertyId: initialPropertyId || "",
    amount: "",
    paymentMethod: "bank transfer",
    status: "completed",
    notes: "",
    bookingId: "",
  })

  const [users, setUsers] = useState([])
  const [properties, setProperties] = useState([])
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Fetch users and properties when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [usersData, propertiesData] = await Promise.all([getAllUsers(), getProperties()])
        setUsers(usersData)
        setProperties(propertiesData)
        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching form data:", err)
        setError("Failed to load users and properties. Please try again.")
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Update selected property when propertyId changes
  useEffect(() => {
    if (formData.propertyId && properties.length > 0) {
      const property = properties.find((p) => (p._id || p.id) === formData.propertyId)
      setSelectedProperty(property || null)
    } else {
      setSelectedProperty(null)
    }
  }, [formData.propertyId, properties])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Update the handleSubmit function to ensure actualPaymentAmount is set correctly
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Get the property price
      const propertyPrice = selectedProperty?.price || 0

      // Calculate the deposit amount (50% of property price) as per Payment.js
      const depositAmount = Math.round(propertyPrice * 0.5)

      // Create payment data object
      const paymentData = {
        ...formData,
        // Store property price separately
        propertyPrice: propertyPrice,
        // Store the deposit amount separately
        depositAmount: depositAmount,
        // Add property title for easier reference
        propertyTitle: selectedProperty?.title || "Unknown Property",
        // Add user name for easier reference
        userName: users.find((u) => (u._id || u.id) === formData.userId)?.name || "Unknown User",
        // Add transaction date
        transactionDate: new Date().toISOString(),
        // Store the user-entered amount as the actual payment amount
        actualPaymentAmount: formData.amount,
        // Set the payment method to esewa as default
        paymentMethod: formData.paymentMethod || "esewa",
      }

      const result = await createPayment(paymentData)
      setSuccess("Payment created successfully!")
      setIsLoading(false)

      // Reset form
      setFormData({
        userId: "",
        propertyId: "",
        amount: "",
        paymentMethod: "bank transfer",
        status: "completed",
        notes: "",
        bookingId: "",
      })

      // Call onSuccess callback
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      console.error("Error creating payment:", err)
      setError(err.message || "Failed to create payment. Please try again.")
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return <div className="loading">Loading form data...</div>
  }

  return (
    <div className="add-payment-form">
      <h2>Add New Payment</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="userId">User</label>
          <select
            id="userId"
            name="userId"
            value={formData.userId}
            onChange={handleChange}
            required
            disabled={isLoading || initialUserId}
          >
            <option value="">Select User</option>
            {users.map((user) => (
              <option key={user._id || user.id} value={user._id || user.id}>
                {user.name || user.email || "Unknown User"}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="propertyId">Property</label>
          <select
            id="propertyId"
            name="propertyId"
            value={formData.propertyId}
            onChange={handleChange}
            required
            disabled={isLoading || initialPropertyId}
          >
            <option value="">Select Property</option>
            {properties.map((property) => (
              <option key={property._id || property.id} value={property._id || property.id}>
                {property.title || "Unknown Property"}
              </option>
            ))}
          </select>
        </div>

        {selectedProperty && (
          <div className="property-info">
            <p>Listed Price: {formatNPR(selectedProperty.price || 0)}</p>
            <p className="note">
              Note: You can enter a different amount if the actual payment differs from the listed price.
            </p>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="amount">Payment Amount</label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="Enter actual payment amount"
            required
            min="0"
            step="0.01"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="paymentMethod">Payment Method</label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            required
            disabled={isLoading}
          >
            <option value="bank transfer">Bank Transfer</option>
            <option value="credit card">Credit Card</option>
            <option value="debit card">Debit Card</option>
            <option value="cash">Cash</option>
            <option value="mobile payment">Mobile Payment</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            disabled={isLoading}
          >
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="bookingId">Booking ID (Optional)</label>
          <input
            type="text"
            id="bookingId"
            name="bookingId"
            value={formData.bookingId}
            onChange={handleChange}
            placeholder="Enter booking ID if applicable"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes (Optional)</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Add any additional notes about this payment"
            disabled={isLoading}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-button" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Payment"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddPaymentForm
