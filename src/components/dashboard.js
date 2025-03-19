"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, ArrowUp, ArrowDown, Film, RefreshCw, Check, AlertCircle, Trash2 } from "lucide-react"
import { isAdminAuthenticated, adminLogout, getCurrentAdmin } from "../services/auth"
import {
  getProperties,
  toggleFeaturedStatus,
  getAllFeaturedPropertiesFromLocalStorage,
  rebuildFeaturedProperties,
  purgeAllFeaturedProperties,
} from "../services/adminApi"
import "./Dashboard.css"

// Add this at the top of the file, right after the imports
/* eslint no-restricted-globals: 0 */
/* eslint no-unused-vars: 0 */

/* eslint no-restricted-globals: 0 */

// Helper function to format currency in NPR
const formatNPR = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(amount)
}

// Maximum number of featured properties allowed
const MAX_FEATURED_PROPERTIES = 6 // Allows exactly 6 properties

// Key for storing featured properties in local storage
const FEATURED_PROPERTIES_STORAGE_KEY = "admin_featured_properties"

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
                            alt={`${property.title} - ${index + 1}`}
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
                  <img src="/placeholder.svg?height=300&width=500" alt="Not available" />
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
    featuredProperties: 0,
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

      // Get featured property IDs from localStorage
      const featuredPropertyIds = getAllFeaturedPropertiesFromLocalStorage()
      console.log(`Featured properties in localStorage: ${featuredPropertyIds.length}`)

      // Map the properties and set featured status based on localStorage
      processedProperties = processedProperties.map((property) => {
        const propertyId = property._id || property.id
        return {
          ...property,
          featured: featuredPropertyIds.includes(propertyId),
        }
      })

      // Set the properties with correct featured status
      setProperties(processedProperties)

      // Count featured properties by checking which ones are actually in the localStorage list
      const featuredCount = processedProperties.filter((property) => {
        const propertyId = property._id || property.id
        return featuredPropertyIds.includes(propertyId)
      }).length
      console.log(`Actual featured properties count: ${featuredCount}`)

      // Calculate stats
      const totalRevenue = processedProperties.reduce((sum, property) => {
        return sum + (property.price || 0)
      }, 0)

      setStats({
        totalProperties: processedProperties.length,
        totalRevenue,
        featuredProperties: featuredCount, // Use the accurate count
      })

      setLastRefreshed(new Date())
      setIsLoadingProperties(false)
    } catch (err) {
      console.error("Error fetching properties:", err)
      setIsLoadingProperties(false)
      setError("Failed to load properties. Please try again.")
    }
  }

  // Function to update the featured count in real-time
  // This function is kept for future use but commented out to avoid ESLint warnings
  /*
  const updateFeaturedCount = () => {
    // Get the actual featured IDs from localStorage
    const featuredIds = getAllFeaturedPropertiesFromLocalStorage()

    // Count how many of these IDs actually exist in the properties list
    const actualFeaturedCount = properties.filter((property) => {
      const propertyId = property._id || property.id
      return featuredIds.includes(propertyId)
    }).length

    // Update the stats with the accurate count
    setStats((prev) => ({
      ...prev,
      featuredProperties: featuredIds.length, // Use the raw count from localStorage
    }))

    console.log(`Updated featured count: ${featuredIds.length}`)
    return featuredIds.length
  }
  */

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

  // Handle status change function is kept for future use but commented out to avoid ESLint warnings
  /*
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
  */

  // Add this function to verify and fix the featured count
  const verifyFeaturedCount = async () => {
    setIsLoading(true)
    try {
      // Get the actual featured IDs from localStorage
      const featuredIds = getAllFeaturedPropertiesFromLocalStorage()

      // Count how many of these IDs actually exist in the properties list
      const actualFeaturedCount = properties.filter((property) => {
        const propertyId = property._id || property.id
        return featuredIds.includes(propertyId)
      }).length

      // Update the stats with the accurate count
      setStats((prev) => ({
        ...prev,
        featuredProperties: actualFeaturedCount,
      }))

      setSuccessMessage(`Featured count verified: ${actualFeaturedCount} properties are featured`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error("Error verifying featured count:", error)
      setError("Failed to verify featured count")
      setTimeout(() => setError(null), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  // Add this function right after the verifyFeaturedCount function
  const debugFeaturedProperties = () => {
    try {
      // Get all featured IDs from localStorage
      const featuredIds = getAllFeaturedPropertiesFromLocalStorage()

      // Get the actual properties that match these IDs
      const matchingProperties = properties.filter((property) => {
        const propertyId = property._id || property.id
        return featuredIds.includes(propertyId)
      })

      // Log detailed information
      console.log("=== FEATURED PROPERTIES DEBUG ===")
      console.log(`Total featured IDs in localStorage: ${featuredIds.length}`)
      console.log("Featured IDs:", featuredIds)
      console.log(`Matching properties found in API: ${matchingProperties.length}`)

      // Find IDs that don't match any property
      const missingIds = featuredIds.filter(
        (id) => !properties.some((property) => (property._id || property.id) === id),
      )

      if (missingIds.length > 0) {
        console.log(`Found ${missingIds.length} IDs in localStorage that don't match any property:`)
        console.log("Missing IDs:", missingIds)

        // Offer to clean up these IDs
        if (
          window.confirm(
            `Found ${missingIds.length} featured IDs in localStorage that don't exist in the API. Clean them up?`,
          )
        ) {
          // Get current featured properties
          const featuredPropertiesJson = localStorage.getItem(FEATURED_PROPERTIES_STORAGE_KEY) || "{}"
          const featuredProperties = JSON.parse(featuredPropertiesJson)

          // Remove the missing IDs
          missingIds.forEach((id) => {
            delete featuredProperties[id]
          })

          // Save back to localStorage
          localStorage.setItem(FEATURED_PROPERTIES_STORAGE_KEY, JSON.stringify(featuredProperties))

          // Update the UI
          setSuccessMessage(`Cleaned up ${missingIds.length} invalid featured IDs`)
          setTimeout(() => setSuccessMessage(null), 3000)

          // Refresh properties
          fetchProperties()
        }
      } else {
        setSuccessMessage("All featured IDs are valid")
        setTimeout(() => setSuccessMessage(null), 3000)
      }

      return {
        featuredIds,
        matchingProperties,
        missingIds,
      }
    } catch (error) {
      console.error("Error in debugFeaturedProperties:", error)
      setError("Error debugging featured properties")
      setTimeout(() => setError(null), 3000)
    }
  }

  // Add this function after the debugFeaturedProperties function
  const checkFeaturedLimit = () => {
    try {
      // Get all featured IDs from localStorage
      const featuredIds = getAllFeaturedPropertiesFromLocalStorage()

      console.log("=== FEATURED PROPERTIES LIMIT CHECK ===")
      console.log(`Current featured count: ${featuredIds.length}`)
      console.log(`Maximum allowed: ${MAX_FEATURED_PROPERTIES}`)
      console.log(`Can add more: ${featuredIds.length < MAX_FEATURED_PROPERTIES ? "Yes" : "No"}`)
      console.log(`Featured IDs:`, featuredIds)

      // Show a message with the current status
      setSuccessMessage(
        `Current featured count: ${featuredIds.length}/${MAX_FEATURED_PROPERTIES}. ${featuredIds.length < MAX_FEATURED_PROPERTIES ? "You can add more properties." : "You have reached the maximum limit."}`,
      )
      setTimeout(() => setSuccessMessage(null), 5000)

      return {
        currentCount: featuredIds.length,
        maxAllowed: MAX_FEATURED_PROPERTIES,
        canAddMore: featuredIds.length < MAX_FEATURED_PROPERTIES,
      }
    } catch (error) {
      console.error("Error checking featured limit:", error)
      setError("Error checking featured limit")
      setTimeout(() => setError(null), 3000)
    }
  }

  // Reset all featured properties (for debugging)
  const handleResetFeatured = async () => {
    if (
      window.confirm("Are you sure you want to reset all featured properties? This will remove all featured status.")
    ) {
      setIsLoading(true)
      try {
        const result = await rebuildFeaturedProperties()
        setSuccessMessage(result.message)
        setTimeout(() => setSuccessMessage(null), 3000)

        // Update the UI to reflect the changes
        await fetchProperties()
      } catch (error) {
        console.error("Error resetting featured properties:", error)
        setError("Failed to reset featured properties")
        setTimeout(() => setError(null), 3000)
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Then add a new function for the emergency purge
  // Add this function after handleResetFeatured
  const handleEmergencyPurge = async () => {
    if (
      window.confirm(
        "⚠️ EMERGENCY PURGE: This will completely remove ALL featured properties. This action cannot be undone. Are you absolutely sure?",
      )
    ) {
      setIsLoading(true)
      try {
        const result = await purgeAllFeaturedProperties()
        setSuccessMessage(result.message)
        setTimeout(() => setSuccessMessage(null), 3000)

        // Update the UI to reflect the changes
        await fetchProperties()
      } catch (error) {
        console.error("Error purging featured properties:", error)
        setError("Failed to purge featured properties")
        setTimeout(() => setError(null), 3000)
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Find the toggleFeatured function and replace it with this:
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

      // Get the current featured status
      const currentFeaturedStatus = property.featured || false

      // Get all currently featured property IDs
      const featuredIds = getAllFeaturedPropertiesFromLocalStorage()
      console.log(`Current featured IDs: ${featuredIds.join(", ")}`)
      console.log(`Current featured count: ${featuredIds.length}`)
      console.log(`MAX_FEATURED_PROPERTIES: ${MAX_FEATURED_PROPERTIES}`)

      // If trying to turn ON featured status
      if (!currentFeaturedStatus) {
        console.log(`Attempting to feature property: ${propertyId}`)

        // ONLY block if we would exceed the limit (6)
        if (featuredIds.length > MAX_FEATURED_PROPERTIES - 1) {
          console.log(`ERROR: Already at max featured properties (${featuredIds.length})`)
          setError(
            `Cannot feature more than ${MAX_FEATURED_PROPERTIES} properties. Currently featuring ${featuredIds.length}.`,
          )
          setTimeout(() => setError(null), 5000)
          return
        }

        console.log(`Featuring property ${propertyId} - will have ${featuredIds.length + 1} featured properties`)
      } else {
        console.log(`Unfeaturing property: ${propertyId}`)
      }

      // Update the UI immediately
      setProperties((prevProperties) =>
        prevProperties.map((p) => ((p._id || p.id) === propertyId ? { ...p, featured: !currentFeaturedStatus } : p)),
      )

      // Call the API to update the featured status
      console.log(
        `Calling toggleFeaturedStatus API for property ${propertyId}, setting featured=${!currentFeaturedStatus}`,
      )
      const result = await toggleFeaturedStatus(propertyId, !currentFeaturedStatus)
      console.log("API result:", result)

      // Update the stats
      const updatedFeaturedIds = getAllFeaturedPropertiesFromLocalStorage()
      console.log(`After toggle, featured count: ${updatedFeaturedIds.length}`)

      setStats((prev) => ({
        ...prev,
        featuredProperties: updatedFeaturedIds.length,
      }))

      // Show success message
      setSuccessMessage(`Property ${!currentFeaturedStatus ? "added to" : "removed from"} featured listings`)
      setTimeout(() => setSuccessMessage(null), 3000)

      // Refresh properties to ensure UI is in sync
      fetchProperties()
    } catch (error) {
      console.error("Error in toggleFeatured:", error)
      setError("An unexpected error occurred")
      setTimeout(() => setError(null), 3000)

      // Refresh properties to ensure UI is in sync even after error
      fetchProperties()
    }
  }

  // handleDeleteProperty function is kept for future use but commented out to avoid ESLint warnings
  /*
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
  */

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
                  <h3>Featured Properties</h3>
                  <p className="stat-number">
                    {isLoadingProperties ? "Loading..." : stats.featuredProperties} / {MAX_FEATURED_PROPERTIES}
                  </p>
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
                  <button className="action-button" onClick={() => handleTabChange("featured")}>
                    Manage Featured Properties
                  </button>
                  <button className="action-button" onClick={verifyFeaturedCount}>
                    Verify Featured Count
                  </button>
                  <button className="action-button" onClick={debugFeaturedProperties}>
                    Debug Featured Properties
                  </button>
                  <button className="action-button" onClick={checkFeaturedLimit}>
                    Check Featured Limit
                  </button>
                  <button className="action-button danger" onClick={handleResetFeatured}>
                    <Trash2 size={16} /> Reset Featured Properties
                  </button>
                  {stats.featuredProperties > MAX_FEATURED_PROPERTIES && (
                    <button className="action-button emergency" onClick={handleEmergencyPurge}>
                      <AlertCircle size={16} /> Emergency Purge All Featured
                    </button>
                  )}
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
                                <img src="/placeholder.svg?height=80&width=120" alt="Not available" />
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
                Select up to {MAX_FEATURED_PROPERTIES} properties to be displayed in the Featured section on the
                homepage. Currently featuring {stats.featuredProperties} out of {MAX_FEATURED_PROPERTIES} properties.
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
                                <img src="/placeholder.svg?height=80&width=120" alt="Not available" />
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
              <div className="settings-actions">
                <button className="action-button danger" onClick={handleResetFeatured}>
                  <Trash2 size={16} /> Reset Featured Properties
                </button>
                <button className="action-button emergency" onClick={handleEmergencyPurge}>
                  <AlertCircle size={16} /> Emergency Purge All Featured
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {selectedProperty && <PropertyDetailModal property={selectedProperty} onClose={closePropertyModal} />}
    </div>
  )
}

export default Dashboard

