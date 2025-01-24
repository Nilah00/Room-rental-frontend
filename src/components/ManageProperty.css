import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Properties() {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchProperties = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/user/properties', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setProperties(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setError('Failed to fetch properties. Please try again.');
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Your Properties</h1>
      {properties.map(property => (
        <div key={property.id}>
          {/* Display property details here */}
          <p>{property.address}</p>
        </div>
      ))}
    </div>
  );
}

export default Properties;

