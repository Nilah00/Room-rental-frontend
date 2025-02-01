import React from "react"
import { Heart } from "lucide-react"

const PropertyCard = ({ property }) => {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "/placeholder.svg"
    // If the path is already a full URL, return it as is
    if (imagePath.startsWith("http")) return imagePath
    // Otherwise, prepend the API URL
    return `${API_URL}/${imagePath}`
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative aspect-video">
        <img
          src={getImageUrl(property.images[0]) || "/placeholder.svg"}
          alt={property.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null // Prevent infinite loop
            e.target.src = "/placeholder.svg"
          }}
        />
      </div>
      <div className="p-4">
        <h2 className="text-xl font-bold mb-2">{property.title}</h2>
        <p className="text-purple-600 text-2xl font-semibold mb-2">Rs {property.price}/month</p>
        {property.furnished && <p className="text-gray-600 mb-2">Furnished</p>}
        <div className="flex gap-4 mb-4">
          {property.amenities.includes("parking") && (
            <div className="flex items-center gap-1">
              <span className="bg-blue-100 p-1 rounded">P</span>
              <span>Parking</span>
            </div>
          )}
          {property.amenities.includes("water") && (
            <div className="flex items-center gap-1">
              <span className="bg-blue-100 p-1 rounded">💧</span>
              <span>Water</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
            Book Now
          </button>
          <button className="flex-1 border border-purple-600 text-purple-600 py-2 px-4 rounded-lg hover:bg-purple-50 transition-colors">
            Chat with Landlord
          </button>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Heart className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default PropertyCard
