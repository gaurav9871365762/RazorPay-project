import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { FaShoppingCart, FaStore } from 'react-icons/fa';
import SearchBar from './SearchBar';  // ✅ Import SearchBar
import './Navbar.css';

const Navbar = () => {
  const { cart } = useCart();

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <FaStore /> E-Store
        </Link>
        
        {/* ✅ Search Bar - Yahan Add Kiya */}
        <SearchBar />
        
        <div className="nav-links">
          <Link to="/" className="nav-link">Products</Link>
          <Link to="/cart" className="nav-link cart-link">
            <FaShoppingCart />
            {cart.totalItems > 0 && (
              <span className="cart-badge">{cart.totalItems}</span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;