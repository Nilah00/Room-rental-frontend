import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import './About.css';

const testimonials = [
  {
    id: 1,
    name: "Aarav Sharma",
    role: "Tenant",
    content: "RoomRental made finding a comfortable and affordable room near my university so easy. The landlord communication feature was a game-changer!",
    rating: 5,
  },
  {
    id: 2,
    name: "Sita Gurung",
    role: "Landlord",
    content: "As a property owner, RoomRental has simplified the process of finding reliable tenants. The platform's reach and user-friendly interface have helped me rent out my properties quickly and efficiently.",
    rating: 5,
  },
  {
    id: 3,
    name: "Bikash Rai",
    role: "Tenant",
    content: "As someone who moves frequently for work, RoomRental has been a lifesaver. It's so convenient to find furnished rooms with all the amenities I need.",
    rating: 5,
  },
];

function About() {
  return (
    <div className="about-page">
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

      <main className="about-content">
        <div className="container">
          <h1>About RoomRental </h1>
          <div className="about-text">
            <p>RoomRental Nepal is the leading online platform for finding and listing rooms for rent across Nepal. Our mission is to simplify the process of finding comfortable and affordable accommodation for tenants while providing landlords with a reliable platform to list their properties.</p>
            <p>Founded in 2020, we have quickly grown to become the most trusted name in Nepal's room rental market. Our team of dedicated professionals works tirelessly to ensure that our platform remains user-friendly, secure, and up-to-date with the latest market trends.</p>
            <h2>Our Vision</h2>
            <p>To revolutionize the room rental experience in Nepal by leveraging technology to create a seamless, transparent, and efficient marketplace for both tenants and landlords.</p>
            <h2>Our Values</h2>
            <ul>
              <li>Transparency: We believe in honest and open communication with our users.</li>
              <li>Innovation: We continuously strive to improve our platform and services.</li>
              <li>Reliability: We are committed to providing a dependable service that our users can trust.</li>
            </ul>
          </div>

          <section className="how-it-works">
            <h2>How It Works</h2>
            <div className="steps-grid">
              <div className="step">
                <div className="step-icon">🔍</div>
                <h3>Search</h3>
                <p>Browse through our extensive list of available rooms in Nepal and apply filters to find your perfect match.</p>
              </div>
              <div className="step">
                <div className="step-icon">💬</div>
                <h3>Connect</h3>
                <p>Reach out to landlords directly through our platform to ask questions and schedule viewings.</p>
              </div>
              <div className="step">
                <div className="step-icon">🏠</div>
                <h3>Move In</h3>
                <p>Once you've found your ideal room, complete the booking process and prepare for your move-in date.</p>
              </div>
            </div>
          </section>

          <section className="testimonials">
            <h2>What Our Users Say About Room Rental</h2>
            <div className="testimonials-grid">
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="testimonial-card">
                  <p className="testimonial-content">{testimonial.content}</p>
                  <div className="testimonial-author">
                    <h4>{testimonial.name}</h4>
                    <p>{testimonial.role}</p>
                  </div>
                  <div className="testimonial-rating">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={i < testimonial.rating ? "star-filled" : "star-empty"}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
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

export default About;

