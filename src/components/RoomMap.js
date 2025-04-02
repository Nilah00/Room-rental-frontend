"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MapPin } from "lucide-react"
import "./RoomMap.css"

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
})

// Custom marker icon for the property
const propertyIcon = new L.Icon({
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const PropertyLocationMap = ({ property }) => {
  const [mapCenter, setMapCenter] = useState([27.7172, 85.324]) // Default to Kathmandu
  const [hasValidCoordinates, setHasValidCoordinates] = useState(false)

  // Function to validate coordinates
  const validateCoordinates = (lat, lng) => {
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  }

  useEffect(() => {
    if (property) {
      const lat = Number(property.latitude)
      const lng = Number(property.longitude)

      if (validateCoordinates(lat, lng)) {
        setMapCenter([lat, lng])
        setHasValidCoordinates(true)
      } else {
        console.warn(`Invalid coordinates for property: [${lat}, ${lng}]`)
        setHasValidCoordinates(false)
      }
    }
  }, [property])

  if (!hasValidCoordinates) {
    return (
      <div className="property-location-map-container no-map">
        <div className="no-location-message">
          <MapPin size={24} />
          <p>Location map not available for this property</p>
        </div>
      </div>
    )
  }

  return (
    <div className="property-location-map-container">
      <h3 className="map-title">Property Location</h3>
      <div className="property-map">
        <MapContainer center={mapCenter} zoom={15} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={mapCenter} icon={propertyIcon}>
            <Popup>
              <div className="map-popup">
                <h3>{property.title || "Property Location"}</h3>
                <p>{property.location || "Location details not available"}</p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  )
}

export default PropertyLocationMap

