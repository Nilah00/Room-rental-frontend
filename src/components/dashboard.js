"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, ArrowUp, ArrowDown, Film, RefreshCw, Check, AlertCircle, Trash2, User, Calendar } from 'lucide-react'
import { isAdminAuthenticated, adminLogout, getCurrentAdmin } from "../services/auth"
import {
  getProperties,
  toggleFeaturedStatus,
  getAllFeaturedPropertiesFromLocalStorage,
  rebuildFeaturedProperties,
  purgeAllFeaturedProperties,
  deletePropertyPermanently, // Import the enhanced deletion function
  clearAllPropertyCaches,
  addToDeletedPropertiesBlacklist,
  notifyAllComponentsOfDeletion,
} from "../services/adminApi"
import "./Dashboard.css"

// Add this at the top of your file, right after the imports
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"
console.log("API Base URL:", API_BASE_URL)

// API URL for direct fetch calls
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

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
  if (!path) return "/placeholder.svg?height=300&width=500"

  // If path is already a full URL, return it
  if (path.startsWith("http")) return path

  // If path is a placeholder path, return it directly
  if (path.startsWith("/placeholder.svg")) return path

  // Otherwise, prepend the API base URL
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"
  return `${API_URL}/${path.replace(/^\//, "")}`
}

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
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

  // Check for video (singular) or videos (plural)
  const hasVideo = !!property.video
  const hasVideos = property.videos && Array.isArray(property.videos) && property.videos.length > 0

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

function UserDetailModal({ user, onClose }) {
  if (!user) return null

  return (
    <div className="user-modal-overlay">
      <div className="user-modal-content">
        <div className="user-modal-header">
          <h2>User Details</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="user-modal-body">
          <div className="user-details-table">
            <table>
              <tbody>
                <tr>
                  <th>User ID</th>
                  <td>{user._id || user.id || "N/A"}</td>
                </tr>
                <tr>
                  <th>Name</th>
                  <td>{user.name || "N/A"}</td>
                </tr>
                <tr>
                  <th>Email</th>
                  <td>{user.email || "N/A"}</td>
                </tr>
                <tr>
                  <th>Role</th>
                  <td>{user.isAdmin ? "Admin" : "User"}</td>
                </tr>
                <tr>
                  <th>Joined Date</th>
                  <td>{formatDate(user.createdAt)}</td>
                </tr>
                <tr>
                  <th>Last Updated</th>
                  <td>{formatDate(user.updatedAt)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function BookingDetailModal({ booking, onClose }) {
  if (!booking) return null

  return (
    <div className="booking-modal-overlay">
      <div className="booking-modal-content">
        <div className="booking-modal-header">
          <h2>Booking Details</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="booking-modal-body">
          <div className="booking-details-table">
            <table>
              <tbody>
                <tr>
                  <th>Booking ID</th>
                  <td>{booking._id || booking.id || "N/A"}</td>
                </tr>
                <tr>
                  <th>Property</th>
                  <td>
                    {booking.propertyId
                      ? typeof booking.propertyId === "object"
                        ? booking.propertyId.title
                        : booking.propertyTitle || "Unknown Property"
                      : booking.propertyTitle || "Unknown Property"}
                  </td>
                </tr>
                <tr>
                  <th>Tenant</th>
                  <td>
                    {booking.tenantId
                      ? typeof booking.tenantId === "object"
                        ? booking.tenantId.name
                        : booking.name || "Unknown User"
                      : booking.name || "Unknown User"}
                  </td>
                </tr>
                <tr>
                  <th>Tenant Email</th>
                  <td>{booking.email || (booking.tenantId && booking.tenantId.email) || "N/A"}</td>
                </tr>
                <tr>
                  <th>Tenant Phone</th>
                  <td>{booking.phone || "N/A"}</td>
                </tr>
                <tr>
                  <th>Move-in Date</th>
                  <td>{formatDate(booking.moveInDate)}</td>
                </tr>
                <tr>
                  <th>Lease Duration</th>
                  <td>{booking.leaseDuration || "N/A"} months</td>
                </tr>
                <tr>
                  <th>Status</th>
                  <td>
                    <span className={`status-badge ${booking.status}`}>{booking.status || "pending"}</span>
                  </td>
                </tr>
                <tr>
                  <th>Request Date</th>
                  <td>{formatDate(booking.requestDate || booking.createdAt)}</td>
                </tr>
                {booking.responseDate && (
                  <tr>
                    <th>Response Date</th>
                    <td>{formatDate(booking.responseDate)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {booking.message && (
            <div className="booking-message-section">
              <h3>Tenant Message</h3>
              <p>{booking.message}</p>
            </div>
          )}

          {booking.responseMessage && (
            <div className="booking-response-section">
              <h3>Landlord Response</h3>
              <p>{booking.responseMessage}</p>
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
  const [users, setUsers] = useState([])
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalRevenue: 0,
    featuredProperties: 0,
    totalUsers: 0,
    totalBookings: 0,
  })
  const [isLoadingProperties, setIsLoadingProperties] = useState(true)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isLoadingBookings, setIsLoadingBookings] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [activeTab, setActiveTab] = useState("dashboard") // Default to dashboard tab
  const [sortConfig, setSortConfig] = useState({ key: "price", direction: "ascending" })
  const [userSortConfig, setUserSortConfig] = useState({ key: "name", direction: "ascending" })
  const [bookingSortConfig, setBookingSortConfig] = useState({ key: "requestDate", direction: "descending" })
  const [searchTerm, setSearchTerm] = useState("")
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all")
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("")

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

      // Fetch users and bookings
      fetchUsers()
      fetchBookings()
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

      setStats((prevStats) => ({
        ...prevStats,
        totalProperties: processedProperties.length,
        totalRevenue,
        featuredProperties: featuredCount, // Use the accurate count
      }))

      setLastRefreshed(new Date())
      setIsLoadingProperties(false)
    } catch (err) {
      console.error("Error fetching properties:", err)
      setIsLoadingProperties(false)
      setError("Failed to load properties. Please try again.")
    }
  }

  // Replace the fetchUsers function with this direct implementation
  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    setError(null)

    console.log("Starting user fetch process...")

    // Try multiple endpoints with direct fetch
    const endpoints = [
      `${API_BASE_URL}/api/public/users`,
      `${API_BASE_URL}/public/users`,
      `${API_BASE_URL}/api/users`,
      `${API_BASE_URL}/users`,
    ]

    let userData = null
    let successEndpoint = null

    for (const endpoint of endpoints) {
      try {
        console.log(`Attempting to fetch users from: ${endpoint}`)

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          // Don't include credentials to bypass auth
          credentials: "omit",
        })

        console.log(`Response status from ${endpoint}:`, response.status)

        if (response.ok) {
          const data = await response.json()
          console.log(`Data received from ${endpoint}:`, data)

          if (Array.isArray(data) && data.length > 0) {
            userData = data
            successEndpoint = endpoint
            console.log(`Successfully fetched ${data.length} users from ${endpoint}`)
            break
          } else if (data && (data.users || data.data)) {
            userData = data.users || data.data
            successEndpoint = endpoint
            console.log(`Successfully fetched ${userData.length} users from ${endpoint} (nested data)`)
            break
          } else {
            console.log(`Endpoint ${endpoint} returned data but no users array found`)
          }
        } else {
          console.log(`Endpoint ${endpoint} returned status ${response.status}`)
        }
      } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error)
      }
    }

    if (userData && Array.isArray(userData) && userData.length > 0) {
      console.log(`Setting ${userData.length} users from ${successEndpoint}`)
      setUsers(userData)

      // Update stats
      setStats((prevStats) => ({
        ...prevStats,
        totalUsers: userData.length,
      }))

      setIsLoadingUsers(false)
    } else {
      console.error("All user fetch attempts failed")
      setError("Failed to load users. Please check the console for details.")
      setIsLoadingUsers(false)

      // IMPORTANT: We're not falling back to mock data anymore
      // Just set an empty array instead
      setUsers([])
    }
  }

  // Replace the fetchBookings function with this direct implementation
  const fetchBookings = async () => {
    setIsLoadingBookings(true)
    setError(null)

    console.log("Starting bookings fetch process...")

    // Try multiple endpoints with direct fetch
    const endpoints = [
      `${API_BASE_URL}/api/public/bookings`,
      `${API_BASE_URL}/public/bookings`,
      `${API_BASE_URL}/api/bookings/all`,
      `${API_BASE_URL}/bookings/all`,
    ]

    let bookingsData = null
    let successEndpoint = null

    for (const endpoint of endpoints) {
      try {
        console.log(`Attempting to fetch bookings from: ${endpoint}`)

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          // Don't include credentials to bypass auth
          credentials: "omit",
        })

        console.log(`Response status from ${endpoint}:`, response.status)

        if (response.ok) {
          const data = await response.json()
          console.log(`Data received from ${endpoint}:`, data)

          if (Array.isArray(data) && data.length > 0) {
            bookingsData = data
            successEndpoint = endpoint
            console.log(`Successfully fetched ${data.length} bookings from ${endpoint}`)
            break
          } else if (data && (data.bookings || data.data)) {
            bookingsData = data.bookings || data.data
            successEndpoint = endpoint
            console.log(`Successfully fetched ${bookingsData.length} bookings from ${endpoint} (nested data)`)
            break
          } else {
            console.log(`Endpoint ${endpoint} returned data but no bookings array found`)
          }
        } else {
          console.log(`Endpoint ${endpoint} returned status ${response.status}`)
        }
      } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error)
      }
    }

    if (bookingsData && Array.isArray(bookingsData) && bookingsData.length > 0) {
      console.log(`Setting ${bookingsData.length} bookings from ${successEndpoint}`)
      setBookings(bookingsData)

      // Update stats
      setStats((prevStats) => ({
        ...prevStats,
        totalBookings: bookingsData.length,
      }))

      setIsLoadingBookings(false)
    } else {
      console.error("All booking fetch attempts failed")
      setError("Failed to load bookings. Please check the console for details.")
      setIsLoadingBookings(false)

      // IMPORTANT: We're not falling back to mock data anymore
      // Just set an empty array instead
      setBookings([])
    }
  }

  // UPDATED: Enhanced property deletion function
  const handleDeleteProperty = async (propertyId) => {
    console.log(`Attempting to delete property: ${propertyId} using enhanced deletion`)

    try {
      // Show confirmation dialog
      if (!window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
        return
      }

      setIsLoading(true)
      setMessage("Deleting property... This may take a moment.")
      setMessageType("info")

      // Use the enhanced deletePropertyPermanently function
      const result = await deletePropertyPermanently(propertyId)
      
      console.log("Property deletion result:", result)

      // Update the UI by removing the property from the list
      setProperties((prevProperties) => 
        prevProperties.filter((p) => (p._id || p.id) !== propertyId)
      )

      // Update stats
      setStats((prevStats) => ({
        ...prevStats,
        totalProperties: prevStats.totalProperties - 1,
      }))

      // Show success message
      setMessage("Property deleted successfully and all caches cleared")
      setMessageType("success")

      // Hide the message after 3 seconds
      setTimeout(() => {
        setMessage("")
        setMessageType("")
      }, 3000)

      // Refresh the properties list to ensure UI is in sync
      fetchProperties()
    } catch (error) {
      console.error("Error deleting property:", error)
      
      // Even if the server deletion fails, try to clean up client-side
      try {
        // Perform client-side cleanup
        clearAllPropertyCaches(propertyId)
        addToDeletedPropertiesBlacklist(propertyId)
        notifyAllComponentsOfDeletion(propertyId)
        
        // Update the UI
        setProperties((prevProperties) => 
          prevProperties.filter((p) => (p._id || p.id) !== propertyId)
        )
        
        setMessage("Property marked as deleted locally, but server deletion failed. The property will be filtered out on refresh.")
        setMessageType("warning")
      } catch (cleanupError) {
        console.error("Error during client-side cleanup:", cleanupError)
        setMessage(`Error deleting property: ${error.message || "Unknown error"}`)
        setMessageType("error")
      }
    } finally {
      setIsLoading(false)
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
    fetchUsers()
    fetchBookings()
    setLastRefreshed(new Date())
  }

  const handlePropertyClick = (property) => {
    setSelectedProperty(property)
  }

  const handleUserClick = (user) => {
    setSelectedUser(user)
  }

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking)
  }

  const closePropertyModal = () => {
    setSelectedProperty(null)
  }

  const closeUserModal = () => {
    setSelectedUser(null)
  }

  const closeBookingModal = () => {
    setSelectedBooking(null)
  }

  // Handle tab change when clicking on sidebar items
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    // Reset search and filters when changing tabs
    setSearchTerm("")
    setBookingStatusFilter("all")
  }

  // Handle sorting for properties
  const requestSort = (key) => {
    let direction = "ascending"
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Handle sorting for users
  const requestUserSort = (key) => {
    let direction = "ascending"
    if (userSortConfig.key === key && userSortConfig.direction === "ascending") {
      direction = "descending"
    }
    setUserSortConfig({ key, direction })
  }

  // Handle sorting for bookings
  const requestBookingSort = (key) => {
    let direction = "ascending"
    if (bookingSortConfig.key === key && bookingSortConfig.direction === "ascending") {
      direction = "descending"
    }
    setBookingSortConfig({ key, direction })
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

  // Get sorted and filtered users
  const getSortedAndFilteredUsers = () => {
    // First filter by search term
    const filteredUsers = users.filter((user) => {
      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return (
        (user.name && user.name.toLowerCase().includes(searchLower)) ||
        (user.email && user.email.toLowerCase().includes(searchLower))
      )
    })

    // Then sort
    return filteredUsers.sort((a, b) => {
      let aValue = a[userSortConfig.key]
      let bValue = b[userSortConfig.key]

      // Handle nested properties
      if (userSortConfig.key.includes(".")) {
        const keys = userSortConfig.key.split(".")
        aValue = keys.reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : null), a)
        bValue = keys.reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : null), b)
      }

      // Handle null or undefined values
      if (aValue === null || aValue === undefined) return userSortConfig.direction === "ascending" ? -1 : 1
      if (bValue === null || bValue === undefined) return userSortConfig.direction === "ascending" ? 1 : -1

      // Handle dates
      if (userSortConfig.key === "createdAt" || userSortConfig.key === "updatedAt") {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (aValue < bValue) {
        return userSortConfig.direction === "ascending" ? -1 : 1
      }
      if (aValue > bValue) {
        return userSortConfig.direction === "ascending" ? 1 : -1
      }
      return 0
    })
  }

  // Get sorted and filtered bookings
  const getSortedAndFilteredBookings = () => {
    // First filter by status
    const filteredBookings = bookings.filter((booking) => {
      if (bookingStatusFilter === "all") return true
      return booking.status === bookingStatusFilter
    })

    // Then sort
    return filteredBookings.sort((a, b) => {
      let aValue = a[bookingSortConfig.key]
      let bValue = b[bookingSortConfig.key]

      // Handle nested properties
      if (bookingSortConfig.key.includes(".")) {
        const keys = bookingSortConfig.key.split(".")
        aValue = keys.reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : null), a)
        bValue = keys.reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : null), b)
      }

      // Handle null or undefined values
      if (aValue === null || aValue === undefined) return bookingSortConfig.direction === "ascending" ? -1 : 1
      if (bValue === null || bValue === undefined) return bookingSortConfig.direction === "ascending" ? 1 : -1

      // Handle dates
      if (
        bookingSortConfig.key === "createdAt" ||
        bookingSortConfig.key === "updatedAt" ||
        bookingSortConfig.key === "moveInDate" ||
        bookingSortConfig.key === "requestDate" ||
        bookingSortConfig.key === "responseDate"
      ) {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (aValue < bValue) {
        return bookingSortConfig.direction === "ascending" ? -1 : 1
      }
      if (aValue > bValue) {
        return bookingSortConfig.direction === "ascending" ? 1 : -1
      }
      return 0
    })
  }

  const sortedProperties = getSortedProperties()
  const sortedAndFilteredUsers = getSortedAndFilteredUsers()
  const sortedAndFilteredBookings = getSortedAndFilteredBookings()

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

  // Emergency purge function
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

  // UPDATED: Use the enhanced deletion function
  const handleDeletePropertyUI = async (property) => {
    const propertyId = property._id || property.id
    const propertyTitle = property.title || "this property"

    // Call the enhanced deletion function
    await handleDeleteProperty(propertyId)
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
            {isLoadingProperties || isLoadingUsers || isLoadingBookings ? (
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
              <li className={activeTab === "users" ? "active" : ""} onClick={() => handleTabChange("users")}>
                Users
              </li>
              <li className={activeTab === "bookings" ? "active" : ""} onClick={() => handleTabChange("bookings")}>
                Bookings
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

          {message && (
            <div className={`message ${messageType}`}>
              <Check size={18} />
              {message}
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
                  <h3>Users</h3>
                  <p className="stat-number">{isLoadingUsers ? "Loading..." : stats.totalUsers}</p>
                </div>
                <div className="stat-card">
                  <h3>Bookings</h3>
                  <p className="stat-number">{isLoadingBookings ? "Loading..." : stats.totalBookings}</p>
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
                <p>Welcome to the admin dashboard. Here you can manage properties, users, bookings, and more.</p>
                <div className="quick-actions">
                  <button className="action-button" onClick={() => handleTabChange("properties")}>
                    View All Properties
                  </button>
                  <button className="action-button" onClick={() => handleTabChange("users")}>
                    View All Users
                  </button>
                  <button className="action-button" onClick={() => handleTabChange("bookings")}>
                    View All Bookings
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
                              <button
                                className="action-icon delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeletePropertyUI(property)
                                }}
                                title="Delete Property"
                              >
                                <Trash2 size={18} />
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

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="users-section">
              <h2>All Users</h2>
              <div className="filter-controls">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              {isLoadingUsers ? (
                <p>Loading users...</p>
              ) : (
                <div className="users-table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th className="sortable" onClick={() => requestUserSort("name")}>
                          Name
                          {userSortConfig.key === "name" &&
                            (userSortConfig.direction === "ascending" ? (
                              <ArrowUp size={16} />
                            ) : (
                              <ArrowDown size={16} />
                            ))}
                        </th>
                        <th className="sortable" onClick={() => requestUserSort("email")}>
                          Email
                          {userSortConfig.key === "email" &&
                            (userSortConfig.direction === "ascending" ? (
                              <ArrowUp size={16} />
                            ) : (
                              <ArrowDown size={16} />
                            ))}
                        </th>
                        <th className="sortable" onClick={() => requestUserSort("createdAt")}>
                          Joined Date
                          {userSortConfig.key === "createdAt" &&
                            (userSortConfig.direction === "ascending" ? (
                              <ArrowUp size={16} />
                            ) : (
                              <ArrowDown size={16} />
                            ))}
                        </th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAndFilteredUsers.length > 0 ? (
                        sortedAndFilteredUsers.map((user) => (
                          <tr key={user._id || user.id}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{formatDate(user.createdAt)}</td>
                            <td>{user.isAdmin ? "Admin" : "User"}</td>
                            <td className="actions-cell">
                              <button
                                className="action-icon view-btn"
                                onClick={() => handleUserClick(user)}
                                title="View Details"
                              >
                                <User size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="no-data">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === "bookings" && (
            <div className="bookings-section">
              <h2>All Bookings</h2>
              <div className="filter-controls">
                <div className="status-filter">
                  <label>Filter by Status:</label>
                  <select value={bookingStatusFilter} onChange={(e) => setBookingStatusFilter(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              {isLoadingBookings ? (
                <p>Loading bookings...</p>
              ) : (
                <div className="bookings-table-container">
                  <table className="bookings-table">
                    <thead>
                      <tr>
                        <th>Property</th>
                        <th>Tenant</th>
                        <th className="sortable" onClick={() => requestBookingSort("moveInDate")}>
                          Move-in Date
                          {bookingSortConfig.key === "moveInDate" &&
                            (bookingSortConfig.direction === "ascending" ? (
                              <ArrowUp size={16} />
                            ) : (
                              <ArrowDown size={16} />
                            ))}
                        </th>
                        <th>Status</th>
                        <th className="sortable" onClick={() => requestBookingSort("requestDate")}>
                          Request Date
                          {bookingSortConfig.key === "requestDate" &&
                            (bookingSortConfig.direction === "ascending" ? (
                              <ArrowUp size={16} />
                            ) : (
                              <ArrowDown size={16} />
                            ))}
                        </th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAndFilteredBookings.length > 0 ? (
                        sortedAndFilteredBookings.map((booking) => (
                          <tr key={booking._id || booking.id}>
                            <td>
                              {booking.propertyId
                                ? typeof booking.propertyId === "object"
                                  ? booking.propertyId.title
                                  : booking.propertyTitle || "Unknown Property"
                                : booking.propertyTitle || "Unknown Property"}
                            </td>
                            <td>
                              {booking.tenantId
                                ? typeof booking.tenantId === "object"
                                  ? booking.tenantId.name
                                  : booking.name || "Unknown User"
                                : booking.name || "Unknown User"}
                            </td>
                            <td>{formatDate(booking.moveInDate)}</td>
                            <td>
                              <span className={`status-badge ${booking.status}`}>{booking.status || "pending"}</span>
                            </td>
                            <td>{formatDate(booking.requestDate || booking.createdAt)}</td>
                            <td className="actions-cell">
                              <button
                                className="action-icon view-btn"
                                onClick={() => handleBookingClick(booking)}
                                title="View Details"
                              >
                                <Calendar size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="no-data">
                            No bookings found
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
                              <button
                                className="action-icon delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeletePropertyUI(property)
                                }}
                                title="Delete Property"
                              >
                                <Trash2 size={18} />
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
      {selectedUser && <UserDetailModal user={selectedUser} onClose={closeUserModal} />}
      {selectedBooking && <BookingDetailModal booking={selectedBooking} onClose={closeBookingModal} />}
    </div>
  )
}

export default Dashboard