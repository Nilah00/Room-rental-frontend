"use client"

import { useState, useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { RefreshCw, AlertCircle } from "lucide-react"

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
})

// Custom marker icon for properties
const propertyIcon = new L.Icon({
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function RentalMap() {
  const [properties, setProperties] = useState([])
  const [mapCenter, setMapCenter] = useState([27.7172, 85.324]) // Default to Kathmandu
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")
  const [isLandlord, setIsLandlord] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const mapRef = useRef(null)

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

  // Function to validate coordinates
  const validateCoordinates = (lat, lng) => {
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
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

  // Function to fetch properties from localStorage with deletion check
  const fetchPropertiesFromLocalStorage = () => {
    try {
      // Clear any previous error messages
      setErrorMessage("")

      // Fetch properties from local storage
      const storedPropertiesJson = localStorage.getItem("properties")
      if (!storedPropertiesJson) {
        console.log("No properties found in localStorage")
        setProperties([])
        return
      }

      const storedProperties = JSON.parse(storedPropertiesJson)
      console.log("Retrieved properties from localStorage:", storedProperties)

      if (!Array.isArray(storedProperties)) {
        console.error("Properties in localStorage is not an array:", storedProperties)
        setErrorMessage("Properties data is invalid. Please contact an administrator.")
        setProperties([])
        return
      }

      // Filter out properties with invalid coordinates
      const validProperties = storedProperties.filter((property) => {
        // Check coordinates
        const lat = Number(property.latitude)
        const lng = Number(property.longitude)
        const hasValidCoords = validateCoordinates(lat, lng)

        if (!hasValidCoords) {
          console.log(`Filtering out property with invalid coordinates: ${property._id || property.id}`)
        }

        return hasValidCoords
      })

      console.log("Valid properties for map:", validProperties)
      console.log("Number of valid properties:", validProperties.length)

      // Ensure each property has a unique ID for React keys
      const propertiesWithUniqueKeys = validProperties.map((property, index) => {
        if (!property._id && !property.id) {
          return { ...property, id: `temp-id-${index}` }
        }
        return property
      })

      // Set properties state
      setProperties(propertiesWithUniqueKeys)

      // If there are valid properties, center the map on the first one
      if (validProperties.length > 0) {
        setMapCenter([Number(validProperties[0].latitude), Number(validProperties[0].longitude)])
      }
    } catch (error) {
      console.error("Error fetching properties from localStorage:", error)
      setErrorMessage("Error loading properties: " + error.message)
    }
  }

  // Fetch properties on initial load and when refreshTrigger changes
  useEffect(() => {
    fetchPropertiesFromLocalStorage()
  }, [refreshTrigger])

  // Add this useEffect to listen for property deletion events
  useEffect(() => {
    // Listen for property deletion events
    const handlePropertyDeleted = (event) => {
      const { propertyId } = event.detail
      console.log(`Property deleted event received for property ${propertyId}`)

      // Update the properties state to remove the deleted property
      setProperties((prevProperties) =>
        prevProperties.filter((property) => (property._id || property.id) !== propertyId),
      )
    }

    // Add event listener
    window.addEventListener("propertyDeleted", handlePropertyDeleted)

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener("propertyDeleted", handlePropertyDeleted)
    }
  }, [])

  // Add this useEffect to listen for storage events and localStorage changes

  // Add this after the other useEffect hooks
  useEffect(() => {
    // Function to handle storage events (when localStorage changes)
    const handleStorageChange = () => {
      console.log("Storage change detected, refreshing map properties")
      fetchPropertiesFromLocalStorage()
    }

    // Listen for storage events (triggered when localStorage changes in other tabs)
    window.addEventListener("storage", handleStorageChange)

    // Also listen for our custom storage event (for same-tab updates)
    window.addEventListener("localStorageUpdated", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("localStorageUpdated", handleStorageChange)
    }
  }, [])

  // Manual refresh function
  const handleRefresh = () => {
    console.log("Manual refresh triggered")
    setRefreshTrigger((prev) => prev + 1)
  }

  // Function to completely reset the properties in localStorage - ADMIN ONLY
  const resetProperties = () => {
    if (!isAdmin) {
      setErrorMessage("Only administrators can reset all properties.")
      return
    }

    if (window.confirm("This will remove ALL properties from the map. Are you sure?")) {
      localStorage.removeItem("properties")
      console.log("All properties have been removed from localStorage")
      setProperties([])
      setErrorMessage("All properties have been removed. The map is now empty.")
    }
  }

  // Function to manually delete a property from the map and localStorage
  // const deleteProperty = (propertyId) => {
  //   try {
  //     // Find the property
  //     const property = properties.find((p) => (p._id || p.id) === propertyId)

  //     // Check if user is authorized to delete this property
  //     if (!isAdmin && !isLandlord) {
  //       setErrorMessage("You don't have permission to delete properties.")
  //       return
  //     }

  //     // If user is a landlord but not admin, check if they own the property
  //     if (isLandlord && !isAdmin && !userOwnsProperty(property)) {
  //       setErrorMessage("You can only delete your own properties.")
  //       return
  //     }

  //     // Remove from state
  //     setProperties((prevProperties) =>
  //       prevProperties.filter((property) => (property._id || property.id) !== propertyId),
  //     )

  //     // Remove from localStorage
  //     const storedPropertiesJson = localStorage.getItem("properties")
  //     if (storedPropertiesJson) {
  //       const storedProperties = JSON.parse(storedPropertiesJson)
  //       const updatedProperties = storedProperties.filter((property) => (property._id || property.id) !== propertyId)
  //       localStorage.setItem("properties", JSON.stringify(updatedProperties))
  //       console.log(`Manually removed property ${propertyId} from localStorage`)
  //     }

  //     // Dispatch event for other components
  //     window.dispatchEvent(
  //       new CustomEvent("propertyDeleted", {
  //         detail: { propertyId },
  //       }),
  //     )
  //   } catch (error) {
  //     console.error("Error deleting property:", error)
  //     setErrorMessage("Error deleting property: " + error.message)
  //   }
  // }

  if (properties.length === 0) {
    return (
      <div className="rental-map">
        <div className="map-controls">
          <div>
            <button onClick={handleRefresh} className="refresh-map-btn">
              <RefreshCw size={16} /> Refresh Map
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="error-message">
            <AlertCircle size={16} /> {errorMessage}
          </div>
        )}

        <div className="no-properties-message">No valid properties to display on the map.</div>
      </div>
    )
  }

  return (
    <div className="rental-map">
      <div className="map-controls">
        <div>
          <button onClick={handleRefresh} className="refresh-map-btn">
            <RefreshCw size={16} /> Refresh Map
          </button>
        </div>
        <span className="property-count">{properties.length} properties shown on map</span>
      </div>

      {errorMessage && (
        <div className="error-message">
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}

      <div className="map-container" style={{ height: "500px", width: "100%" }}>
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
          key={`map-container-${refreshTrigger}`}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {console.log(
            "Rendering markers for properties:",
            properties.map((p) => ({
              id: p._id || p.id,
              title: p.title,
              coordinates: [p.latitude, p.longitude],
            })),
          )}

          {properties.map((property, index) => {
            const propertyId = property._id || property.id || `property-${index}`
            const lat = Number(property.latitude)
            const lng = Number(property.longitude)
            const canManageProperty = isAdmin || userOwnsProperty(property)

            // Skip invalid coordinates
            if (!validateCoordinates(lat, lng)) {
              console.warn(`Invalid coordinates for property ${propertyId}: [${lat}, ${lng}]`)
              return null
            }

            // Check for overlapping markers and add tiny offset if needed
            const offset = 0.0001 // ~11 meters at the equator
            const overlappingMarker = properties.findIndex(
              (p, i) => i < index && Math.abs(p.latitude - lat) < offset && Math.abs(p.longitude - lng) < offset,
            )

            const adjustedLat = overlappingMarker >= 0 ? lat + offset : lat
            const adjustedLng = overlappingMarker >= 0 ? lng + offset : lng

            console.log(
              `Rendering marker ${index + 1} for property ${propertyId} at [${adjustedLat}, ${adjustedLng}]${overlappingMarker >= 0 ? " (offset applied)" : ""}`,
            )

            return (
              <Marker
                key={`marker-${propertyId}-${index}-${Date.now()}`}
                position={[adjustedLat, adjustedLng]}
                icon={propertyIcon}
              >
                <Popup>
                  <div className="map-popup">
                    <h3>{property.title || "Unnamed Property"}</h3>
                    {property.description && <p>{property.description}</p>}
                    <p className="popup-price">Price: Rs {property.price?.toLocaleString() || "N/A"}</p>
                    <p>Location: {property.location || "Unknown location"}</p>
                    <div className="popup-details">
                      <span>Bedrooms: {property.bedrooms || "N/A"}</span>
                      <span>Bathrooms: {property.bathrooms || "N/A"}</span>
                    </div>
                    <p>Furnished: {property.furnished ? "Yes" : "No"}</p>
                    {property.amenities && Array.isArray(property.amenities) && property.amenities.length > 0 && (
                      <p className="popup-amenities">Amenities: {property.amenities.join(", ")}</p>
                    )}
                    
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      <style jsx>{`
        .map-controls {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        
        .refresh-map-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background-color: #4a90e2;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          margin: 5px;
        }
        
        .refresh-map-btn:hover {
          background-color: #3a7bc8;
        }
        
        .property-count {
          display: flex;
          align-items: center;
          font-size: 14px;
          color: #555;
          margin: 5px;
        }
        
        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          margin-bottom: 10px;
        }
        
        .no-properties-message {
          padding: 20px;
          text-align: center;
          background-color: #f8f9fa;
          border-radius: 4px;
          margin-bottom: 15px;
        }
        
        .map-popup {
          max-width: 250px;
        }
        
        .popup-price {
          font-weight: bold;
          color: #4a90e2;
        }
        
        .popup-details {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
        }
        
        .popup-amenities {
          font-size: 12px;
          color: #666;
        }
        
        .popup-actions {
          display: flex;
          justify-content: center;
          margin-top: 10px;
        }
        
        .map-popup-link {
          display: inline-block;
          padding: 5px 10px;
          background-color: #4a90e2;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .map-popup-link:hover {
          background-color: #3a7bc8;
        }
        
        .delete-popup-btn {
          padding: 5px 10px;
          background-color: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .delete-popup-btn:hover {
          background-color: #c82333;
        }
      `}</style>
    </div>
  )
}

export default RentalMap

