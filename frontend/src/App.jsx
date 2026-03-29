import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Admin from "./pages/admin/Admin";
import CategoryProducts from "./pages/category-products/CategoryProducts";
import Login from "./pages/login/Login";
import Home from "./pages/home/Home";
import ProductDetail from "./pages/product-detail/ProductDetail";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/san-pham/:slug" element={<ProductDetail />} />
        <Route path="/danh-muc/:slug" element={<CategoryProducts />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
