import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Payment.css';

const Payment = () => {
  const { cart, createOrder, verifyPayment } = useCart();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ✅ FIXED: Razorpay script check function
  const isRazorpayLoaded = () => {
    return typeof window.Razorpay !== 'undefined';
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      
      // Check if cart has items
      if (!cart.items || cart.items.length === 0) {
        toast.error('Your cart is empty!');
        navigate('/');
        return;
      }

      // Calculate total with shipping
      const shipping = cart.totalAmount > 999 ? 0 : 99;
      const total = cart.totalAmount + shipping;
      
      console.log('💰 Total amount:', total);

      // ✅ Check if Razorpay is loaded
      if (!isRazorpayLoaded()) {
        console.log('📥 Loading Razorpay script...');
        
        // Try to load script again
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
        
        console.log('✅ Razorpay script loaded');
        
        // Wait a bit for script to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // ✅ Create order on backend
      console.log('📦 Creating order...');
      const order = await createOrder(total);
      console.log('✅ Order created:', order);

      if (!order || !order.id) {
        throw new Error('Invalid order response');
      }

      // ✅ Razorpay options
      const options = {
        key: order.key || 'rzp_test_SF9rPIJvATAdJR',
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'E-Commerce Store',
        description: `Payment for ${cart.items.length} items`,
        image: 'https://cdn.razorpay.com/logo.png',
        order_id: order.id,
        handler: async (response) => {
          try {
            console.log('💰 Payment response:', response);
            
            toast.loading('Verifying payment...', { id: 'payment' });
            
            const verification = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            
            if (verification.success) {
              toast.success('✅ Payment successful!', { id: 'payment' });
              setTimeout(() => navigate('/'), 2000);
            } else {
              toast.error('❌ Payment verification failed', { id: 'payment' });
            }
          } catch (error) {
            console.error('Verification error:', error);
            toast.error('❌ Payment verification failed', { id: 'payment' });
          }
        },
        prefill: {
          name: 'Test User',
          email: 'test@example.com',
          contact: '9999999999'
        },
        notes: {
          address: 'E-Commerce Store Order'
        },
        theme: {
          color: '#2874f0'
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal closed');
            setLoading(false);
            toast.error('Payment cancelled');
          }
        }
      };

      console.log('🚀 Opening Razorpay...');
      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', function(response) {
        console.error('Payment failed:', response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });

      razorpay.open();
      
    } catch (error) {
      console.error('❌ Payment initiation error:', error);
      toast.error(error.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  // If cart is empty
  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="empty-cart-payment">
        <h2>Your cart is empty</h2>
        <p>Add some products before proceeding to payment</p>
        <button onClick={() => navigate('/')} className="shop-now-btn">
          Continue Shopping
        </button>
      </div>
    );
  }

  const shipping = cart.totalAmount > 999 ? 0 : 99;
  const total = cart.totalAmount + shipping;

  return (
    <div className="payment-container">
      <h1>Checkout</h1>
      
      <div className="payment-content">
        <div className="order-review">
          <h2>Order Summary</h2>
          {cart.items.map((item) => (
            <div key={item.productId} className="order-item">
              <div className="order-item-info">
                <span className="item-name">{item.title}</span>
                <span className="item-quantity">x {item.quantity}</span>
              </div>
              <span className="item-price">₹{item.price * item.quantity}</span>
            </div>
          ))}
          
          <div className="order-total-breakdown">
            <div className="breakdown-row">
              <span>Subtotal</span>
              <span>₹{cart.totalAmount}</span>
            </div>
            <div className="breakdown-row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
            </div>
            <div className="breakdown-row total">
              <span>Total</span>
              <span>₹{total}</span>
            </div>
          </div>
        </div>

        <div className="payment-method">
          <h2>Payment Method</h2>
          <div className="razorpay-card">
            <div className="razorpay-header">
              <img 
                src="https://razorpay.com/assets/razorpay-logo.svg" 
                alt="Razorpay" 
              />
              <span className="secure-badge">🔒 Secure</span>
            </div>
            <p>Pay securely via UPI, Card, NetBanking or Wallet</p>
            <div className="payment-features">
              <span>✅ 100% Secure</span>
              <span>⚡ Instant Refund</span>
              <span>🛡️ Buyer Protection</span>
            </div>
            <button 
              className="pay-now-btn"
              onClick={handlePayment}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                `Pay ₹${total}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;