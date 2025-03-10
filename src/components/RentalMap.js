"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
})

function RentalMap() {
  const [properties, setProperties] = useState([])
  const [mapCenter, setMapCenter] = useState([27.7172, 85.324]) // Default to Kathmandu

  useEffect(() => {
    // Fetch properties from local storage
    const storedProperties = JSON.parse(localStorage.getItem("properties") || "[]")
    console.log("Retrieved properties from localStorage:", storedProperties)

    // Filter out properties with invalid coordinates
    const validProperties = storedProperties.filter((property) => {
      const lat = Number(property.latitude)
      const lng = Number(property.longitude)
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
    })

    console.log("Valid properties:", validProperties)
    setProperties(validProperties)

    // If there are valid properties, center the map on the first one
    if (validProperties.length > 0) {
      const firstValidProperty = validProperties[0]
      setMapCenter([Number(firstValidProperty.latitude), Number(firstValidProperty.longitude)])
    }
  }, [])

  if (properties.length === 0) {
    return <div className="rental-map">No valid properties to display on the map.</div>
  }

  return (
    <div className="rental-map">
      <MapContainer center={mapCenter} zoom={13} style={{ height: "500px", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {properties.map((property) => {
          const lat = Number(property.latitude)
          const lng = Number(property.longitude)

          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            console.warn(
              `Invalid coordinates for property ${property.id}: (${property.latitude}, ${property.longitude})`,
            )
            return null
          }

          return (
            <Marker key={property.id} position={[lat, lng]}>
              <Popup>
                <div>
                  <h3>{property.title}</h3>
                  <p>{property.description}</p>
                  <p>Price: Rs {property.price}</p>
                  <p>Location: {property.location}</p>
                  <p>Bedrooms: {property.bedrooms}</p>
                  <p>Bathrooms: {property.bathrooms}</p>
                  <p>Furnished: {property.furnished ? "Yes" : "No"}</p>
                  <p>Amenities: {property.amenities.join(", ")}</p>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default RentalMap
