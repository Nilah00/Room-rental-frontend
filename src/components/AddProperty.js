import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './AddProperty.css';

function AddProperty() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    bedrooms: '',
    bathrooms: '',
    furnished: false,
    amenities: [],
    images: [],
    video: null
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAmenityChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      amenities: checked
        ? [...prevState.amenities, value]
        : prevState.amenities.filter(amenity => amenity !== value)
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prevState => ({
      ...prevState,
      images: [...prevState.images, ...files]
    }));
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    setFormData(prevState => ({
      ...prevState,
      video: file
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    //send the data to  backend
    alert('Property added successfully!');
  };

  return (
    <div className="add-property-page">
      <header className="header">
        <div className="container">
          <Link to="/" className="logo">
            <span className="home-icon">🏠</span>
            <span className="logo-text">RoomRental</span>
          </Link>
          <nav>
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/services" className="nav-link">Services</Link>
            <Link to="/about" className="nav-link">About Us</Link>
            <Link to="/add-property" className="nav-link">Add Property</Link>
          </nav>
        </div>
      </header>

      <main className="add-property-content">
        <div className="container">
          <h1>Add Your Room</h1>
          <form onSubmit={handleSubmit} className="add-property-form">
            <div className="form-group">
              <label htmlFor="title">Room Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
              ></textarea>
            </div>
            <div className="form-group">
              <label htmlFor="price">Price (Rs. per month)</label>
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
              <label htmlFor="bedrooms">Number of Bedrooms</label>
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
              <label htmlFor="bathrooms">Number of Bathrooms</label>
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
              <label>
                <input
                  type="checkbox"
                  name="furnished"
                  checked={formData.furnished}
                  onChange={handleInputChange}
                />
                Furnished
              </label>
            </div>
            <div className="form-group">
              <label>Amenities</label>
              <div className="amenities-group">
                <label>
                  <input
                    type="checkbox"
                    name="amenities"
                    value="wifi"
                    checked={formData.amenities.includes('wifi')}
                    onChange={handleAmenityChange}
                  />
                  Wi-Fi
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="amenities"
                    value="parking"
                    checked={formData.amenities.includes('parking')}
                    onChange={handleAmenityChange}
                  />
                  Parking
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="amenities"
                    value="ac"
                    checked={formData.amenities.includes('ac')}
                    onChange={handleAmenityChange}
                  />
                  Air Conditioning
                </label>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="images">Upload Images</label>
              <input
                type="file"
                id="images"
                name="images"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
            </div>
            <div className="form-group">
              <label htmlFor="video">Upload Video</label>
              <input
                type="file"
                id="video"
                name="video"
                accept="video/*"
                onChange={handleVideoUpload}
              />
            </div>
            <div className="button-group">
              <button type="submit" className="btn btn-primary">Add Property</button>
            </div>
          </form>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>RoomRental</h3>
              <p>Connecting rooms and people seamlessly across Nepal.</p>
            </div>
            <div className="footer-section">
              <h3>Quick Links</h3>
              <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/services">Services</Link></li>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/add-property">List Your Property</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Legal</h3>
              <ul>
                <li><Link to="/terms">Terms of Service</Link></li>
                <li><Link to="/privacy">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 RoomRental. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AddProperty;

