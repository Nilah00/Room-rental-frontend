import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import axios from "axios"
import "./Auth.css"

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Client-side validation
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const response = await axios.post("http://localhost:5000/api/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      })

      localStorage.setItem("token", response.data.token)
      localStorage.setItem("user", JSON.stringify(response.data.user))

      setIsLoading(false)
      navigate("/")
    } catch (error) {
      setIsLoading(false)

      if (error.response) {
        // Server responded with an error
        if (error.response.data.details) {
          setErrors(error.response.data.details)
        } else if (error.response.data.field) {
          setErrors({
            [error.response.data.field]: error.response.data.message,
          })
        } else {
          setErrors({
            general: error.response.data.message || "Registration failed",
          })
        }
      } else if (error.request) {
        // Request was made but no response
        setErrors({
          general: "Unable to connect to the server. Please try again later.",
        })
      } else {
        // Something else happened
        setErrors({
          general: "An unexpected error occurred. Please try again.",
        })
      }
    }
  }

  return (
    <div className="auth-page-container">
      <div className="container">
        <div className="auth-container">
          <div className="auth-card">
            <h2>Create an Account</h2>
            <p className="auth-subtitle">Join RoomRental and start your journey</p>

            {errors.general && <div className="error-message general">{errors.general}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? "error" : ""}
                  disabled={isLoading}
                />
                {errors.name && <div className="error-message">{errors.name}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? "error" : ""}
                  disabled={isLoading}
                />
                {errors.email && <div className="error-message">{errors.email}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? "error" : ""}
                  disabled={isLoading}
                />
                {errors.password && <div className="error-message">{errors.password}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? "error" : ""}
                  disabled={isLoading}
                />
                {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
              </div>

              <button type="submit" className="auth-button" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Register"}
              </button>
            </form>

            <div className="auth-divider">
              <span>Or continue with</span>
            </div>

            

            <div className="auth-footer">
              Already have an account? <Link to="/login">Login here</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register