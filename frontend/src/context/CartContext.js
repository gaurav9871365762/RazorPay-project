import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const CartContext = createContext();

// ✅ FIXED API URL - Direct localhost
const API = axios.create({
  baseURL: 'http://localhost:5000/api'
});

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], totalAmount: 0, totalItems: 0 });
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);

  // Test backend connection
  useEffect(() => {
    testBackend();
    fetchCart();
    fetchProducts();
  }, []);

  const testBackend = async () => {
    try {
      const { data } = await API.get('/test');
      console.log('✅ Backend connected:', data);
      toast.success('Backend connected!');
    } catch (error) {
      console.error('❌ Backend connection failed:', error.message);
      toast.error('Backend connection failed!');
    }
  };

  const fetchProducts = async () => {
    try {
      console.log('📦 Fetching products...');
      const { data } = await API.get('/products');
      console.log('✅ Products loaded:', data.length);
      setProducts(data);
    } catch (error) {
      console.error('❌ Failed to fetch products:', error.message);
      toast.error('Failed to load products');
    }
  };

  const fetchCart = async () => {
    try {
      const { data } = await API.get('/cart');
      setCart(data);
    } catch (error) {
      console.error('Error fetching cart:', error.message);
      setCart({ items: [], totalAmount: 0, totalItems: 0 });
    }
  };

  const addToCart = async (product) => {
    try {
      setLoading(true);
      const { data } = await API.post('/cart/add', {
        productId: product.productId,
        quantity: 1
      });
      setCart(data);
      toast.success('Added to cart!');
      return data;
    } catch (error) {
      toast.error('Failed to add item');
      console.error('Add to cart error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      const { data } = await API.put('/cart/update', { productId, quantity });
      setCart(data);
      toast.success('Cart updated!');
      return data;
    } catch (error) {
      toast.error('Failed to update cart');
      console.error('Update cart error:', error.message);
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const { data } = await API.delete(`/cart/remove/${productId}`);
      setCart(data);
      toast.success('Item removed!');
      return data;
    } catch (error) {
      toast.error('Failed to remove item');
      console.error('Remove from cart error:', error.message);
    }
  };

  const createOrder = async (amount) => {
    try {
      const { data } = await API.post('/payment/create-order', {
        amount,
        items: cart.items
      });
      return data;
    } catch (error) {
      console.error('Create order error:', error.message);
      throw error;
    }
  };

  const verifyPayment = async (paymentData) => {
    try {
      const { data } = await API.post('/payment/verify', paymentData);
      return data;
    } catch (error) {
      console.error('Verify payment error:', error.message);
      throw error;
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      products,
      loading,
      addToCart,
      updateQuantity,
      removeFromCart,
      createOrder,
      verifyPayment,
      fetchCart,
      fetchProducts
    }}>
      {children}
    </CartContext.Provider>
  );
};