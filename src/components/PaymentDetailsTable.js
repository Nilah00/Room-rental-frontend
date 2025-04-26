"use client"

import { useState, useEffect } from "react"
import { getPaymentDetails } from "../services/adminApi"
import { formatNPR } from "./utils/formatters"
import { ArrowUp, ArrowDown, Search, RefreshCw, Plus } from "lucide-react"
import AddPaymentModal from "./AddPaymentModal"

const PaymentDetailsTable = ({ userId, propertyId }) => {
  const [payments, setPayments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: "transactionDate", direction: "descending" })
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" })
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false)

  useEffect(() => {
    fetchPaymentDetails()
  }, [userId, propertyId])

  const fetchPaymentDetails = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Prepare filters
      const filters = {}

      if (userId) filters.userId = userId
      if (propertyId) filters.propertyId = propertyId
      if (dateRange.startDate) filters.startDate = dateRange.startDate
      if (dateRange.endDate) filters.endDate = dateRange.endDate
      if (statusFilter !== "all") filters.status = statusFilter

      const paymentData = await getPaymentDetails(filters)
      setPayments(paymentData)
    } catch (err) {
      console.error("Error fetching payment details:", err)
      setError("Failed to load payment details. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle sorting
  const requestSort = (key) => {
    let direction = "ascending"
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Get sorted and filtered payments
  const getSortedAndFilteredPayments = () => {
    // First filter by search term
    const filteredPayments = payments.filter((payment) => {
      if (!searchTerm) return true

      const searchLower = searchTerm.toLowerCase()
      return (
        (payment.userName && payment.userName.toLowerCase().includes(searchLower)) ||
        (payment.propertyTitle && payment.propertyTitle.toLowerCase().includes(searchLower)) ||
        (payment.paymentMethod && payment.paymentMethod.toLowerCase().includes(searchLower)) ||
        (payment.id && payment.id.toLowerCase().includes(searchLower))
      )
    })

    // Then sort
    return filteredPayments.sort((a, b) => {
      let aValue = a[sortConfig.key]
      let bValue = b[sortConfig.key]

      // Handle dates
      if (sortConfig.key === "transactionDate") {
        aValue = new Date(aValue || 0).getTime()
        bValue = new Date(bValue || 0).getTime()
      }

      // Handle numbers
      if (sortConfig.key === "amount") {
        aValue = Number(aValue || 0)
        bValue = Number(bValue || 0)
      }

      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1
      }
      return 0
    })
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Update the getCorrectAmount function to properly prioritize the actual payment amount
  const getCorrectAmount = (payment) => {
    // First priority: Use actualPaymentAmount if available
    if (payment.actualPaymentAmount !== undefined && payment.actualPaymentAmount !== null) {
      return payment.actualPaymentAmount
    }

    // Second priority: Use the amount directly entered by the user
    if (payment.amount !== undefined && payment.amount !== null) {
      return payment.amount
    }

    // Third priority: If the payment has a specific displayAmount
    if (payment.displayAmount !== undefined && payment.displayAmount !== null) {
      return payment.displayAmount
    }

    // Fourth priority: For derived payments from bookings
    if (payment.isDerived && payment.bookingId && payment.paidAmount) {
      return payment.paidAmount
    }

    // Last resort: use the property price
    return payment.propertyListedPrice || 0
  }

  const handleAddPaymentSuccess = () => {
    fetchPaymentDetails() // Refresh the payment list
    setIsAddPaymentModalOpen(false)
  }

  const sortedAndFilteredPayments = getSortedAndFilteredPayments()

  return (
    <div className="payment-details-section">
      <div className="section-header">
        <h2>Payment Details</h2>
        <div className="filter-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} />
          </div>

          <div className="status-filter">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="date-filter">
            <input
              type="date"
              placeholder="Start Date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
            <span>to</span>
            <input
              type="date"
              placeholder="End Date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </div>

          <button onClick={fetchPaymentDetails} className="refresh-button">
            <RefreshCw size={16} /> Refresh
          </button>

          <button onClick={() => setIsAddPaymentModalOpen(true)} className="add-button">
            <Plus size={16} /> Add Payment
          </button>
        </div>
      </div>

      {isLoading ? (
        <p>Loading payment details...</p>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="payments-table-container">
          <table className="payments-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => requestSort("transactionDate")}>
                  Date
                  {sortConfig.key === "transactionDate" &&
                    (sortConfig.direction === "ascending" ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
                </th>
                <th>User</th>
                <th>Property</th>
                <th className="sortable" onClick={() => requestSort("amount")}>
                  Amount
                  {sortConfig.key === "amount" &&
                    (sortConfig.direction === "ascending" ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
                </th>
                <th>Status</th>
                <th>Payment Method</th>
                <th>Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredPayments.length > 0 ? (
                sortedAndFilteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.transactionDate)}</td>
                    <td>{payment.userName || "Unknown User"}</td>
                    <td>{payment.propertyTitle || "Unknown Property"}</td>
                    <td>{formatNPR(getCorrectAmount(payment))}</td>
                    <td>
                      <span className={`status-badge ${payment.status}`}>{payment.status || "unknown"}</span>
                    </td>
                    <td>{payment.paymentMethod || "Unknown"}</td>
                    <td>
                      <span className="transaction-id" title={payment.id}>
                        {payment.id ? payment.id.substring(0, 8) + "..." : "N/A"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="no-data">
                    No payment records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {isAddPaymentModalOpen && (
        <AddPaymentModal
          isOpen={isAddPaymentModalOpen}
          onClose={() => setIsAddPaymentModalOpen(false)}
          onSuccess={handleAddPaymentSuccess}
          userId={userId}
          propertyId={propertyId}
        />
      )}
    </div>
  )
}

export default PaymentDetailsTable
