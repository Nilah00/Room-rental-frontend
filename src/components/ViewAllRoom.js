import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Heart, MessageCircle, Car, Wifi, Droplets } from 'lucide-react';
import './ViewAllRoom.css';

// Mock data for rooms (replace with actual API call in a real application)
const allRooms = [
  {
    id: 1,
    title: "Cozy Studio in Thamel",
    price: 25000,
    location: "Thamel, Kathmandu",
    furnished: true,
    type: "Studio",
    amenities: { parking: true, wifi: true, water: true },
    image: "/room1.jpg",
    landlordName: "Aarav Sharma"
  },
  {
    id: 2,
    title: "Spacious 2BHK in Patan",
    price: 35000,
    location: "Patan, Lalitpur",
    furnished: false,
    type: "Apartment",
    amenities: { parking: true, wifi: true, water: false },
    image: "/room2.jpeg",
    landlordName: "Priya Thapa"
  },
  {
    id: 3,
    title: "Modern Loft in Lazimpat",
    price: 30000,
    location: "Lazimpat, Kathmandu",
    furnished: true,
    type: "Loft",
    amenities: { parking: false, wifi: true, water: true },
    image: "/room3.jpg",
    landlordName: "Bikash Rai"
  },
  {
    id: 4,
    title: "Family Home in Bhaktapur",
    price: 40000,
    location: "Bhaktapur",
    furnished: true,
    type: "House",
    amenities: { parking: true, wifi: true, water: true },
    image: "/room4.jpg",
    landlordName: "Sarita Maharjan"
  },
  {
    id: 5,
    title: "Student Apartment near Tribhuvan University",
    price: 20000,
    location: "Kirtipur, Kathmandu",
    furnished: false,
    type: "Apartment",
    amenities: { parking: false, wifi: true, water: true },
    image: "/room5.jpg",
    landlordName: "Rajesh Shrestha"
  }
];

function ViewAllRooms() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    priceRange: '',
    furnished: '',
    type: '',
  });
  const [favorites, setFavorites] = useState([]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value
    }));
  };

  const toggleFavorite = (roomId) => {
    setFavorites(prevFavorites => 
      prevFavorites.includes(roomId)
        ? prevFavorites.filter(id => id !== roomId)
        : [...prevFavorites, roomId]
    );
  };

  const filteredRooms = allRooms.filter(room => {
    return (
      room.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filters.priceRange === '' || (
        (filters.priceRange === '0-20000' && room.price <= 20000) ||
        (filters.priceRange === '20001-30000' && room.price > 20000 && room.price <= 30000) ||
        (filters.priceRange === '30001-40000' && room.price > 30000 && room.price <= 40000) ||
        (filters.priceRange === '40001+' && room.price > 40000)
      )) &&
      (filters.furnished === '' || room.furnished.toString() === filters.furnished) &&
      (filters.type === '' || room.type === filters.type)
    );
  });

  return (
    <div className="view-all-rooms">
      <header className="rooms-header">
        <h1>All Available Rooms</h1>
        <Link to="/" className="back-to-home">Back to Home</Link>
      </header>
      <div className="search-filter-container">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div className="filters">
          <Filter size={20} />
          <select name="priceRange" onChange={handleFilterChange} value={filters.priceRange}>
            <option value="">Price Range</option>
            <option value="0-20000">Rs 0 - Rs 20,000</option>
            <option value="20001-30000">Rs 20,001 - Rs 30,000</option>
            <option value="30001-40000">Rs 30,001 - Rs 40,000</option>
            <option value="40001+">Rs 40,001+</option>
          </select>
          <select name="furnished" onChange={handleFilterChange} value={filters.furnished}>
            <option value="">Furnished Status</option>
            <option value="true">Furnished</option>
            <option value="false">Unfurnished</option>
          </select>
          <select name="type" onChange={handleFilterChange} value={filters.type}>
            <option value="">Room Type</option>
            <option value="Studio">Studio</option>
            <option value="Apartment">Apartment</option>
            <option value="House">House</option>
            <option value="Loft">Loft</option>
          </select>
        </div>
      </div>
      <div className="rooms-grid">
        {filteredRooms.map(room => (
          <div key={room.id} className="room-card">
            <div className="room-image-container">
              <img src={room.image} alt={room.title} className="room-image" />
            </div>
            <div className="room-content">
              <h2 className="room-title">{room.title}</h2>
              <div className="room-price">Rs {room.price.toLocaleString()}/month</div>
              <div className="room-furnished-status">
                {room.furnished ? 'Furnished' : 'Unfurnished'}
              </div>
              <div className="room-amenities">
                {room.amenities.parking && (
                  <div className="amenity">
                    <Car size={18} />
                    <span>Parking</span>
                  </div>
                )}
                {room.amenities.wifi && (
                  <div className="amenity">
                    <Wifi size={18} />
                    <span>WiFi</span>
                  </div>
                )}
                {room.amenities.water && (
                  <div className="amenity">
                    <Droplets size={18} />
                    <span>Water</span>
                  </div>
                )}
              </div>
              <Link to={`/book/${room.id}`} className="book-now-btn">
                Book Now
              </Link>
              <div className="action-buttons">
                <button className="chat-btn">
                  <MessageCircle size={20} />
                  Chat with Landlord
                </button>
                <button 
                  className={`favorite-btn ${favorites.includes(room.id) ? 'favorited' : ''}`}
                  onClick={() => toggleFavorite(room.id)}
                >
                  <Heart size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ViewAllRooms;

