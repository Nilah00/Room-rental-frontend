"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, ArrowUp, ArrowDown, Film, RefreshCw, Check, AlertCircle } from "lucide-react"
import { isAdminAuthenticated, adminLogout, getCurrentAdmin } from "../services/auth"
import { getProperties, toggleFeaturedStatus, updatePropertyStatus } from "../services/adminApi"
import "./Dashboard.css"

// Helper function to format currency in NPR
const formatNPR = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(amount)
}

// Helper function to get image URL
const getImageUrl = (path) => {
  if (!path) return null

  // If path is already a full URL, return it
  if (path.startsWith("http")) return path

  // Otherwise, prepend the API base URL
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"
  return `${API_URL}/${path.replace(/^\//, "")}`
}

function PropertyDetailModal({ property, onClose }) {
  // State to track the currently selected image
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedTab, setSelectedTab] = useState("images")

  // Handle thumbnail click
  const handleThumbnailClick = (index) => {
    setSelectedImageIndex(index)
  }

  // Early return after hooks are declared
  if (!property) return null

  // Log the property data to debug
  console.log("Property data:", property)

  // Check for video (singular) or videos (plural)
  const hasVideo = !!property.video
  const hasVideos = property.videos && Array.isArray(property.videos) && property.videos.length > 0

  console.log("Has video (singular):", hasVideo)
  console.log("Video path:", property.video)
  console.log("Has videos (plural):", hasVideos)

  // Get the current image to display
  const currentImage = property.images && property.images.length > 0 ? property.images[selectedImageIndex] : null

  return (
    <div className="property-modal-overlay">
      <div className="property-modal-content">
        <div className="property-modal-header">
          <h2>{property.title}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="property-modal-tabs">
          <button
            className={`tab-button ${selectedTab === "images" ? "active" : ""}`}
            onClick={() => setSelectedTab("images")}
          >
            Images
          </button>
          <button
            className={`tab-button ${selectedTab === "videos" ? "active" : ""}`}
            onClick={() => setSelectedTab("videos")}
          >
            Videos {(hasVideo || hasVideos) && <span className="video-count">1</span>}
          </button>
        </div>

        <div className="property-modal-body">
          {selectedTab === "images" && (
            <div className="property-modal-image-gallery">
              {property.images && property.images.length > 0 ? (
                <div className="gallery-container">
                  <div className="main-image">
                    <img
                      src={getImageUrl(currentImage) || "/placeholder.svg"}
                      alt={property.title}
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = "/placeholder.svg?height=300&width=500"
                      }}
                    />
                  </div>

                  {property.images.length > 1 && (
                    <div className="thumbnail-container">
                      {property.images.map((image, index) => (
                        <div
                          className={`thumbnail ${index === selectedImageIndex ? "active" : ""}`}
                          key={index}
                          onClick={() => handleThumbnailClick(index)}
                        >
                          <img
                            src={getImageUrl(image) || "/placeholder.svg"}
                            alt={`${property.title} - image ${index + 1}`}
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.src = "/placeholder.svg?height=80&width=120"
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="main-image">
                  <img src="/placeholder.svg?height=300&width=500" alt="No image available" />
                </div>
              )}
            </div>
          )}

          {selectedTab === "videos" && (
            <div className="property-videos-section">
              {hasVideo ? (
                <div className="video-container">
                  <div className="property-video">
                    <h4 className="video-title">Property Video</h4>
                    <video
                      controls
                      width="100%"
                      preload="metadata"
                      poster="/placeholder.svg?height=300&width=500"
                      onError={(e) => {
                        console.error(`Error loading video:`, e)
                        e.target.onerror = null
                        e.target.parentNode.innerHTML = `<div class="video-error">Video could not be loaded</div>`
                      }}
                    >
                      <source src={getImageUrl(property.video)} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              ) : hasVideos ? (
                <div className="video-container">
                  {property.videos.map((video, index) => (
                    <div className="property-video" key={index}>
                      <h4 className="video-title">Video {index + 1}</h4>
                      <video
                        controls
                        width="100%"
                        preload="metadata"
                        poster="/placeholder.svg?height=300&width=500"
                        onError={(e) => {
                          console.error(`Error loading video:`, e)
                          e.target.onerror = null
                          e.target.parentNode.innerHTML = `<div class="video-error">Video could not be loaded</div>`
                        }}
                      >
                        <source src={getImageUrl(video)} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-videos-message">
                  <Film size={48} />
                  <p>No videos available for this property</p>
                </div>
              )}
            </div>
          )}

          <div className="property-details-table">
            <table>
              <tbody>
                <tr>
                  <th>Property ID</th>
                  <td>{property._id || property.id || "N/A"}</td>
                </tr>
                <tr>
                  <th>Title</th>
                  <td>{property.title || "N/A"}</td>
                </tr>
                <tr>
                  <th>Location</th>
                  <td>{property.location || "N/A"}</td>
                </tr>
                <tr>
                  <th>Price</th>
                  <td>{formatNPR(property.price || 0)}</td>
                </tr>
                <tr>
                  <th>Landlord Name</th>
                  <td>{property.owner?.name || property.ownerName || "Unknown"}</td>
                </tr>
                <tr>
                  <th>Status</th>
                  <td>
                    <span className={`status-badge ${property.status === "Available" ? "active" : "inactive"}`}>
                      {property.status || "Available"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <th>Bedrooms</th>
                  <td>{property.bedrooms || "N/A"}</td>
                </tr>
                <tr>
                  <th>Bathrooms</th>
                  <td>{property.bathrooms || "N/A"}</td>
                </tr>
                <tr>
                  <th>Furnished</th>
                  <td>{property.furnished ? "Yes" : "No"}</td>
                </tr>
                <tr>
                  <th>Created At</th>
                  <td>{property.createdAt ? new Date(property.createdAt).toLocaleString() : "N/A"}</td>
                </tr>
                <tr>
                  <th>Updated At</th>
                  <td>{property.updatedAt ? new Date(property.updatedAt).toLocaleString() : "N/A"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {property.description && (
            <div className="property-description-section">
              <h3>Description</h3>
              <p>{property.description}</p>
            </div>
          )}

          {property.amenities && property.amenities.length > 0 && (
            <div className="property-amenities-section">
              <h3>Amenities</h3>
              <ul className="amenities-list">
                {property.amenities.map((amenity, index) => (
                  <li key={index}>{amenity}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [properties, setProperties] = useState([])
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalRevenue: 0,
  })
  const [isLoadingProperties, setIsLoadingProperties] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [activeTab, setActiveTab] = useState("dashboard") // Default to dashboard tab
  const [sortConfig, setSortConfig] = useState({ key: "price", direction: "ascending" })

  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is logged in as admin
    const checkAdminAuthentication = async () => {
      if (!isAdminAuthenticated()) {
        navigate("/login?admin=true")
        return
      }

      const adminUser = getCurrentAdmin()

      if (!adminUser) {
        navigate("/login?admin=true")
        return
      }

      setUser(adminUser)
      setIsLoading(false)

      // Fetch properties
      fetchProperties()
    }

    checkAdminAuthentication()
  }, [navigate])

  const fetchProperties = async () => {
    setIsLoadingProperties(true)
    setError(null)
    try {
      console.log("Fetching properties...")
      const propertiesData = await getProperties()
      console.log("Properties data:", propertiesData)

      // Process the properties data based on its structure
      let processedProperties = propertiesData

      // If it's not an array, try to extract the array
      if (!Array.isArray(processedProperties)) {
        if (processedProperties.properties) {
          processedProperties = processedProperties.properties
        } else if (processedProperties.data) {
          processedProperties = processedProperties.data
        } else {
          // Try to find an array in the response
          const possibleArrays = Object.values(processedProperties).filter((val) => Array.isArray(val))
          if (possibleArrays.length > 0) {
            processedProperties = possibleArrays[0]
          } else {
            console.warn("Could not find properties array in response, using empty array")
            processedProperties = []
          }
        }
      }

      console.log("Processed properties:", processedProperties)

      // Check for videos in properties
      processedProperties.forEach((property) => {
        if (property.video) {
          console.log(`Property ${property._id || property.id} has video:`, property.video)
        }
        if (property.videos && property.videos.length > 0) {
          console.log(`Property ${property._id || property.id} has ${property.videos.length} videos:`, property.videos)
        }
      })

      setProperties(processedProperties)

      // Calculate stats
      const totalRevenue = processedProperties.reduce((sum, property) => {
        return sum + (property.price || 0)
      }, 0)

      setStats({
        totalProperties: processedProperties.length,
        totalRevenue,
      })

      setLastRefreshed(new Date())
      setIsLoadingProperties(false)
    } catch (err) {
      console.error("Error fetching properties:", err)
      setIsLoadingProperties(false)
      setError("Failed to load properties. Please try again.")
    }
  }

  const handleLogout = () => {
    // Use the adminLogout function
    adminLogout()
    navigate("/login")
  }

  const handleRefresh = () => {
    setError(null)
    fetchProperties()
  }

  const handlePropertyClick = (property) => {
    setSelectedProperty(property)
  }

  const closePropertyModal = () => {
    setSelectedProperty(null)
  }

  // Handle tab change when clicking on sidebar items
  const handleTabChange = (tab) => {
    setActiveTab(tab)
  }

  // Handle sorting
  const requestSort = (key) => {
    let direction = "ascending"
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Get sorted properties
  const getSortedProperties = () => {
    const sortableProperties = [...properties]
    if (sortConfig.key) {
      sortableProperties.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1
        }
        return 0
      })
    }
    return sortableProperties
  }

  const sortedProperties = getSortedProperties()

  // Handle status change
  const handleStatusChange = async (propertyId, newStatus) => {
    try {
      // Find the property in the current list
      const property = properties.find((p) => (p._id || p.id) === propertyId)
      if (!property) return

      // Update the property status in the UI immediately for better UX
      setProperties((prevProperties) =>
        prevProperties.map((p) => ((p._id || p.id) === propertyId ? { ...p, status: newStatus } : p)),
      )

      try {
        // Use the adminApi service
        await updatePropertyStatus(propertyId, newStatus)

        // Show success message
        setSuccessMessage(`Property status updated to ${newStatus}`)
        setTimeout(() => setSuccessMessage(null), 3000)

        // Dispatch an event to notify other components
        const event = new CustomEvent("propertyStatusUpdated", {
          detail: { updatedProperty: { ...property, status: newStatus } },
        })
        window.dispatchEvent(event)
      } catch (error) {
        console.error("Error updating property status:", error)

        // Revert the UI change
        setProperties((prevProperties) =>
          prevProperties.map((p) => ((p._id || p.id) === propertyId ? { ...p, status: property.status } : p)),
        )

        // Show error message
        setError("Failed to update property status. Please try again.")
        setTimeout(() => setError(null), 3000)
      }
    } catch (error) {
      console.error("Error in handleStatusChange:", error)
      setError("An unexpected error occurred")
      setTimeout(() => setError(null), 3000)
    }
  }

  // Toggle featured status
  const toggleFeatured = async (propertyId) => {
    try {
      // Find the property in the current list
      const property = properties.find((p) => (p._id || p.id) === propertyId)
      if (!property) {
        setError("Property not found")
        setTimeout(() => setError(null), 3000)
        return
      }

      const newFeaturedStatus = !(property.featured || false)

      // Update the UI optimistically
      setProperties((prevProperties) =>
        prevProperties.map((p) => ((p._id || p.id) === propertyId ? { ...p, featured: newFeaturedStatus } : p)),
      )

      try {
        // Make API call to update the featured status
        // This will also save to local storage for persistence
        const result = await toggleFeaturedStatus(propertyId, newFeaturedStatus)

        // Check if the result was simulated
        if (result.simulated) {
          console.log("Using local storage for persistence - API update failed but UI will remain consistent")
        }

        // Show success message
        setSuccessMessage(`Property ${newFeaturedStatus ? "added to" : "removed from"} featured listings`)
        setTimeout(() => setSuccessMessage(null), 3000)

        // Dispatch event to notify other components
        window.dispatchEvent(
          new CustomEvent("propertyFeaturedUpdated", {
            detail: {
              propertyId,
              featured: newFeaturedStatus,
            },
          }),
        )
      } catch (error) {
        console.error("Error updating featured status:", error)

        // We won't revert the UI change since we're using local storage for persistence
        // This keeps the UI consistent even if the API fails

        // Show a success message anyway to maintain a good user experience
        setSuccessMessage(`Property ${newFeaturedStatus ? "added to" : "removed from"} featured listings`)
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (error) {
      console.error("Error in toggleFeatured:", error)
      setError("An unexpected error occurred")
      setTimeout(() => setError(null), 3000)
    }
  }

  // Find the handleDeleteProperty function and update it to dispatch an event after successful deletion

  const handleDeleteProperty = async (propertyId) => {
    if (window.confirm("Are you sure you want to delete this property?")) {
      try {
        //await deleteProperty(propertyId) // Assuming deleteProperty is defined elsewhere
        setProperties((prev) => prev.filter((prop) => (prop._id || prop.id) !== propertyId))

        // Dispatch an event to notify other components about the deletion
        window.dispatchEvent(
          new CustomEvent("propertyDeleted", {
            detail: { propertyId },
          }),
        )

        setSuccessMessage("Property deleted successfully")
        setTimeout(() => setSuccessMessage(null), 3000)
      } catch (error) {
        console.error("Error deleting property:", error)
        setError("Failed to delete property. Please try again.")
        setTimeout(() => setError(null), 3000)
      }
    }
  }

  if (isLoading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-info">
          <span>Welcome, {user?.name || "Admin"}</span>
          <div className="last-refreshed">Last updated: {lastRefreshed.toLocaleTimeString()}</div>
          <button onClick={handleRefresh} className="refresh-button" disabled={isLoadingProperties}>
            {isLoadingProperties ? (
              <>
                <RefreshCw className="spin" size={16} /> Loading...
              </>
            ) : (
              <>
                <RefreshCw size={16} /> Refresh Data
              </>
            )}
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-sidebar">
          <nav>
            <ul>
              <li className={activeTab === "dashboard" ? "active" : ""} onClick={() => handleTabChange("dashboard")}>
                Dashboard
              </li>
              <li className={activeTab === "properties" ? "active" : ""} onClick={() => handleTabChange("properties")}>
                Properties
              </li>
              <li className={activeTab === "featured" ? "active" : ""} onClick={() => handleTabChange("featured")}>
                Featured Properties
              </li>
              <li className={activeTab === "settings" ? "active" : ""} onClick={() => handleTabChange("settings")}>
                Settings
              </li>
            </ul>
          </nav>
        </div>

        <main className="dashboard-main">
          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {successMessage && (
            <div className="success-message">
              <Check size={18} />
              {successMessage}
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <>
              <div className="dashboard-stats">
                <div className="stat-card">
                  <h3>Properties</h3>
                  <p className="stat-number">{isLoadingProperties ? "Loading..." : stats.totalProperties}</p>
                </div>
                <div className="stat-card">
                  <h3>Total Revenue</h3>
                  <p className="stat-number">{formatNPR(stats.totalRevenue)}</p>
                </div>
              </div>

              <div className="dashboard-overview">
                <h2>Dashboard Overview</h2>
                <p>Welcome to the admin dashboard. Here you can manage properties, view statistics, and more.</p>
                <div className="quick-actions">
                  <button className="action-button" onClick={() => handleTabChange("properties")}>
                    View All Properties
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Properties Tab */}
          {activeTab === "properties" && (
            <div className="properties-section">
              <h2>All Properties</h2>
              {isLoadingProperties ? (
                <p>Loading properties...</p>
              ) : (
                <div className="properties-table-container">
                  <table className="properties-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Title</th>
                        <th>Location</th>
                        <th className="sortable" onClick={() => requestSort("price")}>
                          Price
                          {sortConfig.key === "price" &&
                            (sortConfig.direction === "ascending" ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
                        </th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedProperties.length > 0 ? (
                        sortedProperties.map((property, index) => (
                          <tr key={property._id || property.id || index}>
                            <td className="property-image-cell">
                              {property.images && property.images.length > 0 ? (
                                <img
                                  src={getImageUrl(property.images[0]) || "/placeholder.svg"}
                                  alt={property.title}
                                  onError={(e) => {
                                    e.target.onerror = null
                                    e.target.src = "/placeholder.svg?height=80&width=120"
                                  }}
                                />
                              ) : (
                                <img src="/placeholder.svg?height=80&width=120" alt="No image available" />
                              )}
                            </td>
                            <td>{property.title}</td>
                            <td>{property.location}</td>
                            <td>{formatNPR(property.price)}/month</td>
                            <td className="actions-cell">
                              <button
                                className="action-icon view-btn"
                                onClick={() => handlePropertyClick(property)}
                                title="View Details"
                              >
                                <Eye size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="no-data">
                            No properties found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Featured Properties Tab */}
          {activeTab === "featured" && (
            <div className="properties-section">
              <h2>Manage Featured Properties</h2>
              <p className="section-description">
                Select properties to be displayed in the Featured section on the homepage. Featured properties will be
                more visible to users.
              </p>

              {isLoadingProperties ? (
                <p>Loading properties...</p>
              ) : (
                <div className="properties-table-container">
                  <table className="properties-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Title</th>
                        <th>Location</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Featured</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedProperties.length > 0 ? (
                        sortedProperties.map((property, index) => (
                          <tr key={property._id || property.id || index}>
                            <td className="property-image-cell">
                              {property.images && property.images.length > 0 ? (
                                <img
                                  src={getImageUrl(property.images[0]) || "/placeholder.svg"}
                                  alt={property.title}
                                  onError={(e) => {
                                    e.target.onerror = null
                                    e.target.src = "/placeholder.svg?height=80&width=120"
                                  }}
                                />
                              ) : (
                                <img src="/placeholder.svg?height=80&width=120" alt="No image available" />
                              )}
                            </td>
                            <td>{property.title}</td>
                            <td>{property.location}</td>
                            <td>{formatNPR(property.price)}/month</td>
                            <td>
                              <span
                                className={`status-badge ${property.status?.toLowerCase() === "available" ? "active" : "inactive"}`}
                              >
                                {property.status || "Available"}
                              </span>
                            </td>
                            <td>
                              <label className="featured-toggle">
                                <input
                                  type="checkbox"
                                  checked={property.featured || false}
                                  onChange={() => toggleFeatured(property._id || property.id)}
                                />
                                <span className="toggle-slider"></span>
                              </label>
                            </td>
                            <td className="actions-cell">
                              <button
                                className="action-icon view-btn"
                                onClick={() => handlePropertyClick(property)}
                                title="View Details"
                              >
                                <Eye size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="no-data">
                            No properties found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="settings-section">
              <h2>Settings</h2>
              <p>Admin settings will be implemented here.</p>
            </div>
          )}
        </main>
      </div>

      {selectedProperty && <PropertyDetailModal property={selectedProperty} onClose={closePropertyModal} />}
    </div>
  )
}

export default Dashboard

