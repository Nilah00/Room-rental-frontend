import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Heart } from 'lucide-react';
import ChatBox from './ChatBox';
import './ViewAllRoom.css';

const allRooms = [
  {
    id: 1,
    title: "Spacious room in Thamel",
    price: 25000,
    furnished: true,
    amenities: { parking: true, wifi: true, water: true },
    image: "/room1.jpg",
    landlordName: "Nifiya Shrestha",
  },
  {
    id: 2,
    title: "Spacious Apartment in Patan",
    price: 35000,
    furnished: false,
    amenities: { parking: true, wifi: true, water: false },
    image: "/room2.jpeg",
    landlordName: "Nitika Suwal",
  },
  {
    id: 3,
    title: "Modern Loft in Lazimpat",
    price: 30000,
    furnished: true,
    amenities: { parking: false, wifi: true, water: true },
    image: "/room3.jpg",
    landlordName: "Sara Lamichhane",
  },
  {
    id: 4,
    title: "Cozy Room in Boudha",
    price: 20000,
    furnished: true,
    amenities: { parking: false, wifi: true, water: true },
    image: "/room4.jpg",
    landlordName: "Rajan Rai",
  },
  {
    id: 5,
    title: "Luxury Apartment in Jhamsikhel",
    price: 50000,
    furnished: true,
    amenities: { parking: true, wifi: true, water: true },
    image: "/room5.jpg",
    landlordName: "Anita Sharma",
  },
  {
    id: 6,
    title: "Simple Room in Koteshwor",
    price: 15000,
    furnished: false,
    amenities: { parking: false, wifi: true, water: true },
    image: "/room6.jpg",
    landlordName: "Suman Shrestha",
  },
];

function ViewAllRooms() {
  const [favorites, setFavorites] = useState([]);
  const [searchParams, setSearchParams] = useState({
    location: '',
    priceRange: '',
    furnished: '',
  });
  const [filteredRooms, setFilteredRooms] = useState(allRooms);
  const [showChat, setShowChat] = useState(false);
  const [currentLandlord, setCurrentLandlord] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = useCallback(() => {
    const filtered = allRooms.filter((room) => {
      const matchesLocation =
        !searchParams.location ||
        room.title.toLowerCase().includes(searchParams.location.toLowerCase());
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
  }, [searchParams]);

  useEffect(() => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
    setFavorites(storedFavorites);

    // Parse search params from URL
    const params = new URLSearchParams(location.search);
    setSearchParams({
      location: params.get('location') || '',
      priceRange: params.get('priceRange') || '',
      furnished: params.get('furnished') || '',
    });
  }, [location.search]);

  useEffect(() => {
    handleSearch();
  }, [searchParams, handleSearch]);

  const toggleFavorite = (room) => {
    setFavorites((prev) => {
      const newFavorites = prev.some(fav => fav.id === room.id)
        ? prev.filter(fav => fav.id !== room.id)
        : [...prev, room];
      localStorage.setItem('favorites', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({
      ...prev,
      [name]: value,
    }));
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
                src={room.image}
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
                  {room.amenities.parking && <div className="amenity">🅿️ Parking</div>}
                  {room.amenities.wifi && <div className="amenity">📶 WiFi</div>}
                  {room.amenities.water && <div className="amenity">💧 Water</div>}
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
                    onClick={() => handleChatWithLandlord(room.landlordName)}
                  >
                    💬 Chat with Landlord
                  </button>
                  <button
                    className={`btn btn-icon ${
                      favorites.some(fav => fav.id === room.id) ? 'btn-favorite-active' : ''
                    }`}
                    onClick={() => toggleFavorite(room)}
                  >
                    <Heart size={20} fill={favorites.some(fav => fav.id === room.id) ? "red" : "none"} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showChat && (
        <ChatBox
          landlordName={currentLandlord}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}

export default ViewAllRooms;

