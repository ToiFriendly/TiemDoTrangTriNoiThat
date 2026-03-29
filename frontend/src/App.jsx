import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Admin from "./pages/admin/Admin";
import Login from "./pages/login/Login";
import Home from "./pages/home/Home";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
