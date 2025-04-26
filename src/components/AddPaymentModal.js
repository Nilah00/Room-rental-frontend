"use client"

import { useEffect } from "react"
import AddPaymentForm from "./AddPaymentForm"
import "./AddPaymentModal.css"

const AddPaymentModal = ({ isOpen, onClose, onSuccess, userId, propertyId }) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <AddPaymentForm
          onSuccess={(payment) => {
            onSuccess(payment)
            onClose()
          }}
          onCancel={onClose}
          userId={userId}
          propertyId={propertyId}
        />
      </div>
    </div>
  )
}

export default AddPaymentModal
