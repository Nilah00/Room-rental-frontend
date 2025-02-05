import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getPropertyById, updateProperty } from "../services/api"
import { getImageUrl } from "./imageUtils"
import "./AddProperty.css" 

export default function EditProperty() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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

  useEffect(() => {
    fetchPropertyDetails()
  }, []) // Removed unnecessary dependency 'id'

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true)
      const property = await getPropertyById(id)

      setFormData({
        title: property.title,
        description: property.description,
        price: property.price,
        location: property.location,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        furnished: property.furnished,
        amenities: property.amenities || [],
        images: property.images || [],
        video: property.video || null,
      })
    } catch (err) {
      console.error("Error fetching property details:", err)
      setError("Failed to load property details")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target
    if (type === "file") {
      if (name === "images") {
        const imageFiles = Array.from(files).slice(0, 10)
        setFormData((prev) => ({
          ...prev,
          [name]: imageFiles,
        }))
      } else if (name === "video") {
        setFormData((prev) => ({
          ...prev,
          [name]: files[0],
        }))
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const formDataToSend = new FormData()

      // Append all form fields to FormData
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "images") {
          // Handle existing images (as strings) and new images (as Files)
          value.forEach((image) => {
            if (image instanceof File) {
              formDataToSend.append("images", image)
            } else {
              formDataToSend.append("existingImages", image)
            }
          })
        } else if (key === "video") {
          if (value instanceof File) {
            formDataToSend.append("video", value)
          } else if (value) {
            formDataToSend.append("existingVideo", value)
          }
        } else if (key === "amenities") {
          formDataToSend.append(key, JSON.stringify(value))
        } else {
          formDataToSend.append(key, value)
        }
      })

      await updateProperty(id, formDataToSend)
      alert("Property updated successfully!")
      navigate("/manage-properties")
    } catch (err) {
      console.error("Error updating property:", err)
      alert("Failed to update property. Please try again.")
    }
  }

  if (loading) {
    return <div className="loading">Loading property details...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div className="add-property-page">
      <header className="add-property-header">
        <h1>Edit Property</h1>
        <button onClick={() => navigate("/manage-properties")} className="btn btn-secondary">
          Back to Properties
        </button>
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
              <label htmlFor="furnished">
                <input
                  type="checkbox"
                  id="furnished"
                  name="furnished"
                  checked={formData.furnished}
                  onChange={handleInputChange}
                />
                Furnished
              </label>
            </div>

            <div className="form-group">
              <label>Current Images</label>
              <div className="current-images">
                {formData.images.map((image, index) => (
                  <div key={index} className="image-preview">
                    <img
                      src={typeof image === "string" ? getImageUrl(image) : URL.createObjectURL(image)}
                      alt={`Property ${index + 1}`}
                      style={{ width: "100px", height: "100px", objectFit: "cover" }}
                    />
                  </div>
                ))}
              </div>
              <label htmlFor="images">Upload New Images (Max 10)</label>
              <input type="file" id="images" name="images" accept="image/*" multiple onChange={handleInputChange} />
            </div>

            <div className="form-group">
              <label>Current Video</label>
              {formData.video && (
                <video
                  src={
                    typeof formData.video === "string"
                      ? getImageUrl(formData.video)
                      : URL.createObjectURL(formData.video)
                  }
                  style={{ width: "200px" }}
                  controls
                />
              )}
              <label htmlFor="video">Upload New Video</label>
              <input type="file" id="video" name="video" accept="video/*" onChange={handleInputChange} />
            </div>

            <div className="button-group">
              <button type="submit" className="btn btn-primary">
                Update Property
              </button>
              <button type="button" onClick={() => navigate("/manage-properties")} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

