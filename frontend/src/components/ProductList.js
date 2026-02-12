import React, { useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { FaShoppingCart, FaStar } from 'react-icons/fa';
import './ProductList.css';

const ProductList = () => {
  const { products, addToCart, fetchProducts } = useCart();

  useEffect(() => {
    fetchProducts();
  }, []);

  if (!products || products.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <h2>Loading amazing products...</h2>
      </div>
    );
  }

  return (
    <div className="product-container">
      <h1 className="page-title">Premium Products</h1>
      <div className="product-grid">
        {products.map((product) => (
          <div key={product.productId} className="product-card">
            <div className="product-image">
              <img src={product.image} alt={product.title} />
            </div>
            <div className="product-info">
              <h3>{product.title}</h3>
              <p className="product-category">{product.category}</p>
              <div className="product-rating">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} color={i < Math.floor(product.rating) ? '#FFD700' : '#e4e5e9'} />
                ))}
                <span>{product.rating}</span>
              </div>
              <p className="product-description">{product.description}</p>
              <div className="product-footer">
                <span className="product-price">₹{product.price}</span>
                <button 
                  className="add-to-cart-btn"
                  onClick={() => addToCart(product)}
                >
                  <FaShoppingCart /> Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList;