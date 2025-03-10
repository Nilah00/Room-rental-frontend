"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Edit, Trash2, Home, Plus, Eye, ArrowUp, ArrowDown, Search } from "lucide-react"
import { getUserProperties, deleteProperty, updatePropertyStatus, getFeaturedProperties } from "../services/api"
import { getImageUrl } from "./imageUtils"
import "./ManageProperty.css"

export default function ManageProperties() {
  const [properties, setProperties] = useState([])
  const [filteredProperties, setFilteredProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortOrder, setSortOrder] = useState("asc")
  const [searchTerm, setSearchTerm] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProperties()
  }, [])

  useEffect(() => {
    const filtered = properties.filter(
      (property) =>
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredProperties(filtered)
  }, [searchTerm, properties])

  const fetchProperties = async () => {
    try {
      setLoading(true)
      const response = await getUserProperties()
      setProperties(response.data)
      setFilteredProperties(response.data)
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
        setFilteredProperties((prev) => prev.filter((prop) => prop._id !== propertyId))
        alert("Property deleted successfully!")
      }
    } catch (error) {
      console.error("Error deleting property:", error)
      alert(`Failed to delete property: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStatusChange = async (propertyId, newStatus) => {
    if (updatingStatus) return

    try {
      setUpdatingStatus(true)
      console.log(`Attempting to update property ${propertyId} status to ${newStatus}`)

      // Create the status update data
      const statusData = {
        status: newStatus,
      }

      // Make the API call and get the updated property
      const updatedProperty = await updatePropertyStatus(propertyId, statusData)
      console.log("Status update result:", updatedProperty)

      if (!updatedProperty || !updatedProperty._id) {
        throw new Error("Invalid response from server")
      }

      // Verify the status was updated correctly
      console.log("Updated property status:", updatedProperty.status)

      // Update the local state with the complete updated property data
      setProperties((prev) => prev.map((prop) => (prop._id === propertyId ? updatedProperty : prop)))

      setFilteredProperties((prev) => prev.map((prop) => (prop._id === propertyId ? updatedProperty : prop)))

      // Force a refresh of the featured properties
      try {
        await getFeaturedProperties()
        // Dispatch an event to update the home page's featured listings
        window.dispatchEvent(
          new CustomEvent("propertyStatusUpdated", {
            detail: { updatedProperty },
          }),
        )
      } catch (error) {
        console.error("Error refreshing featured properties:", error)
      }

      alert(`Property status updated to "${newStatus}". The changes will be reflected across the site.`)
    } catch (error) {
      console.error("Error updating property status:", error)
      alert(`Failed to update property status: ${error.message || "Please try again"}`)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleSort = () => {
    const newSortOrder = sortOrder === "asc" ? "desc" : "asc"
    setSortOrder(newSortOrder)
    const sorted = [...filteredProperties].sort((a, b) => {
      if (newSortOrder === "asc") {
        return a.price - b.price
      } else {
        return b.price - a.price
      }
    })
    setFilteredProperties(sorted)
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
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
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search properties..." value={searchTerm} onChange={handleSearch} />
        </div>
      </div>

      {!filteredProperties || filteredProperties.length === 0 ? (
        <div className="no-properties-message">
          <p>No properties found.</p>
          <p>Add a new property or try a different search term.</p>
        </div>
      ) : (
        <div className="properties-table-container">
          <table className="properties-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title</th>
                <th>Location</th>
                <th onClick={handleSort} className="sortable-header">
                  Price
                  {sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProperties.map((property) => (
                <tr key={property._id}>
                  <td>
                    <img
                      src={property.images?.[0] ? getImageUrl(property.images[0]) : "/placeholder.svg"}
                      alt={property.title}
                      className="property-thumbnail"
                      onError={(e) => {
                        console.error("Image failed to load:", e.target.src)
                        e.target.src = "/placeholder.svg"
                        e.target.onerror = null
                      }}
                    />
                  </td>
                  <td>{property.title || "Untitled Property"}</td>
                  <td>{property.location || "Location not specified"}</td>
                  <td>Rs {property.price ? property.price.toLocaleString() : "N/A"}/month</td>
                  <td>
                    <select
                      className="property-status-select"
                      value={property.status || "Available"}
                      onChange={(e) => {
                        console.log("Changing status from", property.status, "to", e.target.value)
                        handleStatusChange(property._id, e.target.value)
                      }}
                      disabled={updatingStatus}
                    >
                      <option value="Available">Available</option>
                      <option value="Booked">Booked</option>
                      <option value="Not Available">Not Available</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Reserved">Reserved</option>
                    </select>
                  </td>
                  <td>
                    <div className="property-actions">
                      <button
                        onClick={() => navigate(`/room/${property._id}`)}
                        className="view-button"
                        title="View property"
                      >
                        <Eye size={16} />
                      </button>
                      <button onClick={() => handleEdit(property._id)} className="edit-button" title="Edit property">
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(property._id, property.title)}
                        className="delete-button"
                        title="Delete property"
                        disabled={isDeleting}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

