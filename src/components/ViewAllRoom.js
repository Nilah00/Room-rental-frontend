import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { Heart } from 'lucide-react';
import './ViewAllRoom.css';

function ViewAllRooms() {
  const [rooms, setRooms] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [searchParams, setSearchParams] = useState({
    location: '',
    priceRange: '',
    furnished: '',
  });
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [currentLandlord, setCurrentLandlord] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = useCallback(() => {
    const filtered = rooms.filter((room) => {
      const matchesLocation =
        !searchParams.location ||
        room.location.toLowerCase().includes(searchParams.location.toLowerCase());
      const matchesPrice =
        !searchParams.priceRange ||
        (searchParams.priceRange === '0-15000' && room.price <= 15000) ||
        (searchParams.priceRange === '15001-25000' &&
          room.price > 15000 &&
          room.price <= 25000) ||
        (searchParams.priceRange === '25001-35000' &&
          room.price > 25000 &&
          room.price <= 35000) ||
        (searchParams.priceRange === '35001+' && room.price > 35000);
      const matchesFurnished =
        !searchParams.furnished ||
        (searchParams.furnished === 'furnished' && room.furnished) ||
        (searchParams.furnished === 'unfurnished' && !room.furnished);

      return matchesLocation && matchesPrice && matchesFurnished;
    });

    setFilteredRooms(filtered);
  }, [rooms, searchParams]);

  useEffect(() => {
    fetchRooms();
    loadFavorites();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchParams({
      location: params.get('location') || '',
      priceRange: params.get('priceRange') || '',
      furnished: params.get('furnished') || '',
    });
  }, [location.search]);

  useEffect(() => {
    handleSearch();
  }, [searchParams, rooms, handleSearch]);

  const fetchRooms = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/properties');
      setRooms(response.data);
      setFilteredRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const loadFavorites = () => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
    setFavorites(storedFavorites);
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleFavorite = (room) => {
    setFavorites((prev) => {
      const newFavorites = prev.some((fav) => fav.id === room.id)
        ? prev.filter((fav) => fav.id !== room.id)
        : [...prev, room];
      localStorage.setItem('favorites', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const handleBookNow = (room) => {
    navigate(`/booknow/${room.id}`, { state: { roomDetails: room } });
  };

  const handleChatWithLandlord = (landlordName) => {
    setCurrentLandlord(landlordName);
    setShowChat(true);
  };

  return (
    <div className="view-all-rooms-page">
      <div className="container">
        <Link to="/" className="btn btn-secondary back-to-home">
          Back to Home
        </Link>
        <h1>All Available Rooms</h1>

        <div className="search-form">
          <input
            type="text"
            name="location"
            placeholder="Search by location"
            value={searchParams.location}
            onChange={handleInputChange}
          />
          <select
            name="priceRange"
            value={searchParams.priceRange}
            onChange={handleInputChange}
          >
            <option value="">Price Range</option>
            <option value="0-15000">Rs 0 - Rs 15,000</option>
            <option value="15001-25000">Rs 15,001 - Rs 25,000</option>
            <option value="25001-35000">Rs 25,001 - Rs 35,000</option>
            <option value="35001+">Rs 35,001+</option>
          </select>
          <select
            name="furnished"
            value={searchParams.furnished}
            onChange={handleInputChange}
          >
            <option value="">Furnished Status</option>
            <option value="furnished">Furnished</option>
            <option value="unfurnished">Unfurnished</option>
          </select>
          <button className="btn btn-primary" onClick={handleSearch}>
            Search
          </button>
        </div>

        <div className="listings-grid">
          {filteredRooms.map((room) => (
            <div key={room.id} className="listing-card">
              <img
                src={room.images[0]}
                alt={room.title}
                className="listing-image"
              />
              <div className="listing-details">
                <h3>{room.title}</h3>
                <p className="listing-price">Rs {room.price.toLocaleString()}/month</p>
                <p className="furnished-status">
                  {room.furnished ? 'Furnished' : 'Unfurnished'}
                </p>
                <div className="amenities">
                  {room.amenities.includes('parking') && <div className="amenity">🅿️ Parking</div>}
                  {room.amenities.includes('wifi') && <div className="amenity">📶 WiFi</div>}
                  {room.amenities.includes('water') && <div className="amenity">💧 Water</div>}
                </div>
                <div className="listing-actions">
                  <button
                    className="btn btn-primary btn-book"
                    onClick={() => handleBookNow(room)}
                  >
                    Book Now
                  </button>
                  <button
                    className="btn btn-outline btn-chat"
                    onClick={() => handleChatWithLandlord(room.owner.name)}
                  >
                    💬 Chat with Landlord
                  </button>
                  <button
                    className={`btn btn-icon ${
                      favorites.some((fav) => fav.id === room.id) ? 'btn-favorite-active' : ''
                    }`}
                    onClick={() => toggleFavorite(room)}
                  >
                    <Heart
                      size={20}
                      fill={favorites.some((fav) => fav.id === room.id) ? "red" : "none"}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showChat && (
        <div className="chat-overlay">
          <div className="chat-container">
            <h2>Chat with {currentLandlord}</h2>
            <div className="chat-messages">
              {/* Chat messages would go here */}
            </div>
            <input type="text" placeholder="Type your message..." />
            <button onClick={() => setShowChat(false)}>Close Chat</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewAllRooms;

