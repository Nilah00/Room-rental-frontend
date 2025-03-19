"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Edit, Trash2, Home, Plus, Eye, ArrowUp, ArrowDown, Search, AlertCircle, Lock, RefreshCw } from "lucide-react"
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
  const [isLandlord, setIsLandlord] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [showPropertyManager, setShowPropertyManager] = useState(false)
  const [mapProperties, setMapProperties] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [propertyToDelete, setPropertyToDelete] = useState(null)

  useEffect(() => {
    // Get current user ID first
    const userJson = localStorage.getItem("user")
    if (userJson) {
      try {
        const user = JSON.parse(userJson)
        setCurrentUserId(user.id || user._id)
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }

    fetchProperties()
    checkUserRole()
  }, [])

  // Check user role and fetch map properties after role is determined
  useEffect(() => {
    if (isLandlord || isAdmin) {
      fetchMapProperties()
    }
  }, [isLandlord, isAdmin, currentUserId])

  useEffect(() => {
    const filtered = properties.filter(
      (property) =>
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredProperties(filtered)
  }, [searchTerm, properties])

  // Check if user is a landlord or admin
  const checkUserRole = () => {
    try {
      // Check if user is logged in
      const userJson = localStorage.getItem("user")
      if (!userJson) {
        setIsLandlord(false)
        setIsAdmin(false)
        setCurrentUserId(null)
        return
      }

      const user = JSON.parse(userJson)

      // Set current user ID
      setCurrentUserId(user.id || user._id)

      // Check if user is a landlord (has role property with value "landlord" or "owner")
      const isUserLandlord = user.role === "landlord" || user.role === "owner" || user.isLandlord === true
      setIsLandlord(isUserLandlord)

      // Check if user is an admin
      const isUserAdmin = user.role === "admin" || user.isAdmin === true || localStorage.getItem("adminToken") !== null
      setIsAdmin(isUserAdmin)

      console.log("User permissions:", {
        isLandlord: isUserLandlord,
        isAdmin: isUserAdmin,
        userId: user.id || user._id,
      })
    } catch (error) {
      console.error("Error checking user permissions:", error)
      setIsLandlord(false)
      setIsAdmin(false)
      setCurrentUserId(null)
    }
  }

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

  // Function to fetch properties from localStorage for the map
  const fetchMapProperties = async () => {
    try {
      // Use the same API call that's used for regular properties
      // This ensures consistent filtering based on user permissions
      const response = await getUserProperties()

      if (!response.data || !Array.isArray(response.data)) {
        console.log("No map properties found or invalid response format")
        setMapProperties([])
        return
      }

      console.log("Retrieved map properties from API:", response.data)

      // Filter out properties with invalid coordinates
      const validProperties = response.data.filter((property) => {
        const lat = Number(property.latitude)
        const lng = Number(property.longitude)
        const hasValidCoords = validateCoordinates(lat, lng)

        if (!hasValidCoords) {
          console.log(`Filtering out property with invalid coordinates: ${property._id || property.id}`)
        }

        return hasValidCoords
      })

      console.log(`Found ${validProperties.length} valid map properties`)
      setMapProperties(validProperties)
    } catch (error) {
      console.error("Error fetching map properties:", error)
      setMapProperties([])
    }
  }

  // Function to validate coordinates
  const validateCoordinates = (lat, lng) => {
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  }

  const handleEdit = (propertyId) => {
    navigate(`/edit-property/${propertyId}`)
  }

  // Function to check if user owns a property
  const userOwnsProperty = (property) => {
    if (!property || !currentUserId) return false

    try {
      // Check if property owner matches user ID
      const propertyOwnerId = property.owner?._id || property.owner?.id || property.ownerId

      return propertyOwnerId === currentUserId
    } catch (error) {
      console.error("Error checking property ownership:", error)
      return false
    }
  }

  const handleDelete = async (propertyId, propertyTitle) => {
    if (isDeleting) return

    try {
      // Find the property
      const property = properties.find((p) => p._id === propertyId)

      // Check if user is authorized to delete this property
      if (!isAdmin && !isLandlord) {
        setDeleteError("You don't have permission to delete properties.")
        setTimeout(() => setDeleteError(""), 3000)
        return
      }

      // If user is a landlord but not admin, check if they own the property
      if (isLandlord && !isAdmin && !userOwnsProperty(property)) {
        setDeleteError("You can only delete your own properties.")
        setTimeout(() => setDeleteError(""), 3000)
        return
      }

      // Set the property to delete and show the confirmation modal
      setPropertyToDelete({ id: propertyId, title: propertyTitle })
      setShowDeleteModal(true)
    } catch (error) {
      console.error("Error preparing to delete property:", error)
      setDeleteError(`Failed to delete property: ${error.message}`)
      setTimeout(() => setDeleteError(""), 3000)
    }
  }

  // Function to delete a property from the map
  const deleteMapProperty = (propertyId) => {
    try {
      // Check if user is authorized to delete properties
      if (!isAdmin && !isLandlord) {
        setDeleteError("You don't have permission to delete properties.")
        setTimeout(() => setDeleteError(""), 3000)
        return
      }

      // Find the property
      const property = mapProperties.find((p) => (p._id || p.id) === propertyId)

      // If user is a landlord but not admin, check if they own the property
      if (isLandlord && !isAdmin && !userOwnsProperty(property)) {
        setDeleteError("You can only delete your own properties.")
        setTimeout(() => setDeleteError(""), 3000)
        return
      }

      // Set the property to delete and show the confirmation modal
      setPropertyToDelete({ id: propertyId, title: property?.title || "this property", isMapProperty: true })
      setShowDeleteModal(true)
    } catch (error) {
      console.error("Error preparing to delete map property:", error)
      setDeleteError(`Failed to delete property from map: ${error.message}`)
      setTimeout(() => setDeleteError(""), 3000)
    }
  }

  // Function to reset all properties in localStorage - ADMIN ONLY
  const resetMapProperties = () => {
    if (!isAdmin) {
      setDeleteError("Only administrators can reset all properties.")
      setTimeout(() => setDeleteError(""), 3000)
      return
    }

    if (window.confirm("This will remove ALL properties from the map. Are you sure?")) {
      localStorage.removeItem("properties")
      console.log("All properties have been removed from localStorage")
      setMapProperties([])

      // Dispatch event to notify other components
      window.dispatchEvent(new Event("storage"))

      alert("All properties have been removed from the map.")
    }
  }

  const confirmDeletion = async () => {
    if (!propertyToDelete) return

    setIsDeleting(true)

    try {
      const { id: propertyId, isMapProperty } = propertyToDelete

      // First, update localStorage directly to ensure the map is updated immediately
      const storedPropertiesJson = localStorage.getItem("properties")
      if (storedPropertiesJson) {
        const storedProperties = JSON.parse(storedPropertiesJson)
        const updatedProperties = storedProperties.filter((property) => {
          // Use both _id and id for comparison to ensure all matching properties are removed
          const propId = property._id || property.id
          return propId !== propertyId
        })

        // Save the updated properties back to localStorage
        localStorage.setItem("properties", JSON.stringify(updatedProperties))
        console.log(`Property ${propertyId} removed from localStorage`)

        // Update the map properties state
        setMapProperties(updatedProperties.filter((p) => validateCoordinates(Number(p.latitude), Number(p.longitude))))
      }

      // If it's not just a map property, also delete from the API
      if (!isMapProperty) {
        try {
          await deleteProperty(propertyId)
        } catch (apiError) {
          console.error("API Error deleting property:", apiError)
        }
      }

      // Update the UI
      setProperties((prev) => prev.filter((prop) => prop._id !== propertyId))
      setFilteredProperties((prev) => prev.filter((prop) => prop._id !== propertyId))

      // Force a refresh of the map by dispatching an event
      window.dispatchEvent(new Event("storage"))

      // Also dispatch the propertyDeleted event for any other components
      window.dispatchEvent(
        new CustomEvent("propertyDeleted", {
          detail: { propertyId },
        }),
      )
    } catch (error) {
      console.error("Error deleting property:", error)
      setDeleteError(`Failed to delete property: ${error.message}`)
      setTimeout(() => setDeleteError(""), 3000)
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
      setPropertyToDelete(null)
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

  // Function to refresh map properties
  const refreshMapProperties = () => {
    fetchMapProperties()
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
        <div className="left-actions">
          <Link to="/add-property" className="add-property-button">
            <Plus size={18} />
            Add New Property
          </Link>
          {(isLandlord || isAdmin) && (
            <button onClick={() => setShowPropertyManager(!showPropertyManager)} className="manage-map-btn">
              {showPropertyManager ? "Hide Map Properties" : "Show Map Properties"}
            </button>
          )}
        </div>
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search properties..." value={searchTerm} onChange={handleSearch} />
        </div>
      </div>

      {deleteError && (
        <div className="error-message-banner">
          <AlertCircle size={18} />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Map Property Manager Section */}
      {showPropertyManager && (isLandlord || isAdmin) && (
        <div className="map-property-manager">
          <div className="map-manager-header">
            <h3>Map Property Manager {isAdmin && <span className="admin-badge">Landlord</span>}</h3>
            <button onClick={refreshMapProperties} className="refresh-map-btn">
              <RefreshCw size={16} /> Refresh Map Properties
            </button>
          </div>

          <p>
            {isAdmin
              ? "As a Landlord, you can manage all properties on the map."
              : "You can manage your properties displayed on the map."}
          </p>

          {mapProperties.length === 0 ? (
            <div className="no-map-properties">
              <p>You don't have any properties on the map.</p>
            </div>
          ) : (
            <div className="map-property-list">
              {mapProperties.map((property) => {
                const propertyId = property._id || property.id
                return (
                  <div key={propertyId} className="map-property-item">
                    <div className="map-property-info">
                      <strong>{property.title || "Unnamed Property"}</strong>
                      <span>{property.location || "Unknown location"}</span>
                      <span className="map-property-coords">
                        [{property.latitude.toFixed(4)}, {property.longitude.toFixed(4)}]
                      </span>
                    </div>
                    <button
                      onClick={() => deleteMapProperty(propertyId)}
                      className="delete-map-property-btn"
                      title="Delete this property from the map"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Regular Properties Table */}
      <h2 className="section-title">Your Properties</h2>
      {!filteredProperties || filteredProperties.length === 0 ? (
        <div className="no-properties-message">
          <p>No properties found.</p>
          <p>Add a new property.</p>
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
                      {isAdmin || userOwnsProperty(property) ? (
                        <>
                          <button
                            onClick={() => handleEdit(property._id)}
                            className="edit-button"
                            title="Edit property"
                          >
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
                        </>
                      ) : (
                        <span className="locked-icon" title="You don't own this property">
                          <Lock size={16} />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showDeleteModal && propertyToDelete && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="delete-modal-header">
              <h3>Confirm Deletion</h3>
            </div>
            <div className="delete-modal-body">
              <p>
                Are you sure you want to delete <strong>"{propertyToDelete.title}"</strong>?
              </p>
              <p className="delete-warning">This action cannot be undone.</p>
            </div>
            <div className="delete-modal-footer">
              <button
                className="cancel-button"
                onClick={() => {
                  setShowDeleteModal(false)
                  setPropertyToDelete(null)
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button className="confirm-delete-button" onClick={confirmDeletion} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete Property"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

