"use client"

import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet"
import { addProperty } from "../services/api"
import "./AddProperty.css"

// Make sure to import Leaflet CSS in your main CSS file or index.js
// import 'leaflet/dist/leaflet.css';

const center = {
  lat: 27.7172, // Kathmandu, Nepal
  lng: 85.324,
}

const validateFiles = (files, type) => {
  const validFiles = []
  const errors = []
  const maxSize = type === "image" ? 5 * 1024 * 1024 : 50 * 1024 * 1024 // 5MB for images, 50MB for video
  const allowedTypes =
    type === "image" ? ["image/jpeg", "image/png", "image/gif"] : ["video/mp4", "video/webm", "video/ogg"]

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File ${file.name} is not a valid ${type} type.`)
    } else if (file.size > maxSize) {
      errors.push(`File ${file.name} exceeds the maximum size of ${maxSize / (1024 * 1024)}MB.`)
    } else {
      validFiles.push(file)
    }
  }

  return { validFiles, errors }
}

function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng)
      map.flyTo(e.latlng, map.getZoom())
    },
  })

  return position ? <Marker position={position} /> : null
}

function AddProperty() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    location: "",
    latitude: center.lat,
    longitude: center.lng,
    bedrooms: "",
    bathrooms: "",
    furnished: false,
    amenities: [],
    images: [],
    video: null,
  })
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mapPosition, setMapPosition] = useState(center)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      setIsAuthenticated(false)
      navigate("/login")
    } else {
      setIsAuthenticated(true)
    }
  }, [navigate])

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target
    try {
      if (type === "file") {
        const fileType = name === "images" ? "image" : "video"
        const { validFiles, errors } = validateFiles(files, fileType)

        if (errors.length > 0) {
          alert(errors.join("\n"))
        }

        if (name === "images") {
          setFormData((prevState) => ({
            ...prevState,
            images: [...prevState.images, ...validFiles],
          }))
        } else if (name === "video") {
          setFormData((prevState) => ({
            ...prevState,
            video: validFiles.length > 0 ? validFiles[0] : null,
          }))
        }
      } else {
        setFormData((prevState) => ({
          ...prevState,
          [name]: type === "checkbox" ? checked : value,
        }))
      }
    } catch (error) {
      console.error("Error in handleInputChange:", error)
      alert(error.message)
      e.target.value = "" // Reset the file input
    }
  }

  const handleAmenityChange = (e) => {
    const { value, checked } = e.target
    setFormData((prevState) => {
      let updatedAmenities = [...prevState.amenities]
      if (checked) {
        updatedAmenities.push(value)
      } else {
        updatedAmenities = updatedAmenities.filter((amenity) => amenity !== value)
      }
      return { ...prevState, amenities: updatedAmenities }
    })
  }

  const validateAmenities = (amenities) => {
    if (amenities.length === 0) {
      return "Please select at least one amenity"
    }
    return null
  }

  // Update the handleSubmit function to better handle validation errors
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      // Basic client-side validation
      const requiredFields = {
        title: "Title",
        description: "Description",
        price: "Price",
        location: "Location",
        bedrooms: "Number of bedrooms",
        bathrooms: "Number of bathrooms",
      }

      const errors = {}
      Object.entries(requiredFields).forEach(([field, label]) => {
        if (!formData[field]) {
          errors[field] = `${label} is required`
        }
      })

      if ((formData.price && isNaN(formData.price)) || formData.price <= 0) {
        errors.price = "Price must be a valid positive number"
      }

      const amenitiesError = validateAmenities(formData.amenities)
      if (amenitiesError) {
        errors.amenities = amenitiesError
      }

      if (Object.keys(errors).length > 0) {
        const errorMessage = Object.entries(errors)
          .map(([field, message]) => `${message}`)
          .join("\n")
        throw new Error(errorMessage)
      }

      const formDataToSend = new FormData()

      // Add all form fields to FormData with proper type conversion
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "images") {
          value.forEach((image, index) => {
            formDataToSend.append(`images`, image)
          })
        } else if (key === "video" && value) {
          formDataToSend.append("video", value)
        } else if (key === "amenities") {
          formDataToSend.append(key, JSON.stringify(value))
        } else if (key === "price") {
          formDataToSend.append(key, Number.parseFloat(value).toString())
        } else if (key === "bedrooms" || key === "bathrooms") {
          formDataToSend.append(key, Number.parseInt(value, 10).toString())
        } else if (typeof value === "boolean") {
          formDataToSend.append(key, value.toString())
        } else if (value !== null && value !== undefined) {
          formDataToSend.append(key, value.toString())
        }
      })

      // Add map coordinates
      formDataToSend.append("latitude", mapPosition.lat.toString())
      formDataToSend.append("longitude", mapPosition.lng.toString())

      // Log the data being sent
      console.log("Submitting property data:")
      for (const [key, value] of formDataToSend.entries()) {
        console.log(`${key}:`, value)
      }

      const response = await addProperty(formDataToSend)
      console.log("Property added successfully:", response)

      // Create a new property object with the server response
      const newProperty = {
        id: response.id || Date.now(),
        ...formData,
        latitude: mapPosition.lat,
        longitude: mapPosition.lng,
      }

      // Update localStorage
      const existingProperties = JSON.parse(localStorage.getItem("properties") || "[]")
      const updatedProperties = [...existingProperties, newProperty]
      localStorage.setItem("properties", JSON.stringify(updatedProperties))

      alert("Property added successfully!")
      navigate("/")
    } catch (error) {
      console.error("Error adding property:", error)
      let errorMessage = "Failed to add property. "

      if (error.response) {
        if (error.response.status === 400) {
          // Handle validation errors from server
          const validationErrors = error.response.data.errors
          if (validationErrors) {
            errorMessage +=
              "\n\nValidation errors:\n" +
              Object.entries(validationErrors)
                .map(([field, message]) => `${field}: ${message}`)
                .join("\n")
          } else {
            errorMessage += error.response.data.message || "Please check your input."
          }
        } else {
          errorMessage += `Server error (${error.response.status})`
        }
      } else if (error.request) {
        errorMessage += "No response from server. Please check your connection."
      } else {
        errorMessage += error.message || "An unexpected error occurred"
      }

      alert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="add-property-page">
      <header className="header">
        <h1>Add Your Property</h1>
        <Link to="/" className="btn btn-secondary">
          Back to Home
        </Link>
      </header>

      <main className="add-property-content">
        <div className="container">
          <form onSubmit={handleSubmit} className="add-property-form">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input type="text" id="title" name="title" value={formData.title} onChange={handleInputChange} required />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">Price (Rs)</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Select Location on Map</label>
              <MapContainer center={center} zoom={13} style={{ height: "400px", width: "100%" }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationMarker position={mapPosition} setPosition={setMapPosition} />
              </MapContainer>
            </div>
            <div className="form-group">
              <label htmlFor="latitude">Latitude</label>
              <input type="number" id="latitude" name="latitude" value={mapPosition.lat} readOnly step="any" />
            </div>
            <div className="form-group">
              <label htmlFor="longitude">Longitude</label>
              <input type="number" id="longitude" name="longitude" value={mapPosition.lng} readOnly step="any" />
            </div>

            <div className="form-group">
              <label htmlFor="bedrooms">Bedrooms</label>
              <input
                type="number"
                id="bedrooms"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="bathrooms">Bathrooms</label>
              <input
                type="number"
                id="bathrooms"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="furnished">Furnished</label>
              <input
                type="checkbox"
                id="furnished"
                name="furnished"
                checked={formData.furnished}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Amenities</label>
              <div className="amenities-group">
                <label>
                  <input
                    type="checkbox"
                    value="wifi"
                    checked={formData.amenities.includes("wifi")}
                    onChange={handleAmenityChange}
                  />
                  WiFi
                </label>
                <label>
                  <input
                    type="checkbox"
                    value="parking"
                    checked={formData.amenities.includes("parking")}
                    onChange={handleAmenityChange}
                  />
                  Parking
                </label>
                <label>
                  <input
                    type="checkbox"
                    value="water"
                    checked={formData.amenities.includes("water")}
                    onChange={handleAmenityChange}
                  />
                  Water
                </label>
                <label>
                  <input
                    type="checkbox"
                    value="ac"
                    checked={formData.amenities.includes("ac")}
                    onChange={handleAmenityChange}
                  />
                  AC
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="images">Images</label>
              <input type="file" id="images" name="images" multiple onChange={handleInputChange} accept="image/*" />
              <div className="image-preview">
                {formData.images.map((image, index) => (
                  <img
                    key={index}
                    src={URL.createObjectURL(image) || "/placeholder.svg"}
                    alt={`Preview ${index}`}
                    style={{ maxWidth: "100px", marginRight: "10px" }}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="video">Video</label>
              <input type="file" id="video" name="video" onChange={handleInputChange} accept="video/*" />
              {formData.video && (
                <video src={URL.createObjectURL(formData.video)} controls style={{ maxWidth: "200px" }} />
              )}
            </div>

            <div className="button-group">
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Property"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="footer">
        <p>&copy; 2024 RoomRental. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default AddProperty

