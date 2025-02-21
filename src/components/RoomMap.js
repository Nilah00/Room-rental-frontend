import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

const customIconUrl = "https://cdn-icons-png.flaticon.com/512/1297/1297898.png"
const customIcon = L.icon({
  iconUrl: customIconUrl,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
})

const RoomMap = ({ latitude, longitude, title, location }) => {
  console.log("RoomMap props:", { latitude, longitude, title, location })

  const parsedLat = Number.parseFloat(latitude)
  const parsedLng = Number.parseFloat(longitude)

  console.log("Parsed coordinates:", { parsedLat, parsedLng })

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    console.error("Invalid latitude or longitude:", { latitude, longitude })
    return (
      <div className="map-error">
        <p>Error: Invalid coordinates provided.</p>
        <p>Debug info:</p>
        <p>Latitude: {latitude}</p>
        <p>Longitude: {longitude}</p>
      </div>
    )
  }

  const mapCoordinates = [parsedLat, parsedLng]

  return (
    <div className="room-map">
      <h3>Location</h3>
      <MapContainer center={mapCoordinates} zoom={13} style={{ height: "300px", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={mapCoordinates} icon={customIcon}>
          <Popup>
            <strong>{title}</strong>
            <br />
            {location}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

export default RoomMap

