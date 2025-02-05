import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api"
import { addProperty, getFeaturedProperties } from "../services/api"
import "./AddProperty.css"

const mapContainerStyle = {
  width: "100%",
  height: "400px",
}

const center = {
  lat: 27.7172, // Kathmandu, Nepal
  lng: 85.324,
}

const validateFiles = (files, type) => {
  if (type === "images") {
    const validTypes = ["image/jpeg", "image/png", "image/gif"]
    const maxSize = 5 * 1024 * 1024 // 5MB per image

    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        throw new Error(`Invalid file type: ${file.name}. Only JPG, PNG, and GIF files are allowed.`)
      }
      if (file.size > maxSize) {
        throw new Error(`File too large: ${file.name}. Maximum size is 5MB.`)
      }
    }
  } else if (type === "video") {
    const validTypes = ["video/mp4", "video/webm", "video/ogg"]
    const maxSize = 50 * 1024 * 1024 // 50MB for video

    if (!validTypes.includes(files.type)) {
      throw new Error("Invalid video format. Only MP4, WebM, and OGG files are allowed.")
    }
    if (files.size > maxSize) {
      throw new Error("Video file too large. Maximum size is 50MB.")
    }
  }
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
  const [mapCenter, setMapCenter] = useState(center)
  const [isLoading, setIsLoading] = useState(false) // Added loading state
  const navigate = useNavigate()
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      setIsAuthenticated(false)
      navigate("/login")
      return
    }

    // Verify token validity
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      const isExpired = payload.exp * 1000 < Date.now()

      if (isExpired) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        setIsAuthenticated(false)
        navigate("/login")
      } else {
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error("Token validation error:", error)
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      setIsAuthenticated(false)
      navigate("/login")
    }
  }, [navigate])

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target
    try {
      if (type === "file") {
        if (name === "images") {
          validateFiles(files, "images")
          const imageFiles = Array.from(files).slice(0, 10)
          setFormData((prevState) => ({
            ...prevState,
            [name]: imageFiles,
          }))
        } else if (name === "video") {
          if (files[0]) {
            validateFiles(files[0], "video")
            setFormData((prevState) => ({
              ...prevState,
              [name]: files[0],
            }))
          }
        }
      } else {
        setFormData((prevState) => ({
          ...prevState,
          [name]: type === "checkbox" ? checked : value,
        }))
      }
    } catch (error) {
      alert(error.message)
      e.target.value = "" // Reset the file input
    }
  }

  const handleAmenityChange = (e) => {
    const { value, checked } = e.target
    setFormData((prevState) => ({
      ...prevState,
      amenities: checked ? [...prevState.amenities, value] : prevState.amenities.filter((amenity) => amenity !== value),
    }))
  }

  const handleMapClick = (e) => {
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    setFormData((prevState) => ({
      ...prevState,
      latitude: lat,
      longitude: lng,
    }))
    setMapCenter({ lat, lng })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      // Validate required fields
      const requiredFields = {
        title: "Title",
        description: "Description",
        price: "Price",
        location: "Location",
        bedrooms: "Number of bedrooms",
        bathrooms: "Number of bathrooms",
      }

      const missingFields = Object.entries(requiredFields)
        .filter(([key]) => !formData[key])
        .map(([_, label]) => label)

      if (missingFields.length > 0) {
        throw new Error(`Please fill in the following required fields: ${missingFields.join(", ")}`)
      }

      // Validate images
      if (!formData.images || formData.images.length === 0) {
        throw new Error("Please select at least one image")
      }

      const formDataToSend = new FormData()

      // Add all form fields to FormData
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "images") {
          value.forEach((image) => {
            formDataToSend.append("images", image)
          })
        } else if (key === "video" && value) {
          formDataToSend.append("video", value)
        } else if (key === "amenities") {
          formDataToSend.append(key, JSON.stringify(value))
        } else {
          formDataToSend.append(key, value)
        }
      })

      const response = await addProperty(formDataToSend)
      console.log("Property added successfully:", response.data)
      alert("Property added successfully!")
      navigate("/")
    } catch (error) {
      console.error("Error adding property:", error)
      alert(error.message || "Failed to add property. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const refreshFeaturedListings = async () => {
    try {
      await getFeaturedProperties()
      console.log("Featured listings refreshed")
    } catch (error) {
      console.error("Error refreshing featured listings:", error)
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
              <label htmlFor="price">Price (per month)</label>
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
              {isLoaded ? (
                <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={10} onClick={handleMapClick}>
                  <Marker position={mapCenter} />
                </GoogleMap>
              ) : loadError ? (
                <div>Error loading maps</div>
              ) : (
                <div>Loading maps</div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="latitude">Latitude</label>
              <input
                type="number"
                id="latitude"
                name="latitude"
                value={formData.latitude}
                onChange={handleInputChange}
                required
                step="any"
              />
            </div>
            <div className="form-group">
              <label htmlFor="longitude">Longitude</label>
              <input
                type="number"
                id="longitude"
                name="longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                required
                step="any"
              />
            </div>
            <div className="form-group">
              <label htmlFor="bedrooms">Bedrooms</label>
              <input
                type="number"
                id="bedrooms"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleInputChange}
                required
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
                required
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
                {["AC", "WiFi", "Parking", "Water", "TV", "Washing Machine", "Refrigerator", "Microwave"].map(
                  (amenity) => (
                    <div key={amenity} className="amenity-item">
                      <input
                        type="checkbox"
                        id={amenity.toLowerCase()}
                        name="amenities"
                        value={amenity.toLowerCase()}
                        checked={formData.amenities.includes(amenity.toLowerCase())}
                        onChange={handleAmenityChange}
                      />
                      <label htmlFor={amenity.toLowerCase()}>{amenity}</label>
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="images">Upload Images (Max 10)</label>
              <input type="file" id="images" name="images" accept="image/*" multiple onChange={handleInputChange} />
              {formData.images.length > 0 && <p>{formData.images.length} image(s) selected</p>}
              {formData.images.map((file, index) => (
                <div key={index}>
                  <img
                    src={URL.createObjectURL(file) || "/placeholder.svg"}
                    alt={`Uploaded ${index + 1}`}
                    style={{ width: "100px", height: "100px" }}
                  />
                </div>
              ))}
              {formData.images.length >= 10 && <p className="text-warning">Maximum number of images reached (10)</p>}
            </div>
            <div className="form-group">
              <label htmlFor="video">Upload Video</label>
              <input type="file" id="video" name="video" accept="video/*" onChange={handleInputChange} />
              {formData.video && (
                <div>
                  <video src={URL.createObjectURL(formData.video)} style={{ width: "200px" }} controls />
                </div>
              )}
            </div>
            <div className="button-group">
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Property"} {/* Add loading indicator */}
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

