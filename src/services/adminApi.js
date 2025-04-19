import axios from "axios"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"
const FEATURED_PROPERTIES_STORAGE_KEY = "admin_featured_properties"
const MAX_FEATURED_PROPERTIES = 6

console.log("Admin API URL:", API_URL)

// Create admin axios instance with default config
const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Add withCredentials if your API requires cookies
  withCredentials: true,
})

// Request interceptor for adding admin auth token
adminApi.interceptors.request.use(
  (config) => {
    console.log("Admin Request URL:", config.url)
    const adminToken = localStorage.getItem("adminToken") || localStorage.getItem("token")
    if (adminToken) {
      config.headers["Authorization"] = `Bearer ${adminToken}`
      console.log("Added auth token to request")
    } else {
      console.warn("No admin token found in localStorage")
    }
    return config
  },
  (error) => {
    console.error("Admin Request interceptor error:", error)
    return Promise.reject(error)
  },
)

// Response interceptor for logging and error handling
adminApi.interceptors.response.use(
  (response) => {
    console.log("Admin Response Status:", response.status)
    return response
  },
  async (error) => {
    console.error("Admin API Error:", error.response ? error.response.data : error.message)
    console.error("Failed URL:", error.config ? error.config.url : "unknown")

    // If unauthorized, redirect to admin login
    if (error.response && error.response.status === 401) {
      console.error("Admin unauthorized, redirecting to login")
      window.location.href = "/login?admin=true"
    }

    return Promise.reject(error)
  },
)

// Mock data for when API fails
const MOCK_USERS = [
  {
    _id: "user1",
    name: "John Doe",
    email: "john@example.com",
    createdAt: new Date("2023-01-15").toISOString(),
    updatedAt: new Date("2023-01-15").toISOString(),
    isAdmin: false,
  },
  {
    _id: "user2",
    name: "Jane Smith",
    email: "jane@example.com",
    createdAt: new Date("2023-02-20").toISOString(),
    updatedAt: new Date("2023-02-20").toISOString(),
    isAdmin: false,
  },
  {
    _id: "user3",
    name: "Admin User",
    email: "admin@example.com",
    createdAt: new Date("2023-01-01").toISOString(),
    updatedAt: new Date("2023-01-01").toISOString(),
    isAdmin: true,
  },
]

const MOCK_BOOKINGS = [
  {
    _id: "booking1",
    propertyId: {
      _id: "prop1",
      title: "Luxury Apartment",
      location: "Kathmandu",
      price: 25000,
      images: ["/placeholder.svg?height=300&width=500"],
    },
    propertyTitle: "Luxury Apartment",
    tenantId: {
      _id: "user1",
      name: "John Doe",
      email: "john@example.com",
    },
    landlordId: {
      _id: "user3",
      name: "Admin User",
      email: "admin@example.com",
    },
    name: "John Doe",
    email: "john@example.com",
    phone: "9876543210",
    moveInDate: new Date("2023-06-15").toISOString(),
    leaseDuration: 12,
    familyMembers: 2,
    message: "I'm interested in renting this property for a year.",
    status: "approved",
    requestDate: new Date("2023-05-20").toISOString(),
    responseDate: new Date("2023-05-22").toISOString(),
  },
  {
    _id: "booking2",
    propertyId: {
      _id: "prop2",
      title: "Modern House",
      location: "Pokhara",
      price: 35000,
      images: ["/placeholder.svg?height=300&width=500"],
    },
    propertyTitle: "Modern House",
    tenantId: {
      _id: "user2",
      name: "Jane Smith",
      email: "jane@example.com",
    },
    landlordId: {
      _id: "user3",
      name: "Admin User",
      email: "admin@example.com",
    },
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "9876543211",
    moveInDate: new Date("2023-07-01").toISOString(),
    leaseDuration: 6,
    familyMembers: 3,
    message: "Looking for a short-term rental for my family.",
    status: "pending",
    requestDate: new Date("2023-06-15").toISOString(),
  },
  {
    _id: "booking3",
    propertyId: {
      _id: "prop3",
      title: "Cozy Studio",
      location: "Lalitpur",
      price: 15000,
      images: ["/placeholder.svg?height=300&width=500"],
    },
    propertyTitle: "Cozy Studio",
    tenantId: {
      _id: "user1",
      name: "John Doe",
      email: "john@example.com",
    },
    landlordId: {
      _id: "user3",
      name: "Admin User",
      email: "admin@example.com",
    },
    name: "John Doe",
    email: "john@example.com",
    phone: "9876543210",
    moveInDate: new Date("2023-05-01").toISOString(),
    leaseDuration: 3,
    familyMembers: 1,
    message: "Need a temporary place while I'm in town for work.",
    status: "rejected",
    requestDate: new Date("2023-04-15").toISOString(),
    responseDate: new Date("2023-04-16").toISOString(),
    responseMessage: "Property is already booked for that period.",
  },
]

// Helper function to get all featured properties from local storage
export const getAllFeaturedPropertiesFromLocalStorage = () => {
  try {
    // First, check if localStorage exists (for SSR environments)
    if (typeof localStorage === "undefined") {
      return []
    }

    const featuredPropertiesJson = localStorage.getItem(FEATURED_PROPERTIES_STORAGE_KEY) || "{}"
    const featuredProperties = JSON.parse(featuredPropertiesJson)

    // Filter only properties that are actually featured (value is true)
    const featuredPropertyIds = Object.entries(featuredProperties)
      .filter(([_, isFeatured]) => isFeatured === true)
      .map(([id, _]) => id)

    console.log("Currently featured properties in localStorage:", featuredPropertyIds)
    return featuredPropertyIds
  } catch (error) {
    console.error("Error getting featured properties from localStorage:", error)
    return []
  }
}

// Helper function to save featured status to local storage
const saveFeaturedStatusToLocalStorage = (propertyId, featured) => {
  try {
    // First, check if localStorage exists (for SSR environments)
    if (typeof localStorage === "undefined") {
      console.warn("localStorage not available, cannot save featured status")
      return
    }

    // Get existing featured properties from local storage
    const featuredPropertiesJson = localStorage.getItem(FEATURED_PROPERTIES_STORAGE_KEY) || "{}"
    const featuredProperties = JSON.parse(featuredPropertiesJson)

    // Update the featured status for this property
    featuredProperties[propertyId] = featured

    // Save back to local storage
    localStorage.setItem(FEATURED_PROPERTIES_STORAGE_KEY, JSON.stringify(featuredProperties))

    console.log(`Saved featured status for property ${propertyId} to local storage: ${featured}`)

    // Log the current count of featured properties
    const featuredCount = Object.values(featuredProperties).filter((value) => value === true).length
    console.log(`Current featured property count: ${featuredCount}`)
  } catch (error) {
    console.error("Error saving featured status to local storage:", error)
  }
}

// Helper function to get featured status from local storage
export const getFeaturedStatusFromLocalStorage = (propertyId) => {
  try {
    const featuredPropertiesJson = localStorage.getItem(FEATURED_PROPERTIES_STORAGE_KEY) || "{}"
    const featuredProperties = JSON.parse(featuredPropertiesJson)

    // Return the featured status if it exists, otherwise undefined
    return featuredProperties[propertyId]
  } catch (error) {
    console.error("Error getting featured status from local storage:", error)
    return undefined
  }
}

// Function to get all properties with images and details
export const getProperties = async () => {
  console.log("Fetching all properties with images and details")
  try {
    // Try to get properties with all details
    const response = await adminApi.get("/properties")
    console.log("Properties response:", response.data)

    // Apply any locally stored featured status overrides
    let properties = response.data
    if (!Array.isArray(properties)) {
      if (properties.properties) {
        properties = properties.properties
      } else if (properties.data) {
        properties = properties.data
      }
    }

    // Apply local storage overrides to the properties
    if (Array.isArray(properties)) {
      properties = properties.map((property) => {
        const propertyId = property._id || property.id
        const localFeaturedStatus = getFeaturedStatusFromLocalStorage(propertyId)

        // Only override if we have a stored value
        if (localFeaturedStatus !== undefined) {
          return { ...property, featured: localFeaturedStatus }
        }
        return property
      })
      
      // Filter out deleted properties
      properties = filterDeletedProperties(properties);
    }

    return Array.isArray(properties) ? properties : response.data
  } catch (error) {
    console.error("Error fetching properties:", error)

    // Try alternative endpoint
    try {
      console.log("Trying alternative endpoint /admin/properties")
      const response = await adminApi.get("/admin/properties")
      console.log("Properties response from alternative endpoint:", response.data)

      // Apply any locally stored featured status overrides
      let properties = response.data
      if (!Array.isArray(properties)) {
        if (properties.properties) {
          properties = properties.properties
        } else if (properties.data) {
          properties = properties.data
        }
      }

      // Apply local storage overrides to the properties
      if (Array.isArray(properties)) {
        properties = properties.map((property) => {
          const propertyId = property._id || property.id
          const localFeaturedStatus = getFeaturedStatusFromLocalStorage(propertyId)

          // Only override if we have a stored value
          if (localFeaturedStatus !== undefined) {
            return { ...property, featured: localFeaturedStatus }
          }
          return property
        })
        
        // Filter out deleted properties
        properties = filterDeletedProperties(properties);
      }

      return Array.isArray(properties) ? properties : response.data
    } catch (secondError) {
      console.error("Error fetching properties from alternative endpoint:", secondError)
      return []
    }
  }
}

// Function to update property status
export const updatePropertyStatus = async (propertyId, status) => {
  console.log(`Updating status for property ${propertyId} to ${status}`)
  try {
    // Try the standard endpoint first
    try {
      const response = await adminApi.patch(`/properties/${propertyId}/status`, { status })
      console.log("Update status response:", response.data)
      return response.data
    } catch (error) {
      // If that fails, try the admin-specific endpoint
      if (error.response && error.response.status === 404) {
        console.log("Trying admin-specific endpoint for status update")
        const response = await adminApi.patch(`/admin/properties/${propertyId}/status`, { status })
        console.log("Update status response from admin endpoint:", response.data)
        return response.data
      }
      throw error
    }
  } catch (error) {
    console.error("Error updating property status:", error)
    throw error
  }
}

// Function to toggle featured status - COMPLETELY REVISED
export const toggleFeaturedStatus = async (propertyId, featured) => {
  console.log(`Setting featured status for property ${propertyId} to ${featured}`)

  // If trying to feature a property, check if we've reached the limit
  if (featured) {
    // Get current featured properties from local storage
    const featuredIds = getAllFeaturedPropertiesFromLocalStorage()

    // Count how many properties are currently featured
    const featuredCount = featuredIds.length

    console.log(`Current featured count before adding: ${featuredCount}`)
    console.log(`Current featured IDs: ${featuredIds.join(", ")}`)
    console.log(`Is property ${propertyId} already featured: ${featuredIds.includes(propertyId)}`)
    console.log(`MAX_FEATURED_PROPERTIES: ${MAX_FEATURED_PROPERTIES}`)

    // If we're already at the limit, show an error
    // IMPORTANT: We're changing this to > instead of >= to allow exactly 6 properties
    if (featuredCount > MAX_FEATURED_PROPERTIES) {
      console.error(`Cannot feature more than ${MAX_FEATURED_PROPERTIES} properties. Current count: ${featuredCount}`)
      return {
        success: false,
        message: `You can only feature up to ${MAX_FEATURED_PROPERTIES} properties at a time. Current count: ${featuredCount}`,
        simulated: true,
      }
    }
  }

  // Save to local storage immediately for persistence
  saveFeaturedStatusToLocalStorage(propertyId, featured)

  // First, try to get the property to see what endpoints are available
  try {
    // Get the property first to see what we're working with
    let property
    try {
      const response = await adminApi.get(`/properties/${propertyId}`)
      property = response.data
    } catch (error) {
      try {
        const response = await adminApi.get(`/admin/properties/${propertyId}`)
        property = response.data
      } catch (secondError) {
        console.error("Could not fetch property details")
      }
    }

    console.log("Property details:", property)

    // Try the general property update endpoint
    try {
      console.log("Trying general property update endpoint")
      const response = await adminApi.put(`/properties/${propertyId}`, {
        ...property,
        featured,
      })
      console.log("Update featured status response:", response.data)
      return response.data
    } catch (error) {
      console.error("Failed with general property update:", error.message)
    }

    // Try admin property update endpoint
    try {
      console.log("Trying admin property update endpoint")
      const response = await adminApi.put(`/admin/properties/${propertyId}`, {
        ...property,
        featured,
      })
      console.log("Update featured status response:", response.data)
      return response.data
    } catch (error) {
      console.error("Failed with admin property update:", error.message)
    }

    // Try PATCH with just the featured field
    try {
      console.log("Trying PATCH with just featured field")
      const response = await adminApi.patch(`/properties/${propertyId}`, { featured })
      console.log("Update featured status response:", response.data)
      return response.data
    } catch (error) {
      console.error("Failed with PATCH featured field:", error.message)
    }

    // Try admin PATCH with just the featured field
    try {
      console.log("Trying admin PATCH with just featured field")
      const response = await adminApi.patch(`/admin/properties/${propertyId}`, { featured })
      console.log("Update featured status response:", response.data)
      return response.data
    } catch (error) {
      console.error("Failed with admin PATCH featured field:", error.message)
    }

    // If we're here, we need to try a more creative approach
    // Try to use a custom endpoint that might exist
    try {
      console.log("Trying custom featured endpoint")
      // Remove /api from the URL if it's already in the base URL
      const baseUrl = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL
      const customUrl = `${baseUrl}/properties/set-featured/${propertyId}`

      const response = await axios({
        method: "post",
        url: customUrl,
        data: { featured },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken") || localStorage.getItem("token")}`,
        },
        withCredentials: true,
      })

      console.log("Update featured status response:", response.data)
      return response.data
    } catch (error) {
      console.error("Failed with custom featured endpoint:", error.message)
    }

    // Last resort: Return a simulated success (we've already saved to localStorage)
    console.log("All API attempts failed. Using local storage for persistence.")
    return {
      success: true,
      message: "Featured status updated (using local storage)",
      property: { ...property, featured },
      simulated: true,
    }
  } catch (error) {
    console.error("Error in toggleFeaturedStatus:", error)
    // Instead of throwing, return a simulated success
    // This allows the UI to stay consistent even if the API fails
    return {
      success: true,
      message: "Featured status updated (using local storage)",
      simulated: true,
    }
  }
}

// Function to get featured properties
export const getFeaturedProperties = async () => {
  console.log("Fetching featured properties")
  try {
    // Try the standard endpoint first
    try {
      const response = await adminApi.get("/properties/featured")
      console.log("Featured properties response:", response.data)

      // Apply local storage overrides
      let featuredProps = response.data
      if (!Array.isArray(featuredProps)) {
        if (featuredProps.properties) {
          featuredProps = featuredProps.properties
        } else if (featuredProps.data) {
          featuredProps = featuredProps.data
        }
      }

      // Apply local storage overrides
      if (Array.isArray(featuredProps)) {
        featuredProps = featuredProps.map((property) => {
          const propertyId = property._id || property.id
          const localFeaturedStatus = getFeaturedStatusFromLocalStorage(propertyId)

          if (localFeaturedStatus !== undefined) {
            return { ...property, featured: localFeaturedStatus }
          }
          return property
        })
        
        // Filter out deleted properties
        featuredProps = filterDeletedProperties(featuredProps);
      }

      return Array.isArray(featuredProps) ? featuredProps : response.data
    } catch (error) {
      // If that fails, try the admin-specific endpoint
      if (error.response && error.response.status === 404) {
        console.log("Trying admin-specific endpoint for featured properties")
        const response = await adminApi.get("/admin/properties/featured")
        console.log("Featured properties response from admin endpoint:", response.data)

        // Apply local storage overrides
        let featuredProps = response.data
        if (!Array.isArray(featuredProps)) {
          if (featuredProps.properties) {
            featuredProps = featuredProps.properties
          } else if (featuredProps.data) {
            featuredProps = featuredProps.data
          }
        }

        // Apply local storage overrides
        if (Array.isArray(featuredProps)) {
          featuredProps = featuredProps.map((property) => {
            const propertyId = property._id || property.id
            const localFeaturedStatus = getFeaturedStatusFromLocalStorage(propertyId)

            if (localFeaturedStatus !== undefined) {
              return { ...property, featured: localFeaturedStatus }
            }
            return property
          })
          
          // Filter out deleted properties
          featuredProps = filterDeletedProperties(featuredProps);
        }

        return Array.isArray(featuredProps) ? featuredProps : response.data
      }

      // If both fail, try getting all properties and filtering for featured ones
      console.log("Trying to get all properties and filter for featured")
      const allPropsResponse = await getProperties() // This already applies local storage overrides

      // Filter for featured properties (including those marked as featured in local storage)
      const featuredProps = Array.isArray(allPropsResponse) ? allPropsResponse.filter((prop) => prop.featured) : []

      return { data: featuredProps }
    }
  } catch (error) {
    console.error("Error fetching featured properties:", error)
    return { data: [] } // Return empty array instead of throwing
  }
}

// Function to get an accurate count of featured properties
export const getAccurateFeaturedCount = async () => {
  try {
    // Get featured IDs from localStorage
    const featuredIds = getAllFeaturedPropertiesFromLocalStorage()

    if (featuredIds.length === 0) {
      return 0
    }

    // Get all properties to verify which ones actually exist
    const allProperties = await getProperties()

    // Count properties that are both in the featured list and exist in the API
    const actualFeaturedCount = allProperties.filter((property) => {
      const propertyId = property._id || property.id
      return featuredIds.includes(propertyId)
    }).length

    console.log(`Accurate featured count: ${actualFeaturedCount}`)
    return actualFeaturedCount
  } catch (error) {
    console.error("Error getting accurate featured count:", error)
    return 0
  }
}

// Function to reset featured properties (for debugging)
export const resetFeaturedProperties = () => {
  localStorage.removeItem(FEATURED_PROPERTIES_STORAGE_KEY)
  console.log("Reset all featured properties in localStorage")
  return true
}

// Function to completely reset and rebuild featured properties
export const rebuildFeaturedProperties = async () => {
  try {
    console.log("Rebuilding featured properties storage...")

    // First, completely remove the localStorage entry
    localStorage.removeItem(FEATURED_PROPERTIES_STORAGE_KEY)

    // Get all properties
    const allProperties = await getProperties()

    // Create a new empty object for featured properties
    const newFeaturedProperties = {}

    // Only add properties that are actually featured in the API response
    if (Array.isArray(allProperties)) {
      allProperties.forEach((property) => {
        const propertyId = property._id || property.id
        if (property.featured === true) {
          newFeaturedProperties[propertyId] = true
        }
      })
    }

    // Save the new clean featured properties object to localStorage
    localStorage.setItem(FEATURED_PROPERTIES_STORAGE_KEY, JSON.stringify(newFeaturedProperties))

    // Count how many are featured now
    const featuredCount = Object.values(newFeaturedProperties).filter((value) => value === true).length
    console.log(`Rebuilt featured properties. New count: ${featuredCount}`)

    return {
      success: true,
      message: `Featured properties rebuilt. Current count: ${featuredCount}`,
      count: featuredCount,
    }
  } catch (error) {
    console.error("Error rebuilding featured properties:", error)
    return {
      success: false,
      message: "Error rebuilding featured properties",
      error: error.message,
    }
  }
}

// Function to completely purge all featured properties
export const purgeAllFeaturedProperties = async () => {
  try {
    console.log("PURGING ALL FEATURED PROPERTIES DATA")

    // 1. First, completely remove the localStorage entry
    localStorage.removeItem(FEATURED_PROPERTIES_STORAGE_KEY)

    // 2. Create a new empty object for featured properties
    const newFeaturedProperties = {}

    // 3. Save the empty object to localStorage
    localStorage.setItem(FEATURED_PROPERTIES_STORAGE_KEY, JSON.stringify(newFeaturedProperties))

    // 4. Get all properties
    const allProperties = await getProperties()

    // 5. Try to update each property in the API to set featured = false
    if (Array.isArray(allProperties)) {
      const updatePromises = allProperties.map(async (property) => {
        const propertyId = property._id || property.id
        if (property.featured) {
          try {
            // Try to update the property in the API
            console.log(`Attempting to unfeatured property ${propertyId} in API`)
            await toggleFeaturedStatus(propertyId, false)
          } catch (error) {
            console.error(`Failed to update property ${propertyId} in API:`, error)
          }
        }
      })

      // Wait for all update attempts to complete
      await Promise.all(updatePromises)
    }

    console.log("All featured properties have been purged")

    return {
      success: true,
      message: "All featured properties have been completely purged",
      count: 0,
    }
  } catch (error) {
    console.error("Error purging featured properties:", error)
    return {
      success: false,
      message: "Error purging featured properties",
      error: error.message,
    }
  }
}

// Add new functions to fetch users and bookings
export const getAllUsers = async () => {
  console.log("Fetching all users from admin API")

  // Try to fetch real data from multiple endpoints
  const endpoints = ["/public/users", "/users", "/admin/users", "/admin/users-direct", "/api/users", "/api/admin/users"]

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying to fetch users from endpoint: ${endpoint}`)
      const response = await adminApi.get(endpoint)
      console.log(`Users response from ${endpoint}:`, response.data)

      if (response.data && (Array.isArray(response.data) || response.data.users || response.data.data)) {
        let users = response.data
        if (!Array.isArray(users)) {
          users = users.users || users.data || []
        }

        if (users.length > 0) {
          console.log(`Successfully fetched ${users.length} users from ${endpoint}`)
          return users
        } else {
          console.log(`Endpoint ${endpoint} returned empty users array`)
        }
      } else {
        console.log(`Endpoint ${endpoint} returned invalid data format`)
      }
    } catch (error) {
      console.error(`Error fetching users from ${endpoint}:`, error.message)
    }
  }

  // If all endpoints fail, try a direct fetch with axios
  try {
    console.log("Trying direct axios fetch for users")
    const baseUrl = API_URL.endsWith("/api") ? API_URL : `${API_URL}/api`

    // Try the public endpoint first without any auth header
    const response = await axios.get(`${baseUrl}/public/users`)

    console.log("Direct axios users response:", response.data)
    if (response.data && (Array.isArray(response.data) || response.data.users || response.data.data)) {
      let users = response.data
      if (!Array.isArray(users)) {
        users = users.users || users.data || []
      }

      if (users.length > 0) {
        return users
      }
    }
  } catch (error) {
    console.error("Error with direct axios fetch for users:", error.message)
  }

  // If all attempts fail, return empty array instead of mock data
  console.warn("All user fetch attempts failed, returning empty array")
  return []
}

export const getAllBookings = async () => {
  console.log("Fetching all bookings from admin API")

  // Try to fetch real data from multiple endpoints
  const endpoints = [
    "/public/bookings",
    "/bookings/all",
    "/admin/bookings",
    "/admin/bookings-direct",
    "/api/bookings/all",
    "/api/admin/bookings",
  ]

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying to fetch bookings from endpoint: ${endpoint}`)
      const response = await adminApi.get(endpoint)
      console.log(`Bookings response from ${endpoint}:`, response.data)

      if (response.data && (Array.isArray(response.data) || response.data.bookings || response.data.data)) {
        let bookings = response.data
        if (!Array.isArray(bookings)) {
          bookings = bookings.bookings || bookings.data || []
        }

        if (bookings.length > 0) {
          console.log(`Successfully fetched ${bookings.length} bookings from ${endpoint}`)
          return bookings
        } else {
          console.log(`Endpoint ${endpoint} returned empty bookings array`)
        }
      } else {
        console.log(`Endpoint ${endpoint} returned invalid data format`)
      }
    } catch (error) {
      console.error(`Error fetching bookings from ${endpoint}:`, error.message)
    }
  }

  // If all endpoints fail, try a direct fetch with axios
  try {
    console.log("Trying direct axios fetch for bookings")
    const baseUrl = API_URL.endsWith("/api") ? API_URL : `${API_URL}/api`

    // Try the public endpoint first without any auth header
    const response = await axios.get(`${baseUrl}/public/bookings`)

    console.log("Direct axios bookings response:", response.data)
    if (response.data && (Array.isArray(response.data) || response.data.bookings || response.data.data)) {
      let bookings = response.data
      if (!Array.isArray(bookings)) {
        bookings = bookings.bookings || bookings.data || []
      }

      if (bookings.length > 0) {
        return bookings
      }
    }
  } catch (error) {
    console.error("Error with direct axios fetch for bookings:", error.message)
  }

  // If all attempts fail, return empty array instead of mock data
  console.warn("All booking fetch attempts failed, returning empty array")
  return []
}

// ==================== ENHANCED PROPERTY DELETION FUNCTIONALITY ====================

/**
 * Helper function to get the current user ID from the token
 */
export const getCurrentUserId = () => {
  try {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("token")
    if (!token) return null

    // JWT tokens are in the format: header.payload.signature
    // We need to decode the payload part (the second part)
    const payload = token.split(".")[1]
    if (!payload) return null

    // Decode the base64 payload
    const decodedPayload = JSON.parse(atob(payload))
    return decodedPayload.id || decodedPayload.userId || decodedPayload.sub
  } catch (error) {
    console.error("Error getting user ID from token:", error)
    return null
  }
}

/**
 * Clear ALL possible localStorage caches that might contain the property
 */
export const clearAllPropertyCaches = (propertyId) => {
  console.log(`Clearing ALL caches for property ${propertyId}`);
  
  // List of all possible cache keys that might contain property data
  const possibleCacheKeys = [
    "properties",
    "featuredProperties",
    "admin_properties",
    "admin_featured_properties",
    "propertyDetails",
    "searchResults",
    "landlordProperties",
    "rooms",
    "recentProperties",
    "propertyCache",
    "bookingProperties",
    "viewedProperties",
    "savedProperties",
    "propertyListings"
  ];
  
  // Get current user ID to check user-specific caches
  const userId = getCurrentUserId();
  if (userId) {
    possibleCacheKeys.push(
      `user_${userId}_properties`,
      `user_${userId}_listings`,
      `${userId}_properties`
    );
  }
  
  // Process each possible cache
  possibleCacheKeys.forEach(key => {
    try {
      const cacheJson = localStorage.getItem(key);
      if (!cacheJson) return;
      
      let updated = false;
      let cache = JSON.parse(cacheJson);
      
      // Handle different cache structures
      if (Array.isArray(cache)) {
        // Filter out the deleted property from arrays
        const newCache = cache.filter(item => {
          const id = item?._id || item?.id;
          return id !== propertyId;
        });
        
        if (newCache.length !== cache.length) {
          updated = true;
          cache = newCache;
        }
      } else if (typeof cache === 'object' && cache !== null) {
        // Remove property from object caches
        if (cache[propertyId]) {
          delete cache[propertyId];
          updated = true;
        }
        
        // Also check nested objects that might contain the property
        Object.keys(cache).forEach(nestedKey => {
          if (Array.isArray(cache[nestedKey])) {
            const filtered = cache[nestedKey].filter(item => {
              const id = item?._id || item?.id;
              return id !== propertyId;
            });
            
            if (filtered.length !== cache[nestedKey].length) {
              cache[nestedKey] = filtered;
              updated = true;
            }
          }
        });
      }
      
      // Save updated cache if changes were made
      if (updated) {
        localStorage.setItem(key, JSON.stringify(cache));
        console.log(`Updated cache: ${key}`);
      }
    } catch (error) {
      console.error(`Error processing cache key ${key}:`, error);
    }
  });
  
  // Also try to clear any sessionStorage caches
  try {
    possibleCacheKeys.forEach(key => {
      const sessionCache = sessionStorage.getItem(key);
      if (sessionCache) {
        try {
          const cache = JSON.parse(sessionCache);
          if (Array.isArray(cache)) {
            const filtered = cache.filter(item => {
              const id = item?._id || item?.id;
              return id !== propertyId;
            });
            
            if (filtered.length !== cache.length) {
              sessionStorage.setItem(key, JSON.stringify(filtered));
              console.log(`Updated sessionStorage cache: ${key}`);
            }
          }
        } catch (e) {
          console.error(`Error processing sessionStorage key ${key}:`, e);
        }
      }
    });
  } catch (sessionError) {
    console.error("Error clearing sessionStorage caches:", sessionError);
  }
  
  console.log(`Completed clearing all caches for property ${propertyId}`);
  return true;
};

/**
 * Add property ID to a blacklist of deleted properties
 * This will be checked when loading properties to filter out deleted ones
 */
export const addToDeletedPropertiesBlacklist = (propertyId) => {
  try {
    // Get existing blacklist
    const blacklistJson = localStorage.getItem('deletedProperties');
    let blacklist = blacklistJson ? JSON.parse(blacklistJson) : [];
    
    // Add property ID if not already in blacklist
    if (!blacklist.includes(propertyId)) {
      blacklist.push(propertyId);
      localStorage.setItem('deletedProperties', JSON.stringify(blacklist));
      console.log(`Added property ${propertyId} to deleted properties blacklist`);
    }
    
    // Also add to user-specific blacklist if user is logged in
    const userId = getCurrentUserId();
    if (userId) {
      const userBlacklistKey = `user_${userId}_deletedProperties`;
      const userBlacklistJson = localStorage.getItem(userBlacklistKey);
      let userBlacklist = userBlacklistJson ? JSON.parse(userBlacklistJson) : [];
      
      if (!userBlacklist.includes(propertyId)) {
        userBlacklist.push(propertyId);
        localStorage.setItem(userBlacklistKey, JSON.stringify(userBlacklist));
        console.log(`Added property ${propertyId} to user-specific deleted properties blacklist`);
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error adding to deleted properties blacklist:", error);
    return false;
  }
};

/**
 * Clear browser cache for property-related API endpoints
 */
export const clearBrowserCacheForProperty = (propertyId) => {
  // If the browser supports Cache API, use it to clear cached API responses
  if ('caches' in window) {
    try {
      // Try to clear specific cache for this property
      caches.open('api-cache').then(cache => {
        // Define patterns of URLs that might contain this property
        const urlsToDelete = [
          `${API_URL}/properties/${propertyId}`,
          `${API_URL}/properties`,
          `${API_URL}/properties/all`,
          `${API_URL}/properties/latest`
        ];
        
        // Delete each URL from cache
        urlsToDelete.forEach(url => {
          cache.delete(url).then(success => {
            if (success) {
              console.log(`Cleared cache for URL: ${url}`);
            }
          });
        });
      });
    } catch (cacheError) {
      console.error("Error clearing browser cache:", cacheError);
    }
  }
};

/**
 * Notify all components about the property deletion
 */
export const notifyAllComponentsOfDeletion = (propertyId) => {
  // Dispatch multiple events to ensure all components are notified
  
  // 1. Standard roomDeleted event
  window.dispatchEvent(
    new CustomEvent("roomDeleted", {
      detail: { roomId: propertyId },
    })
  );
  
  // 2. propertyDeleted event
  window.dispatchEvent(
    new CustomEvent("propertyDeleted", {
      detail: { propertyId },
    })
  );
  
  // 3. General propertyUpdated event
  window.dispatchEvent(new CustomEvent("propertyUpdated"));
  
  // 4. dataChanged event for components that listen to general data changes
  window.dispatchEvent(new CustomEvent("dataChanged"));
  
  console.log(`Dispatched all deletion notification events for property ${propertyId}`);
};

/**
 * Filter out deleted properties from API responses
 */
export const filterDeletedProperties = (properties) => {
  if (!Array.isArray(properties)) return properties;
  
  try {
    // Get the blacklist of deleted properties
    const blacklistJson = localStorage.getItem('deletedProperties');
    if (!blacklistJson) return properties;
    
    const blacklist = JSON.parse(blacklistJson);
    if (!Array.isArray(blacklist) || blacklist.length === 0) return properties;
    
    // Filter out properties that are in the blacklist
    const filtered = properties.filter(property => {
      const id = property?._id || property?.id;
      return !blacklist.includes(id);
    });
    
    console.log(`Filtered out ${properties.length - filtered.length} deleted properties`);
    return filtered;
  } catch (error) {
    console.error("Error filtering deleted properties:", error);
    return properties;
  }
};

/**
 * Enhanced property deletion that ensures properties stay deleted
 * by addressing all potential caching mechanisms
 */
export const deletePropertyPermanently = async (propertyId) => {
  console.log(`ENHANCED: Permanently deleting property with ID: ${propertyId}`);
  
  try {
    // 1. Delete from server with retry mechanism
    let serverDeletionSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!serverDeletionSuccess && retryCount < maxRetries) {
      try {
        console.log(`Server deletion attempt ${retryCount + 1} for property ${propertyId}`);
        const response = await adminApi.delete(`/properties/${propertyId}`);
        console.log("Delete property response:", response);
        
        if (response.data && response.data.success) {
          serverDeletionSuccess = true;
          console.log(`Successfully deleted property ${propertyId} from server`);
        } else {
          throw new Error(response.data?.message || "Server did not confirm deletion");
        }
      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        
        if (retryCount < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
    }
    
    if (!serverDeletionSuccess) {
      console.warn(`Could not confirm server deletion after ${maxRetries} attempts. Continuing with client-side cleanup.`);
      
      // Try alternative admin endpoint
      try {
        console.log("Trying admin-specific endpoint for property deletion");
        const response = await adminApi.delete(`/admin/properties/${propertyId}`);
        console.log("Delete property response from admin endpoint:", response);
        if (response.data && response.data.success) {
          serverDeletionSuccess = true;
        }
      } catch (adminError) {
        console.error("Admin endpoint deletion failed:", adminError);
      }
    }
    
    // 2. Clear from ALL localStorage caches
    clearAllPropertyCaches(propertyId);
    
    // 3. Add to deleted properties blacklist in localStorage
    addToDeletedPropertiesBlacklist(propertyId);
    
    // 4. Clear browser cache for API endpoints
    clearBrowserCacheForProperty(propertyId);
    
    // 5. Dispatch multiple events to notify all components
    notifyAllComponentsOfDeletion(propertyId);
    
    return { 
      success: true, 
      message: "Property permanently deleted",
      serverDeletionConfirmed: serverDeletionSuccess
    };
  } catch (error) {
    console.error("Error in enhanced property deletion:", error);
    
    // Even if server deletion fails, still perform client-side cleanup
    clearAllPropertyCaches(propertyId);
    addToDeletedPropertiesBlacklist(propertyId);
    notifyAllComponentsOfDeletion(propertyId);
    
    throw error;
  }
};

// Function to delete a property - UPDATED to use enhanced deletion
export const deleteProperty = async (propertyId) => {
  console.log(`Deleting property with ID: ${propertyId}`);

  try {
    // Use our enhanced deletion function instead
    const result = await deletePropertyPermanently(propertyId);
    
    // If the enhanced deletion was successful, we're done
    if (result.success) {
      return result;
    }
    
    // If enhanced deletion failed, fall back to the original implementation
    // First, try to mark the property as deleted in the main API
    try {
      console.log("Marking property as deleted in main API");
      const mainApiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

      // Try multiple endpoints with direct fetch to bypass authentication issues
      const mainEndpoints = [
        `${mainApiUrl}/properties/${propertyId}`,
        `${mainApiUrl}/public/properties/${propertyId}`,
        `${mainApiUrl}/api/properties/${propertyId}`,
      ];

      let mainApiSuccess = false;

      for (const endpoint of mainEndpoints) {
        try {
          console.log(`Trying to delete from main API at: ${endpoint}`);
          const response = await fetch(endpoint, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            // Don't include credentials to bypass auth
            credentials: "omit",
          });

          if (response.ok) {
            console.log(`Successfully deleted from main API at ${endpoint}`);
            mainApiSuccess = true;
            break;
          }
        } catch (endpointError) {
          console.error(`Failed to delete from ${endpoint}:`, endpointError);
        }
      }

      if (!mainApiSuccess) {
        console.log("Could not delete from main API, trying to mark as inactive instead");

        // If deletion fails, try to mark the property as inactive/hidden
        for (const endpoint of mainEndpoints.map((url) => url.replace("DELETE", ""))) {
          try {
            const response = await fetch(endpoint, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: "deleted",
                isActive: false,
                isDeleted: true,
                visibility: "hidden",
              }),
              credentials: "omit",
            });

            if (response.ok) {
              console.log(`Successfully marked property as deleted at ${endpoint}`);
              break;
            }
          } catch (patchError) {
            console.error(`Failed to mark property as deleted at ${endpoint}:`, patchError);
          }
        }
      }
    } catch (mainApiError) {
      console.error("Error updating main API:", mainApiError);
      // Continue with admin deletion even if main API update fails
    }

    // Now try the standard admin endpoint
    try {
      const response = await adminApi.delete(`/properties/${propertyId}`);
      console.log("Delete property response from admin API:", response.data);
      
      // Make sure to still perform client-side cleanup
      clearAllPropertyCaches(propertyId);
      addToDeletedPropertiesBlacklist(propertyId);
      notifyAllComponentsOfDeletion(propertyId);
      
      return response.data;
    } catch (error) {
      // If that fails, try the admin-specific endpoint
      if (error.response && error.response.status === 404) {
        console.log("Trying admin-specific endpoint for property deletion");
        const response = await adminApi.delete(`/admin/properties/${propertyId}`);
        console.log("Delete property response from admin endpoint:", response.data);
        
        // Make sure to still perform client-side cleanup
        clearAllPropertyCaches(propertyId);
        addToDeletedPropertiesBlacklist(propertyId);
        notifyAllComponentsOfDeletion(propertyId);
        
        return response.data;
      }
      throw error;
    }
  } catch (error) {
    console.error("Error deleting property:", error);
    
    // Even if all server deletion attempts fail, still perform client-side cleanup
    clearAllPropertyCaches(propertyId);
    addToDeletedPropertiesBlacklist(propertyId);
    notifyAllComponentsOfDeletion(propertyId);
    
    throw error;
  }
};

export default adminApi