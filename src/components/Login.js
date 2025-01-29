import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import axios from "axios"
import "./Auth.css"

function ForgotPasswordModal({ isOpen, onClose, onSubmit }) {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    try {
      // Replace with your actual API endpoint
      await axios.post("http://localhost:5000/api/forgot-password", { email })
      setMessage("Password reset link sent to your email.")
      setIsLoading(false)
    } catch (error) {
      setMessage("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Forgot Password</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="forgot-password-email">Email</label>
            <input
              type="email"
              id="forgot-password-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
        {message && <p className="message">{message}</p>}
        <button onClick={onClose} className="close-button">
          Close
        </button>
      </div>
    </div>
  )
}

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      const response = await axios.post("http://localhost:5000/api/login", formData)

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
            general: error.response.data.message || "An error occurred during login",
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

  const handleForgotPasswordSubmit = async (email) => {
    // Implement forgot password logic here
    console.log("Forgot password for email:", email)
    // Close the modal after submission
    setIsForgotPasswordOpen(false)
  }

  return (
    <div className="auth-page-container">
      <div className="container">
        <div className="auth-container">
          <div className="auth-card">
            <h2>Login to Your Account</h2>
            <p className="auth-subtitle">Welcome back to RoomRental</p>

            {errors.general && <div className="error-message general">{errors.general}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
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

              <div className="form-options">
                <div className="remember-me">
                  <input type="checkbox" id="remember" name="remember" />
                  <label htmlFor="remember">Remember me</label>
                </div>
                <button type="button" className="forgot-password" onClick={() => setIsForgotPasswordOpen(true)}>
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="auth-button" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="auth-divider">
              <span>Or continue with</span>
            </div>

            <button className="google-auth-button">
              <svg viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Continue with Google
            </button>

            <div className="auth-footer">
              Don't have an account? <Link to="/register">Register here</Link>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onSubmit={handleForgotPasswordSubmit}
      />
    </div>
  )
}

export default Login

