"use client"

import { useState, useEffect } from "react"
import { getPaymentStats } from "../services/adminApi"
import { formatNPR } from "./utils/formatters"
import { DollarSign, CreditCard, BarChart2, TrendingUp, RefreshCw } from "lucide-react"

const PaymentSummary = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    successfulTransactions: 0,
    averageTransaction: 0,
    successRate: 0,
    recentPayments: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPaymentStats()
  }, [])

  const fetchPaymentStats = async () => {
    setIsLoading(true)
    try {
      const paymentStats = await getPaymentStats()
      setStats(paymentStats)
    } catch (error) {
      console.error("Error fetching payment stats:", error)
    } finally {
      setIsLoading(false)
    }
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

  // Update the getCorrectAmount function to properly handle payment amounts
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

  return (
    <div className="payment-summary-section">
      <div className="section-header">
        <h2>Payment Summary</h2>
        <button onClick={fetchPaymentStats} className="refresh-button" disabled={isLoading}>
          {isLoading ? (
            <>
              <RefreshCw className="spin" size={16} /> Loading...
            </>
          ) : (
            <>
              <RefreshCw size={16} /> Refresh
            </>
          )}
        </button>
      </div>

      <div className="payment-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Revenue</h3>
            <p className="stat-number">{formatNPR(stats.totalRevenue)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CreditCard size={24} />
          </div>
          <div className="stat-content">
            <h3>Transactions</h3>
            <p className="stat-number">
              {stats.successfulTransactions} / {stats.totalTransactions}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <BarChart2 size={24} />
          </div>
          <div className="stat-content">
            <h3>Average Payment</h3>
            <p className="stat-number">{formatNPR(stats.averageTransaction)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>Success Rate</h3>
            <p className="stat-number">{stats.successRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="recent-payments">
        <h3>Recent Payments</h3>
        {stats.recentPayments.length > 0 ? (
          <table className="recent-payments-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Property</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatDate(payment.transactionDate)}</td>
                  <td>{payment.userName || "Unknown User"}</td>
                  <td>{payment.propertyTitle || "Unknown Property"}</td>
                  <td>{formatNPR(getCorrectAmount(payment))}</td>
                  <td>
                    <span className={`status-badge ${payment.status}`}>{payment.status || "unknown"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">No recent payments found</p>
        )}
      </div>
    </div>
  )
}

export default PaymentSummary
