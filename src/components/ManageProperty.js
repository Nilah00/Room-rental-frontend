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

  useEffect(() => {
    fetchProperties()
    fetchMapProperties()
  }, [])

  useEffect(() => {
    const filtered = properties.filter(
      (property) =>
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredProperties(filtered)
  }, [searchTerm, properties])

  // Check if user is a landlord or admin
  useEffect(() => {
    try {
      // Check if user is logged in
      const userJson = localStorage.getItem("user")
      if (!userJson) {
        setIsLandlord(false)
        setIsAdmin(false)
        return
      }

      const user = JSON.parse(userJson)

      // Check if user is a landlord (has role property with value "landlord" or "owner")
      const isUserLandlord = user.role === "landlord" || user.role === "owner" || user.isLandlord === true
      setIsLandlord(isUserLandlord)

      // Check if user is an admin
      const isUserAdmin = user.role === "admin" || user.isAdmin === true || localStorage.getItem("adminToken") !== null
      setIsAdmin(isUserAdmin)

      console.log("User permissions:", { isLandlord: isUserLandlord, isAdmin: isUserAdmin })
    } catch (error) {
      console.error("Error checking user permissions:", error)
      setIsLandlord(false)
      setIsAdmin(false)
    }
  }, [])

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
  const fetchMapProperties = () => {
    try {
      const storedPropertiesJson = localStorage.getItem("properties")
      if (!storedPropertiesJson) {
        console.log("No properties found in localStorage")
        setMapProperties([])
        return
      }

      const storedProperties = JSON.parse(storedPropertiesJson)
      console.log("Retrieved map properties from localStorage:", storedProperties)

      if (!Array.isArray(storedProperties)) {
        console.error("Properties in localStorage is not an array:", storedProperties)
        setMapProperties([])
        return
      }

      // Filter properties based on user permissions
      let filteredProperties = storedProperties

      // If not admin, only show properties owned by the current user
      if (!isAdmin) {
        filteredProperties = storedProperties.filter((property) => userOwnsProperty(property))
        console.log(`Filtered to ${filteredProperties.length} properties owned by current user`)
      }

      // Filter out properties with invalid coordinates
      const validProperties = filteredProperties.filter((property) => {
        // Check coordinates
        const lat = Number(property.latitude)
        const lng = Number(property.longitude)
        const hasValidCoords = validateCoordinates(lat, lng)

        if (!hasValidCoords) {
          console.log(`Filtering out property with invalid coordinates: ${property._id || property.id}`)
        }

        return hasValidCoords
      })

      // Ensure each property has a unique ID for React keys
      const propertiesWithUniqueKeys = validProperties.map((property, index) => {
        if (!property._id && !property.id) {
          return { ...property, id: `temp-id-${index}` }
        }
        return property
      })

      setMapProperties(propertiesWithUniqueKeys)
    } catch (error) {
      console.error("Error fetching map properties from localStorage:", error)
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
    if (!property) return false

    try {
      const userJson = localStorage.getItem("user")
      if (!userJson) return false

      const user = JSON.parse(userJson)
      const userId = user.id || user._id

      // Check if property owner matches user ID
      const propertyOwnerId = property.owner?._id || property.owner?.id || property.ownerId

      return propertyOwnerId === userId
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

      const confirmed = window.confirm(
        `Are you sure you want to delete "${propertyTitle}"? This action cannot be undone.`,
      )

      if (confirmed) {
        setIsDeleting(true)

        try {
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
            setMapProperties(
              updatedProperties.filter((p) => validateCoordinates(Number(p.latitude), Number(p.longitude))),
            )
          }

          // Then call the API to delete the property
          await deleteProperty(propertyId)

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

          alert("Property deleted successfully!")
        } catch (apiError) {
          console.error("API Error deleting property:", apiError)

          // Even if the API call fails, we've already updated localStorage
          // so the map will still be updated
          setProperties((prev) => prev.filter((prop) => prop._id !== propertyId))
          setFilteredProperties((prev) => prev.filter((prop) => prop._id !== propertyId))

          alert(
            "Property removed from map, but there was an error with the server. The property may reappear when you reload the page.",
          )
        }
      }
    } catch (error) {
      console.error("Error deleting property:", error)
      setDeleteError(`Failed to delete property: ${error.message}`)
      setTimeout(() => setDeleteError(""), 3000)
    } finally {
      setIsDeleting(false)
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

      if (window.confirm("Are you sure you want to delete this property from the map?")) {
        // Update localStorage
        const storedPropertiesJson = localStorage.getItem("properties")
        if (storedPropertiesJson) {
          const storedProperties = JSON.parse(storedPropertiesJson)
          const updatedProperties = storedProperties.filter((property) => {
            const propId = property._id || property.id
            return propId !== propertyId
          })
          localStorage.setItem("properties", JSON.stringify(updatedProperties))
          console.log(`Property ${propertyId} removed from localStorage`)

          // Update the map properties state
          setMapProperties(
            updatedProperties.filter((p) => validateCoordinates(Number(p.latitude), Number(p.longitude))),
          )

          // Dispatch event for other components
          window.dispatchEvent(
            new CustomEvent("propertyDeleted", {
              detail: { propertyId },
            }),
          )

          // Also dispatch a storage event to notify the map component
          window.dispatchEvent(new Event("storage"))
        }
      }
    } catch (error) {
      console.error("Error deleting map property:", error)
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
              ? "As a Landlord, you can manage all your properties on the map."
              : "You can manage your properties displayed on the map."}
          </p>

          {mapProperties.length === 0 ? (
            <div className="no-map-properties">
              <p>{isAdmin ? "No properties found on the map." : "Add your property."}</p>
            </div>
          ) : (
            <div className="map-property-list">
              {mapProperties.map((property) => {
                const propertyId = property._id || property.id
                const canManageProperty = isAdmin || userOwnsProperty(property)
                return (
                  <div key={propertyId} className="map-property-item">
                    <div className="map-property-info">
                      <strong>{property.title || "Unnamed Property"}</strong>
                      <span>{property.location || "Unknown location"}</span>
                      <span className="map-property-coords">
                        [{property.latitude.toFixed(4)}, {property.longitude.toFixed(4)}]
                      </span>
                    </div>
                    {canManageProperty ? (
                      <button
                        onClick={() => deleteMapProperty(propertyId)}
                        className="delete-map-property-btn"
                        title="Delete this property from the map"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <span className="locked-icon" title="You don't own this property">
                        <Lock size={16} />
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {isAdmin && (
            <div className="map-manager-actions">
              <button onClick={resetMapProperties} className="reset-map-btn">
                Reset All Map Properties
              </button>
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

      <style jsx>{`
        .manage-properties-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .manage-properties-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .back-home-button {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 8px 16px;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          color: #495057;
          text-decoration: none;
          font-weight: 500;
        }
        
        .back-home-button:hover {
          background-color: #e9ecef;
        }
        
        .actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .left-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .add-property-button {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 8px 16px;
          background-color: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          text-decoration: none;
          font-weight: 500;
        }
        
        .add-property-button:hover {
          background-color: #218838;
        }
        
        .manage-map-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 8px 16px;
          background-color: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }
        
        .manage-map-btn:hover {
          background-color: #5a6268;
        }
        
        .search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          width: 100%;
          max-width: 300px;
        }
        
        .search-bar input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
        }
        
        .error-message-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        
        .section-title {
          margin-top: 20px;
          margin-bottom: 15px;
          font-size: 1.5rem;
          color: #343a40;
        }
        
        .no-properties-message {
          padding: 20px;
          text-align: center;
          background-color: #f8f9fa;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        
        .properties-table-container {
          overflow-x: auto;
          margin-bottom: 20px;
        }
        
        .properties-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .properties-table th,
        .properties-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }
        
        .properties-table th {
          background-color: #f8f9fa;
          font-weight: 600;
        }
        
        .sortable-header {
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .property-thumbnail {
          width: 80px;
          height: 60px;
          object-fit: cover;
          border-radius: 4px;
        }
        
        .property-status-select {
          padding: 6px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          background-color: white;
        }
        
        .property-actions {
          display: flex;
          gap: 5px;
        }
        
        .view-button,
        .edit-button,
        .delete-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .view-button {
          background-color: #e9ecef;
          color: #495057;
        }
        
        .view-button:hover {
          background-color: #dee2e6;
        }
        
        .edit-button {
          background-color: #007bff;
          color: white;
        }
        
        .edit-button:hover {
          background-color: #0069d9;
        }
        
        .delete-button {
          background-color: #dc3545;
          color: white;
        }
        
        .delete-button:hover {
          background-color: #c82333;
        }
        
        .delete-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .locked-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          color: #6c757d;
        }
        
        .loading-message {
          padding: 20px;
          text-align: center;
          font-size: 1.2rem;
          color: #6c757d;
        }
        
        .error-message {
          padding: 20px;
          text-align: center;
          background-color: #f8d7da;
          color: #721c24;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        
        .retry-button {
          margin-top: 10px;
          padding: 8px 16px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .retry-button:hover {
          background-color: #0069d9;
        }
        
        /* Map Property Manager Styles */
        .map-property-manager {
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 15px;
          margin-bottom: 20px;
        }
        
        .map-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .map-manager-header h3 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .admin-badge {
          background-color: #dc3545;
          color: white;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .refresh-map-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background-color: #4a90e2;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
        }
        
        .refresh-map-btn:hover {
          background-color: #3a7bc8;
        }
        
        .no-map-properties {
          padding: 15px;
          text-align: center;
          background-color: white;
          border-radius: 4px;
          margin: 10px 0;
        }
        
        .map-property-list {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          margin: 10px 0;
          background-color: white;
        }
        
        .map-property-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid #dee2e6;
        }
        
        .map-property-item:last-child {
          border-bottom: none;
        }
        
        .map-property-info {
          display: flex;
          flex-direction: column;
        }
        
        .map-property-info strong {
          font-size: 14px;
        }
        
        .map-property-info span {
          font-size: 12px;
          color: #6c757d;
        }
        
        .map-property-coords {
          font-family: monospace;
          font-size: 11px !important;
          color: #495057 !important;
        }
        
        .delete-map-property-btn {
          background-color: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        
        .delete-map-property-btn:hover {
          background-color: #c82333;
        }
        
        .map-manager-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
        }
        
        .reset-map-btn {
          background-color: #dc3545;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }
        
        .reset-map-btn:hover {
          background-color: #c82333;
        }
        
        @media (max-width: 768px) {
          .actions-bar {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-bar {
            max-width: none;
          }
          
          .map-manager-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          
          .refresh-map-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

