import { BrowserRouter as Router, Route, Routes } from "react-router-dom"
import Home from "./components/Home"
import Services from "./components/Services"
import About from "./components/About"
import AddProperty from "./components/AddProperty"
import Login from "./components/Login"
import Register from "./components/Register"
import BookNow from "./components/BookNow"
import ViewAllRooms from "./components/ViewAllRoom"
import Saved from "./components/Saved"
import ManageProperties from "./components/ManageProperty"
import RoomDetail from "./components/RoomDetail"
import EditProperty from "./components/EditProperty"
import RoomMap from "./components/RoomMap"
import AdminDashboard from "./components/dashboard"
import ProtectedRoute from "./components/ProtectedRoute"
import ManageBookings from "./components/ManageBookings"
import Notifications from "./components/NotificationSystem"
function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />

        {/* Protected user routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute requireAdmin={false}>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-property"
          element={
            <ProtectedRoute requireAdmin={false}>
              <AddProperty />
            </ProtectedRoute>
          }
        />
        <Route
          path="/booknow/:id"
          element={
            <ProtectedRoute requireAdmin={false}>
              <BookNow />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rooms"
          element={
            <ProtectedRoute requireAdmin={false}>
              <ViewAllRooms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/saved"
          element={
            <ProtectedRoute requireAdmin={false}>
              <Saved />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-properties"
          element={
            <ProtectedRoute requireAdmin={false}>
              <ManageProperties />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/room/:id"
          element={
            <ProtectedRoute requireAdmin={false}>
              <RoomDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-property/:id"
          element={
            <ProtectedRoute requireAdmin={false}>
              <EditProperty />
            </ProtectedRoute>
          }
        />
        <Route
          path="/RoomMap"
          element={
            <ProtectedRoute requireAdmin={false}>
              <RoomMap />
            </ProtectedRoute>
          }
        />

<Route
  path="/manage-bookings"
  element={
    <ProtectedRoute requireAdmin={false}>
      <ManageBookings />
    </ProtectedRoute>
  }
/>
<Route
  path="/notification"
  element={
    <ProtectedRoute requireAdmin={false}>
      <Notifications />
    </ProtectedRoute>
  }
/>
      

        {/* Protected admin routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App

