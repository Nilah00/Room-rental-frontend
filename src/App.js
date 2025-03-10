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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/about" element={<About />} />
        <Route path="/add-property" element={<AddProperty />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/booknow/:id" element={<BookNow />} />
        <Route path="/rooms" element={<ViewAllRooms />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/manage-properties" element={<ManageProperties />} />
        <Route path="/room/:id" element={<RoomDetail />} />
        <Route path="/edit-property/:id" element={<EditProperty />} />
        <Route path="RoomMap" element={<RoomMap />} />
       

        
      </Routes>
    </Router>
  )
}

export default App