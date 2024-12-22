import React from 'react';
import { Link } from 'react-router-dom';
import './Services.css';

function Services() {
  return (
    <div className="services-page">
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

      <main className="services-content">
        <div className="container">
          <h1>Our Services</h1>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">🔍</div>
              <h2>Room Search</h2>
              <p>Find your perfect room with our advanced search filters. Browse through a wide range of options tailored to your preferences.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">📝</div>
              <h2>Property Listing</h2>
              <p>List your property easily and reach thousands of potential tenants. Our platform ensures maximum visibility for your listings.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">💬</div>
              <h2>Tenant-Landlord Communication</h2>
              <p>Facilitate smooth communication between tenants and landlords through our integrated messaging system.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">📊</div>
              <h2>Market Insights</h2>
              <p>Access valuable insights about the rental market in Nepal, including pricing trends and popular locations.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">📅</div>
              <h2>Booking Management</h2>
              <p>Manage your bookings and appointments efficiently with our integrated calendar and notification system.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">💳</div>
              <h2>Secure Transactions</h2>
              <p>Enjoy peace of mind with our secure payment gateway for rent transactions and booking fees.</p>
            </div>
          </div>
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

export default Services;

