import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Edit, Trash2, Home, Plus } from "lucide-react"
import { getUserProperties, deleteProperty } from "../services/api"
import { getImageUrl } from "./imageUtils"
import "./ManageProperty.css"

export default function ManageProperties() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      setLoading(true)
      const response = await getUserProperties()
      setProperties(response.data)
    } catch (err) {
      console.error("Error fetching properties:", err)
      setError("Failed to fetch properties. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (propertyId) => {
    navigate(`/edit-property/${propertyId}`)
  }

  const handleDelete = async (propertyId, propertyTitle) => {
    if (isDeleting) return

    try {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${propertyTitle}"? This action cannot be undone.`,
      )

      if (confirmed) {
        setIsDeleting(true)
        await deleteProperty(propertyId)
        setProperties((prev) => prev.filter((prop) => prop._id !== propertyId))
        alert("Property deleted successfully!")
      }
    } catch (error) {
      console.error("Error deleting property:", error)
      alert(`Failed to delete property: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="manage-properties-container">
        <div className="loading-message">Loading your properties...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="manage-properties-container">
        <div className="error-message">
          {error}
          <button onClick={fetchProperties} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="manage-properties-container">
      <header className="manage-properties-header">
        <h1>Manage Your Properties</h1>
        <Link to="/" className="back-home-button">
          <Home size={18} />
          Back to Home
        </Link>
      </header>

      <div className="actions-bar">
        <Link to="/add-property" className="add-property-button">
          <Plus size={18} />
          Add New Property
        </Link>
      </div>

      {!properties || properties.length === 0 ? (
        <div className="no-properties-message">
          <p>You haven't added any properties yet.</p>
          <p>Click the "Add New Property" button to get started!</p>
        </div>
      ) : (
        <div className="properties-grid">
          {properties.map((property) => (
            <div key={property._id} className="property-card">
              <div className="property-image-container">
                <img
                  src={property.images?.[0] ? getImageUrl(property.images[0]) : "/placeholder.svg"}
                  alt={property.title}
                  className="property-image"
                  onError={(e) => {
                    console.error("Image failed to load:", e.target.src)
                    e.target.src = "/placeholder.svg"
                    e.target.onerror = null
                  }}
                />
              </div>
              <div className="property-details">
                <h2>{property.title || "Untitled Property"}</h2>
                <p className="property-location">{property.location || "Location not specified"}</p>
                <p className="property-price">Rs {property.price ? property.price.toLocaleString() : "N/A"}/month</p>
                <div className="property-actions">
                  <button onClick={() => handleEdit(property._id)} className="edit-button" title="Edit property">
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(property._id, property.title)}
                    className="delete-button"
                    title="Delete property"
                    disabled={isDeleting}
                  >
                    <Trash2 size={16} />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

