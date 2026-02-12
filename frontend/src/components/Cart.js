import React from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { FaTrash, FaMinus, FaPlus, FaShoppingBag } from 'react-icons/fa';
import './Cart.css';

const Cart = () => {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    navigate('/payment');
  };

  if (cart.items.length === 0) {
    return (
      <div className="empty-cart">
        <FaShoppingBag size={64} />
        <h2>Your cart is empty</h2>
        <p>Add some products to your cart</p>
        <button onClick={() => navigate('/')} className="shop-now-btn">
          Shop Now
        </button>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h1>Shopping Cart ({cart.totalItems} items)</h1>
      <div className="cart-content">
        <div className="cart-items">
          {cart.items.map((item) => (
            <div key={item.productId} className="cart-item">
              <img src={item.image} alt={item.title} />
              <div className="item-details">
                <h3>{item.title}</h3>
                <p className="item-price">₹{item.price}</p>
                <div className="quantity-controls">
                  <button 
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <FaMinus />
                  </button>
                  <span>{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  >
                    <FaPlus />
                  </button>
                </div>
              </div>
              <div className="item-total">
                <p>₹{item.price * item.quantity}</p>
                <button 
                  className="remove-btn"
                  onClick={() => removeFromCart(item.productId)}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="cart-summary">
          <h2>Order Summary</h2>
          <div className="summary-item">
            <span>Subtotal</span>
            <span>₹{cart.totalAmount}</span>
          </div>
          <div className="summary-item">
            <span>Shipping</span>
            <span>₹{cart.totalAmount > 999 ? 0 : 99}</span>
          </div>
          <div className="summary-item total">
            <span>Total</span>
            <span>₹{cart.totalAmount + (cart.totalAmount > 999 ? 0 : 99)}</span>
          </div>
          <button className="checkout-btn" onClick={handleCheckout}>
            Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;