import React, { useState } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useLoadScript } from '@react-google-maps/api';
import { Home, Bed, DollarSign } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const center = {
  lat: 27.7172,
  lng: 85.3240
};

const rentalLocations = [
  { id: 1, position: { lat: 27.7172, lng: 85.3240 }, title: "Cozy Studio in Thamel", price: 25000, bedrooms: 1 },
  { id: 2, position: { lat: 27.6788, lng: 85.3165 }, title: "Spacious Apartment in Patan", price: 35000, bedrooms: 2 },
  { id: 3, position: { lat: 27.7308, lng: 85.3315 }, title: "Modern Loft in Lazimpat", price: 30000, bedrooms: 1 },
];

const mapOptions = {
  styles: [
    {
      featureType: 'all',
      elementType: 'geometry',
      stylers: [{ color: '#f5f5f5' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#c9c9c9' }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9e9e9e' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }]
    },
    {
      featureType: 'road.arterial',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#757575' }]
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [{ color: '#e5e5e5' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#e5e5e5' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9e9e9e' }]
    }
  ],
  disableDefaultUI: true,
  zoomControl: true,
};

function RentalMap() {
  const [selectedRental, setSelectedRental] = useState(null);
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  });

  if (loadError) return "Error loading maps";
  if (!isLoaded) return "Loading Maps";

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={13}
      options={mapOptions}
    >
      {rentalLocations.map((rental) => (
        <Marker
          key={rental.id}
          position={rental.position}
          onClick={() => setSelectedRental(rental)}
          icon={{
            url: `data:image/svg+xml,${encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#6366F1" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
            )}`,
            scaledSize: new window.google.maps.Size(36, 36),
          }}
        />
      ))}

      {selectedRental && (
        <InfoWindow
          position={selectedRental.position}
          onCloseClick={() => setSelectedRental(null)}
        >
          <div className="info-window">
            <h3>{selectedRental.title}</h3>
            <p className="info-detail">
              <DollarSign size={16} />
              Rs. {selectedRental.price.toLocaleString()} / month
            </p>
            <p className="info-detail">
              <Bed size={16} />
              {selectedRental.bedrooms} {selectedRental.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}
            </p>
            <button className="view-details-btn">View Details</button>
          </div>
        </InfoWindow>
      )}
      <div className="map-legend">
        <div className="legend-item">
          <Home size={20} color="#6366F1" />
          <span>Available Rentals</span>
        </div>
      </div>
    </GoogleMap>
  );
}

export default RentalMap;