import { Navigate, useLocation } from "react-router-dom"
import { isAuthenticated, isAdminAuthenticated } from "../services/auth"

function ProtectedRoute({ children, requireAdmin = false }) {
  const location = useLocation()

  console.log("ProtectedRoute check:")
  console.log("- requireAdmin:", requireAdmin)
  console.log("- isAuthenticated:", isAuthenticated())
  console.log("- isAdminAuthenticated:", isAdminAuthenticated())

  // For admin routes, strictly check admin authentication
  if (requireAdmin && !isAdminAuthenticated()) {
    console.log("Admin route but not admin authenticated, redirecting to admin login")
    return <Navigate to="/login?admin=true" state={{ from: location, forceLogin: true }} replace />
  }

  // For user routes, allow either user OR admin authentication
  if (!requireAdmin && !isAuthenticated() && !isAdminAuthenticated()) {
    console.log("User route but neither user nor admin authenticated, redirecting to login")
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  console.log("Authentication check passed, rendering children")
  return children
}

export default ProtectedRoute

