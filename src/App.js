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
import MessagesPage from "./components/MessagesPage"
import BookingConfirmation from "./components/bookingConfirmation"
import Bookings from "./components/bookings" // Import the Bookings component
import Payment from "./components/Payment"
import PaymentSuccess from "./components/PaymentSuccess"
import PaymentFailure from "./components/PaymentFailure"
import Profile from "./components/profile"

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/rooms" element={<ViewAllRooms />} />
        <Route path="/room/:id" element={<RoomDetail />} />
        {/* New route for booking confirmation */}
        <Route path="/booking-confirmation/:bookingId" element={<BookingConfirmation />} />
        <Route path="/payment/:bookingId" element={<Payment />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failure" element={<PaymentFailure />} />
       
        {/* Protected routes */}
        <Route
          path="/bookings" // Add the route for the Bookings page
          element={
            <ProtectedRoute requireAdmin={false}>
              <Bookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute requireAdmin={false}>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/:chatId"
          element={
            <ProtectedRoute requireAdmin={false}>
              <MessagesPage />
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
          path="/edit-property/:id"
          element={
            <ProtectedRoute requireAdmin={false}>
              <EditProperty />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<Profile />} />
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