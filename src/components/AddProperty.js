import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { addProperty } from "../services/api"
import "./AddProperty.css"

function AddProperty() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    location: "",
    bedrooms: "",
    bathrooms: "",
    furnished: false,
    amenities: [],
    images: [],
    video: null,
  })
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const navigate = useNavigate()

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
    if (type === "file") {
      setFormData((prevState) => ({
        ...prevState,
        [name]: name === "images" ? Array.from(files) : files[0],
      }))
    } else {
      setFormData((prevState) => ({
        ...prevState,
        [name]: type === "checkbox" ? checked : value,
      }))
    }
  }

  const handleAmenityChange = (e) => {
    const { value, checked } = e.target
    setFormData((prevState) => ({
      ...prevState,
      amenities: checked ? [...prevState.amenities, value] : prevState.amenities.filter((amenity) => amenity !== value),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const formDataToSend = new FormData()
      for (const key in formData) {
        if (key === "images") {
          formData[key].forEach((image, index) => {
            formDataToSend.append(`images`, image)
          })
        } else if (key === "video") {
          if (formData[key]) {
            formDataToSend.append("video", formData[key])
          }
        } else if (key === "amenities") {
          formDataToSend.append(key, JSON.stringify(formData[key]))
        } else if (key === "price" || key === "bedrooms" || key === "bathrooms") {
          formDataToSend.append(key, Number(formData[key]))
        } else {
          formDataToSend.append(key, formData[key])
        }
      }

      console.log("Sending data:", Object.fromEntries(formDataToSend))
      const response = await addProperty(formDataToSend)
      console.log("Property added:", response.data)

      // Show success message with the first image path
      const firstImagePath = response.data.images[0]
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"
      const fullImageUrl = `${API_URL}/${firstImagePath}`

      alert(`Property added successfully!\nImage path: ${fullImageUrl}`)
      navigate("/rooms")
    } catch (error) {
      console.error("Error details:", error)
      if (error.response) {
        console.error("Response data:", error.response.data)
        console.error("Response status:", error.response.status)
        console.error("Response headers:", error.response.headers)
      } else if (error.request) {
        console.error("No response received:", error.request)
      } else {
        console.error("Error message:", error.message)
      }
      console.error("Error config:", error.config)

      if (error.response?.status === 403 || error.response?.data?.message?.includes("token")) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        alert("Session expired. Please login again.")
        navigate("/login")
      } else {
        alert(`Failed to add property. ${error.response?.data?.message || error.message}`)
      }
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="add-property-page">
      <header className="header">
        <h1>Add Your Property</h1>
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
              <label htmlFor="images">Upload Images</label>
              <input type="file" id="images" name="images" accept="image/*" multiple onChange={handleInputChange} />
              {formData.images.map((file, index) => (
                <div key={index}>
                  <img
                    src={URL.createObjectURL(file) || "/placeholder.svg"}
                    alt={`Uploaded ${index + 1}`}
                    style={{ width: "100px", height: "100px" }}
                  />
                </div>
              ))}
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
              <button type="submit" className="btn btn-primary">
                Add Property
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

