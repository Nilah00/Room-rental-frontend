"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Edit,
  Trash2,
  Home,
  Plus,
  Eye,
  ArrowUp,
  ArrowDown,
  Search,
  AlertCircle,
  RefreshCw,
  Calendar,
  MapPin,
  X,
} from "lucide-react"
import { getUserProperties, updatePropertyStatus, getFeaturedProperties, deleteProperty } from "../services/api"
import { getImageUrl } from "./imageUtils"
import "./ManageProperty.css"

export default function ManageProperties() {
  const [properties, setProperties] = useState([])
  const [filteredProperties, setFilteredProperties] = useState([])
  const [mapProperties, setMapProperties] = useState([])
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
  const [currentUserId, setCurrentUserId] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [propertyToDelete, setPropertyToDelete] = useState(null)
  const [showMapPropertiesModal, setShowMapPropertiesModal] = useState(false)
  const [mapPropertiesLoading, setMapPropertiesLoading] = useState(false)

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
      // We're no longer fetching map properties here by default
      // fetchMapProperties()
    }
  }, [isLandlord, isAdmin, currentUserId])

  useEffect(() => {
    const filtered = properties.filter(
      (property) =>
        property.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredProperties(filtered)
  }, [searchTerm, properties])

  // Check if user is a landlord or admin
  const checkUserRole = () => {
    try {
      // Check if user is logged in
      const userJson = localStorage.getItem("user")
      if (!userJson) {
        // Force roles to true even if not logged in
        setIsLandlord(true)
        setIsAdmin(true)
        setCurrentUserId("default-user")
        return
      }

      const user = JSON.parse(userJson)

      // Set current user ID
      setCurrentUserId(user.id || user._id || "default-user")

      // Force landlord and admin roles to true
      setIsLandlord(true)
      setIsAdmin(true)

      console.log("User permissions overridden:", {
        isLandlord: true,
        isAdmin: true,
        userId: user.id || user._id || "default-user",
      })
    } catch (error) {
      console.error("Error checking user permissions:", error)
      // Force roles to true even on error
      setIsLandlord(true)
      setIsAdmin(true)
      setCurrentUserId("default-user")
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

  // Function to validate coordinates
  const validateCoordinates = (lat, lng) => {
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  }

  // Function to fetch map properties from localStorage
  const fetchMapProperties = () => {
    try {
      setMapPropertiesLoading(true)

      // Get properties from localStorage
      const storedPropertiesJson = localStorage.getItem("properties")
      if (!storedPropertiesJson) {
        console.log("No properties found in localStorage")
        setMapProperties([])
        setMapPropertiesLoading(false)
        return
      }

      let storedProperties = JSON.parse(storedPropertiesJson)
      console.log("Retrieved properties from localStorage:", storedProperties.length)

      if (!Array.isArray(storedProperties)) {
        console.error("Properties in localStorage is not an array:", storedProperties)
        setMapProperties([])
        setMapPropertiesLoading(false)
        return
      }

      // Filter out properties marked as deleted
      storedProperties = storedProperties.filter((property) => !property.isDeleted)
      console.log("After filtering deleted properties:", storedProperties.length)

      // Get the current user ID from localStorage
      const userJson = localStorage.getItem("user")
      let userId = null
      if (userJson) {
        try {
          const user = JSON.parse(userJson)
          userId = user.id || user._id
          console.log("Current user ID for filtering map properties:", userId)
        } catch (error) {
          console.error("Error parsing user data:", error)
        }
      }

      // Filter properties by owner if user ID is available
      if (userId) {
        storedProperties = storedProperties.filter((property) => {
          const propertyOwnerId = property.owner?._id || property.owner?.id || property.ownerId

          // If property has no owner info, keep it for backward compatibility
          if (!propertyOwnerId) {
            console.log(`Property ${property._id || property.id} has no owner info, keeping it visible`)
            return true
          }

          const isOwner = String(propertyOwnerId) === String(userId)

          if (!isOwner) {
            console.log(`Filtering out property not owned by current user: ${property._id || property.id}`)
          }

          return isOwner
        })
        console.log("After filtering by owner:", storedProperties.length)
      } else {
        console.log("No user ID available, showing all properties")
      }

      // Filter properties with valid coordinates
      const validProperties = storedProperties.filter((property) => {
        // Check coordinates
        const lat = Number(property.latitude)
        const lng = Number(property.longitude)
        const hasValidCoords = validateCoordinates(lat, lng)

        if (!hasValidCoords) {
          console.log(`Filtering out property with invalid coordinates: ${property._id || property.id}`)
          return false
        }

        return true
      })

      console.log("Valid properties for map:", validProperties.length)

      // Ensure each property has a unique ID for React keys
      const propertiesWithUniqueKeys = validProperties.map((property, index) => {
        if (!property._id && !property.id) {
          return { ...property, id: `temp-id-${index}` }
        }
        return property
      })

      // Set map properties state
      setMapProperties(propertiesWithUniqueKeys)
      setMapPropertiesLoading(false)
    } catch (error) {
      console.error("Error fetching map properties:", error)
      setMapProperties([])
      setMapPropertiesLoading(false)
    }
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

      // Strict comparison to ensure correct ownership
      return String(propertyOwnerId) === String(currentUserId)
    } catch (error) {
      console.error("Error checking property ownership:", error)
      return false
    }
  }

  // Modify the handleDelete function to set up the deletion modal
  const handleDelete = async (propertyId, propertyTitle) => {
    if (isDeleting) return

    try {
      // Find the property
      const property = properties.find((p) => p._id === propertyId)

      // Set the property to delete and show the confirmation modal
      setPropertyToDelete({
        id: propertyId,
        title: propertyTitle,
      })
      setShowDeleteModal(true)
    } catch (error) {
      console.error("Error preparing to delete property:", error)
      setDeleteError(`Failed to delete property: ${error.message}`)
      setTimeout(() => setDeleteError(""), 3000)
    }
  }

  // Update the handleDeleteMapProperty function to only delete from map
  const handleDeleteMapProperty = (property) => {
    const propertyId = property._id || property.id
    const propertyTitle = property.title || "Unnamed Property"

    if (window.confirm(`Are you sure you want to delete "${propertyTitle}" from the map?`)) {
      deleteFromMap(propertyId)
      alert(`Property successfully removed from the map.`)
    }
  }

  // Function to delete a property from the map
  const deleteMapProperty = (propertyId) => {
    try {
      console.log(`MAP DELETE: Starting deletion for property ID: ${propertyId}`)

      // Get properties from localStorage
      const storedPropertiesJson = localStorage.getItem("properties")
      if (!storedPropertiesJson) {
        console.log("No properties found in localStorage")
        return
      }

      // Parse the properties
      const storedProperties = JSON.parse(storedPropertiesJson)
      console.log(`Found ${storedProperties.length} properties in localStorage before deletion`)

      // Find the property to delete
      const propertyToDelete = storedProperties.find((p) => {
        const id = p._id || p.id
        return id === propertyId
      })

      if (!propertyToDelete) {
        console.log(`Property with ID ${propertyId} not found in localStorage`)
        return
      }

      console.log(`Found property to delete: ${propertyToDelete.title} (${propertyId})`)

      // Remove the property from the array
      const updatedProperties = storedProperties.filter((p) => {
        const id = p._id || p.id
        const stringId = String(id)
        const stringPropertyId = String(propertyId)

        // Check multiple formats of the ID to ensure we catch it
        const keepProperty = stringId !== stringPropertyId && stringId !== `"${stringPropertyId}"` && id !== propertyId

        console.log(`Property ${id}: ${keepProperty ? "keeping" : "REMOVING from map"}`)
        return keepProperty
      })

      console.log(`After filtering: ${updatedProperties.length} properties remain in map`)

      // Save the updated array back to localStorage
      localStorage.setItem("properties", JSON.stringify(updatedProperties))
      console.log(`Property ${propertyId} removed from map (localStorage)`)

      // Update the map properties state
      setMapProperties((prev) => prev.filter((p) => (p._id || p.id) !== propertyId))

      // Dispatch events to notify other components
      window.dispatchEvent(
        new CustomEvent("propertyDeleted", {
          detail: { propertyId },
        }),
      )
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new Event("localStorageUpdated"))

      // Force refresh the map if the global function exists
      if (typeof window.forceRefreshMap === "function") {
        console.log("Calling global forceRefreshMap function")
        setTimeout(() => window.forceRefreshMap(), 300)
      }

      alert(`Property successfully removed from the map.`)
    } catch (error) {
      console.error("Error deleting map property:", error)
      alert(`Failed to delete property from map: ${error.message}`)
    }
  }

  // Modify the resetMapProperties function to show the map properties modal
  const resetMapProperties = () => {
    // Fetch map properties and show the modal
    fetchMapProperties()
    setShowMapPropertiesModal(true)
  }

  // Function to completely clear all map properties
  const clearAllMapProperties = () => {
    if (window.confirm("This will COMPLETELY REMOVE ALL properties from the map. Are you sure?")) {
      try {
        console.log("AGGRESSIVE CLEAR: Removing all properties from localStorage")

        // Completely remove the properties key from localStorage
        localStorage.removeItem("properties")

        // Set an empty array as a fallback
        localStorage.setItem("properties", JSON.stringify([]))

        console.log("All properties have been removed from localStorage")

        // Update the map properties state
        setMapProperties([])

        // Dispatch events to notify other components
        window.dispatchEvent(new Event("storage"))
        window.dispatchEvent(new Event("localStorageUpdated"))

        // Force refresh the map if the global function exists
        if (typeof window.forceRefreshMap === "function") {
          console.log("Calling global forceRefreshMap function")
          setTimeout(() => window.forceRefreshMap(), 300)
        }

        // Close the modal
        setShowMapPropertiesModal(false)

        alert("All properties have been completely removed from the map.")
      } catch (error) {
        console.error("Error clearing properties:", error)
        setDeleteError(`Failed to clear properties: ${error.message}`)
        setTimeout(() => setDeleteError(""), 3000)
      }
    }
  }

  // Modify the confirmDeletion function to only handle database deletion
  const confirmDeletion = async (property) => {
    try {
      setIsDeleting(true)
      setShowDeleteModal(false)

      console.log("LANDLORD DELETE: Starting deletion process for property:", property)
      const propertyId = property.id || property._id
      console.log("LANDLORD DELETE: Property ID to delete:", propertyId)

      // Call the API to delete the property from the database
      await deleteProperty(propertyId)
      console.log("LANDLORD DELETE: Property deleted from database successfully")

      // Remove from landlord properties state
      setProperties((prevProperties) => prevProperties.filter((p) => (p.id || p._id) !== propertyId))

      setFilteredProperties((prevProperties) => prevProperties.filter((p) => (p.id || p._id) !== propertyId))

      // Always delete from map when deleting from database
      console.log("LANDLORD DELETE: Also deleting from map")
      deleteFromMap(propertyId)

      alert("Property deleted successfully from landlord list!")
    } catch (error) {
      console.error("LANDLORD DELETE ERROR:", error)
      alert("Error deleting property from database. Please try again.")
    } finally {
      setIsDeleting(false)
      setPropertyToDelete(null)
    }
  }

  // Add a new function to handle map deletion
  const deleteFromMap = (propertyId) => {
    try {
      console.log(`MAP DELETE: Starting deletion for property ID: ${propertyId}`)

      // Get properties from localStorage
      const storedPropertiesJson = localStorage.getItem("properties")
      if (!storedPropertiesJson) {
        console.log("No properties found in localStorage")
        return
      }

      // Parse the properties
      const storedProperties = JSON.parse(storedPropertiesJson)
      console.log(`Found ${storedProperties.length} properties in localStorage before deletion`)

      // Find the property to delete
      const propertyToDelete = storedProperties.find((p) => {
        const id = p._id || p.id
        return id === propertyId
      })

      if (!propertyToDelete) {
        console.log(`Property with ID ${propertyId} not found in localStorage`)
        return
      }

      console.log(`Found property to delete: ${propertyToDelete.title} (${propertyId})`)

      // Remove the property from the array
      const updatedProperties = storedProperties.filter((p) => {
        const id = p._id || p.id
        const stringId = String(id)
        const stringPropertyId = String(propertyId)

        // Check multiple formats of the ID to ensure we catch it
        const keepProperty = stringId !== stringPropertyId && stringId !== `"${stringPropertyId}"` && id !== propertyId

        console.log(`Property ${id}: ${keepProperty ? "keeping" : "REMOVING from map"}`)
        return keepProperty
      })

      console.log(`After filtering: ${updatedProperties.length} properties remain in map`)

      // Save the updated array back to localStorage
      localStorage.setItem("properties", JSON.stringify(updatedProperties))
      console.log(`Property ${propertyId} removed from map (localStorage)`)

      // Update the map properties state if the modal is open
      if (showMapPropertiesModal) {
        setMapProperties((prev) => prev.filter((p) => (p._id || p.id) !== propertyId))
      }

      // Dispatch events to notify other components
      window.dispatchEvent(
        new CustomEvent("propertyDeleted", {
          detail: { propertyId },
        }),
      )
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new Event("localStorageUpdated"))

      // Force refresh the map if the global function exists
      if (typeof window.forceRefreshMap === "function") {
        console.log("Calling global forceRefreshMap function")
        setTimeout(() => window.forceRefreshMap(), 300)
      }
    } catch (error) {
      console.error("Error deleting map property:", error)
      console.log(`Failed to delete property from map: ${error.message}`)
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
        <h1>Manage Landlord Properties</h1>
        <Link to="/" className="back-home-button">
          <Home size={18} />
          Back to Home
        </Link>
      </header>

      {/* Booking Management Card - Positioned at the top */}
      <div className="booking-card-top">
        <div className="booking-card-content">
          <Calendar size={18} className="booking-icon" />
          <span className="booking-text">Manage booking requests for your properties</span>
          <Link to="/manage-bookings" className="booking-card-button">
            Manage Bookings
          </Link>
        </div>
      </div>

      <div className="actions-bar">
        <div className="left-actions">
          <Link to="/add-property" className="add-property-button">
            <Plus size={18} />
            Add New Property
          </Link>
          {/* Make the map properties button visible to all users */}
          <button onClick={resetMapProperties} className="manage-map-btn" style={{ display: "flex" }}>
            <MapPin size={16} /> Manage Map Properties
          </button>
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

      {/* Regular Properties Table */}
      <h2 className="section-title">Landlord Properties</h2>
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
                      <option value="Pending">Pending</option>
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
                        title="Force delete property"
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

      {/* Property Deletion Confirmation Modal */}
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
              <button
                className="confirm-delete-button"
                onClick={() => confirmDeletion(propertyToDelete)}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Property"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Properties Management Modal */}
      {showMapPropertiesModal && (
        <div className="map-properties-modal-overlay">
          <div className="map-properties-modal">
            <div className="map-properties-modal-header">
              <h3>Manage Map Properties</h3>
              <button className="close-modal-button" onClick={() => setShowMapPropertiesModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="map-properties-modal-body">
              {mapPropertiesLoading ? (
                <div className="loading-message">Loading map properties...</div>
              ) : mapProperties.length === 0 ? (
                <div className="no-properties-message">
                  <p>No properties found on the map.</p>
                </div>
              ) : (
                <>
                  <p className="map-properties-count">{mapProperties.length} properties currently on the map</p>
                  <div className="map-properties-list">
                    {mapProperties.map((property) => {
                      const propertyId = property._id || property.id
                      return (
                        <div key={propertyId} className="map-property-item">
                          <div className="map-property-info">
                            <strong>{property.title || "Unnamed Property"}</strong>
                            <span>{property.location || "Unknown location"}</span>
                            <span className="map-property-coords">
                              [{property.latitude?.toFixed(4) || "N/A"}, {property.longitude?.toFixed(4) || "N/A"}]
                            </span>
                          </div>
                          <div className="map-property-actions">
                            <button
                              onClick={() => navigate(`/room/${propertyId}`)}
                              className="view-map-property-btn"
                              title="View property"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteMapProperty(property)}
                              className="delete-map-property-btn"
                              title="Delete this property from the map"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
            <div className="map-properties-modal-footer">
              <button
                className="refresh-map-properties-btn"
                onClick={fetchMapProperties}
                disabled={mapPropertiesLoading}
              >
                <RefreshCw size={16} /> Refresh List
              </button>
              <button
                className="clear-all-map-properties-btn"
                onClick={clearAllMapProperties}
                disabled={mapPropertiesLoading}
              >
                <Trash2 size={16} /> Clear All Map Properties
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Existing styles */
        
        /* Map Properties Modal Styles */
        .map-properties-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .map-properties-modal {
          background-color: white;
          border-radius: 8px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .map-properties-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #eaeaea;
        }
        
        .map-properties-modal-header h3 {
          margin: 0;
          color: #333;
          font-size: 1.25rem;
        }
        
        .close-modal-button {
          background: none;
          border: none;
          cursor: pointer;
          color: #666;
          padding: 4px;
          border-radius: 4px;
        }
        
        .close-modal-button:hover {
          background-color: #f5f5f5;
          color: #333;
        }
        
        .map-properties-modal-body {
          padding: 20px;
          overflow-y: auto;
          max-height: calc(90vh - 140px);
        }
        
        .map-properties-count {
          margin-bottom: 16px;
          color: #555;
          font-size: 0.9rem;
        }
        
        .map-properties-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .map-property-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border: 1px solid #eaeaea;
          border-radius: 6px;
          background-color: #f9f9f9;
        }
        
        .map-property-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .map-property-info strong {
          font-size: 1rem;
          color: #333;
        }
        
        .map-property-info span {
          font-size: 0.85rem;
          color: #666;
        }
        
        .map-property-coords {
          font-family: monospace;
          font-size: 0.8rem;
          color: #777;
        }
        
        .map-property-actions {
          display: flex;
          gap: 8px;
        }
        
        .view-map-property-btn,
        .delete-map-property-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
        }
        
        .view-map-property-btn {
          background-color: #4a90e2;
          color: white;
        }
        
        .view-map-property-btn:hover {
          background-color: #3a7bc8;
        }
        
        .delete-map-property-btn {
          background-color: #dc3545;
          color: white;
        }
        
        .delete-map-property-btn:hover {
          background-color: #c82333;
        }
        
        .map-properties-modal-footer {
          display: flex;
          justify-content: space-between;
          padding: 16px 20px;
          border-top: 1px solid #eaeaea;
        }
        
        .refresh-map-properties-btn,
        .clear-all-map-properties-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }
        
        .refresh-map-properties-btn {
          background-color: #4a90e2;
          color: white;
        }
        
        .refresh-map-properties-btn:hover {
          background-color: #3a7bc8;
        }
        
        .clear-all-map-properties-btn {
          background-color: #dc3545;
          color: white;
        }
        
        .clear-all-map-properties-btn:hover {
          background-color: #c82333;
        }
        
        .manage-map-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: #4a90e2;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          margin-left: 10px;
        }
        
        .manage-map-btn:hover {
          background-color: #3a7bc8;
        }
        
        .loading-message {
          text-align: center;
          padding: 20px;
          color: #666;
        }
        
        .no-properties-message {
          text-align: center;
          padding: 20px;
          color: #666;
          background-color: #f8f9fa;
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}

