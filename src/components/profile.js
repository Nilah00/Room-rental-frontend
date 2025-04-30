"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import "./Profile.css"

const Profile = () => {
  const [userData, setUserData] = useState({
    name: "",
    email: "",
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch user data from localStorage
    try {
      const user = JSON.parse(localStorage.getItem("user"))
      if (user) {
        setUserData({
          name: user.name || "User",
          email: user.email || "user@example.com",
        })
      }
    } catch (err) {
      console.error("Error fetching user data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  if (isLoading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <Link to="/" className="back-link">
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </Link>
        <h1>Personal Information</h1>
      </div>

      <div className="profile-card">
        <div className="profile-details">
          <div className="detail-item">
            <div className="detail-content">
              <h3>User</h3>
              <p>{userData.name}</p>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-content">
              <h3>User Email</h3>
              <p>{userData.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
