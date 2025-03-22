"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import axios from "axios"
import { login, adminLogin, isAuthenticated, isAdminAuthenticated, adminLogout } from "../services/auth"
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
      await axios.post("http://localhost:5000/api/auth/forgot-password", { email })
      setMessage("Password reset link sent to your email.")
      setIsLoading(false)
      onSubmit(email)
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
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  })
  const [adminFormData, setAdminFormData] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState({})
  const [adminErrors, setAdminErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isAdminLoading, setIsAdminLoading] = useState(false)
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  // Check if we should show admin mode based on URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get("admin") === "true") {
      setIsAdminMode(true)
    }

    // Check if user is already logged in
    if (isAuthenticated() && !isAdminMode) {
      navigate("/")
    }

    // Check if admin is already logged in - but only redirect if we're not switching modes
    if (isAdminAuthenticated() && isAdminMode && !params.get("admin")) {
      navigate("/dashboard")
    }
  }, [location, navigate, isAdminMode])

  // When switching to admin mode, ensure we're not automatically logged in
  useEffect(() => {
    if (isAdminMode) {
      // If we're switching to admin mode and there's already an admin session,
      // we'll clear it to force login
      if (location.state?.forceLogin) {
        adminLogout()
      }
    }
  }, [isAdminMode, location.state])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  const handleAdminChange = (e) => {
    const { name, value } = e.target
    setAdminFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error when admin starts typing
    if (adminErrors[name]) {
      setAdminErrors((prev) => ({
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
      // Validate form
      if (!formData.email) {
        setErrors({ email: "Email is required" })
        setIsLoading(false)
        return
      }

      if (!formData.password) {
        setErrors({ password: "Password is required" })
        setIsLoading(false)
        return
      }

      // Use the login function from auth service
      await login(formData)
      setLoginSuccess(true)

      // Redirect after a short delay to show success message
      setTimeout(() => {
        navigate("/")
      }, 1000)
    } catch (error) {
      setIsLoading(false)
      console.error("Login error:", error)

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

  const handleAdminSubmit = async (e) => {
    e.preventDefault()
    setIsAdminLoading(true)
    setAdminErrors({})

    try {
      // Validate form
      if (!adminFormData.email) {
        setAdminErrors({ email: "Email is required" })
        setIsAdminLoading(false)
        return
      }

      if (!adminFormData.password) {
        setAdminErrors({ password: "Password is required" })
        setIsAdminLoading(false)
        return
      }

      // Use the adminLogin function from auth service
      await adminLogin(adminFormData)
      setIsAdminLoading(false)
      navigate("/dashboard") // Redirect to dashboard
    } catch (error) {
      setIsAdminLoading(false)
      console.error("Admin login error:", error)
      setAdminErrors({
        general: "Invalid admin credentials. Please try again.",
      })
    }
  }

  const handleForgotPasswordSubmit = async (email) => {
    console.log("Forgot password for email:", email)
    // Close the modal after submission
    setIsForgotPasswordOpen(false)
  }

  const handleModeToggle = (mode) => {
    // If switching to admin mode, force a new login
    if (mode === "admin") {
      // Clear any existing admin session
      adminLogout()
      setIsAdminMode(true)
    } else {
      setIsAdminMode(false)
    }
  }

  return (
    <div className="auth-page-container">
      <div className="container">
        <div className="auth-container">
          <div className="auth-card">
            <div className="login-mode-toggle">
              <button
                className={`mode-button ${!isAdminMode ? "active" : ""}`}
                onClick={() => handleModeToggle("user")}
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                User Login
              </button>
              <button
                className={`mode-button ${isAdminMode ? "active" : ""}`}
                onClick={() => handleModeToggle("admin")}
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v16a3 3 0 0 0 3 3 3 3 0 0 0 3-3V5a3 3 0 0 0-3-3z"></path>
                  <path d="M19 9h-4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1z"></path>
                  <path d="M5 13H1a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1z"></path>
                </svg>
                Admin Login
              </button>
            </div>

            {!isAdminMode ? (
              // User Login Form
              <>
                <h2>Login to Your Account</h2>
                <p className="auth-subtitle">Welcome back to RoomRental</p>

                {loginSuccess && <div className="error-message general success">Login successful! Redirecting...</div>}

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
                      <input
                        type="checkbox"
                        id="remember"
                        name="remember"
                        checked={formData.remember}
                        onChange={handleChange}
                      />
                      <label htmlFor="remember">Remember me</label>
                    </div>
                    <button type="button" className="forgot-password" onClick={() => setIsForgotPasswordOpen(true)}>
                      Forgot Password?
                    </button>
                  </div>

                  <button type="submit" className="auth-button" disabled={isLoading}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                      <polyline points="10 17 15 12 10 7"></polyline>
                      <line x1="15" y1="12" x2="3" y2="12"></line>
                    </svg>
                    {isLoading ? "Logging in..." : "Login"}
                  </button>
                </form>

                <div className="auth-divider">
                  <span>Or continue with</span>
                </div>

                <button className="google-auth-button" type="button">
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
              </>
            ) : (
              // Admin Login Form
              <>
                <h2>Admin Login</h2>
                <p className="auth-subtitle">Access the admin dashboard</p>

                {adminErrors.general && <div className="error-message general">{adminErrors.general}</div>}

                <div className="admin-login-warning visible">
                  This area is restricted to authorized administrators only.
                </div>

                <form onSubmit={handleAdminSubmit} className="auth-form">
                  <div className="form-group">
                    <label htmlFor="admin-email">Admin Email</label>
                    <input
                      type="email"
                      id="admin-email"
                      name="email"
                      value={adminFormData.email}
                      onChange={handleAdminChange}
                      className={adminErrors.email ? "error" : ""}
                      disabled={isAdminLoading}
                    />
                    {adminErrors.email && <div className="error-message">{adminErrors.email}</div>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="admin-password">Admin Password</label>
                    <input
                      type="password"
                      id="admin-password"
                      name="password"
                      value={adminFormData.password}
                      onChange={handleAdminChange}
                      className={adminErrors.password ? "error" : ""}
                      disabled={isAdminLoading}
                    />
                    {adminErrors.password && <div className="error-message">{adminErrors.password}</div>}
                  </div>

                  <button type="submit" className="auth-button admin-button" disabled={isAdminLoading}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    {isAdminLoading ? "Logging in..." : "Login as Admin"}
                  </button>
                </form>
              </>
            )}
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
