const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const Razorpay = require('razorpay');
const axios = require('axios');
const crypto = require('crypto');

dotenv.config();

const app = express();

// ✅ CORS Configuration
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// ✅ Razorpay Instance
let razorpay;
try {
  console.log('🔑 RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'Present' : 'MISSING!');
  console.log('🔑 RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'Present' : 'MISSING!');
  
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized successfully');
} catch (error) {
  console.error('❌ Razorpay initialization failed:', error.message);
}

// ============= SCHEMAS =============
const productSchema = new mongoose.Schema({
  productId: String,
  title: String,
  price: Number,
  description: String,
  image: String,
  category: String,
  rating: { type: Number, default: 4.5 }
});

const cartSchema = new mongoose.Schema({
  userId: { type: String, default: 'guest' },
  items: [{
    productId: String,
    title: String,
    price: Number,
    image: String,
    quantity: { type: Number, default: 1 }
  }],
  totalAmount: { type: Number, default: 0 },
  totalItems: { type: Number, default: 0 }
});

const orderSchema = new mongoose.Schema({
  orderId: String,
  razorpayOrderId: String,
  amount: Number,
  items: Array,
  status: { 
    type: String, 
    enum: ['created', 'paid', 'failed'],
    default: 'created' 
  },
  paymentId: String,
  signature: String,
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);
const Cart = mongoose.model('Cart', cartSchema);
const Order = mongoose.model('Order', orderSchema);

// ============= TEST ROUTE =============
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!',
    razorpay: razorpay ? '✅ Initialized' : '❌ Not initialized',
    env: {
      razorpay_key: process.env.RAZORPAY_KEY_ID ? '✅' : '❌',
      razorpay_secret: process.env.RAZORPAY_KEY_SECRET ? '✅' : '❌',
      unsplash: process.env.UNSPLASH_ACCESS_KEY ? '✅' : '❌'
    }
  });
});

// ============= PRODUCT ROUTES =============
app.get('/api/products', async (req, res) => {
  try {
    console.log('📦 Fetching products...');
    
    let products = await Product.find();
    console.log(`📦 Found ${products.length} products in DB`);
    
    if (products.length === 0) {
      console.log('📸 Fetching from Unsplash...');
      
      try {
        const response = await axios.get('https://api.unsplash.com/search/photos', {
          params: {
            query: 'product',
            per_page: 12,
            orientation: 'squarish'
          },
          headers: {
            Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
          }
        });

        const categories = ['Electronics', 'Fashion', 'Home', 'Sports', 'Books', 'Toys'];
        
        products = response.data.results.map((photo, index) => ({
          productId: `prod_${Date.now()}_${index}`,
          title: photo.alt_description 
            ? photo.alt_description.split(' ').slice(0, 3).join(' ').toUpperCase()
            : `Premium Product ${index + 1}`,
          price: Math.floor(Math.random() * 3000) + 499,
          description: 'High quality premium product with amazing features.',
          image: photo.urls.regular,
          category: categories[Math.floor(Math.random() * categories.length)],
          rating: (Math.random() * 2 + 3).toFixed(1)
        }));

        await Product.insertMany(products);
        console.log(`✅ Added ${products.length} products from Unsplash`);
      } catch (unsplashError) {
        console.error('❌ Unsplash Error:', unsplashError.message);
        
        products = [
          {
            productId: 'prod_1',
            title: 'Premium Headphones',
            price: 1999,
            description: 'Wireless noise cancellation headphones',
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
            category: 'Electronics',
            rating: 4.5
          },
          {
            productId: 'prod_2',
            title: 'Smart Watch',
            price: 2999,
            description: 'Fitness tracker with heart rate monitor',
            image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
            category: 'Electronics',
            rating: 4.3
          }
        ];
      }
    }
    
    res.json(products);
  } catch (error) {
    console.error('❌ Product Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============= 🔍 SEARCH ROUTES - ADD THIS SECTION =============

/**
 * 1. BASIC SEARCH - Search products by title, description, category
 * URL: /api/products/search?q=headphones
 */
app.get('/api/products/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    console.log(`🔍 Searching products for: "${q}"`);
    
    if (!q || q.trim() === '') {
      const products = await Product.find().limit(20);
      return res.json(products);
    }

    // Case-insensitive search in multiple fields
    const searchRegex = new RegExp(q, 'i');
    
    const products = await Product.find({
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex }
      ]
    });

    console.log(`✅ Found ${products.length} products matching "${q}"`);
    res.json(products);
    
  } catch (error) {
    console.error('❌ Search Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2. ADVANCED SEARCH - With filters (price range, category)
 * URL: /api/products/advanced-search?q=headphones&minPrice=1000&maxPrice=5000&category=Electronics
 */
app.get('/api/products/advanced-search', async (req, res) => {
  try {
    const { q, minPrice, maxPrice, category, sort, page = 1, limit = 20 } = req.query;
    
    let query = {};
    
    // Text search
    if (q && q.trim() !== '') {
      const searchRegex = new RegExp(q, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex }
      ];
    }
    
    // Price filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    
    // Category filter
    if (category && category !== 'all' && category !== 'undefined') {
      query.category = category;
    }
    
    console.log('🔍 Advanced search query:', JSON.stringify(query));
    
    // Build query
    let productsQuery = Product.find(query);
    
    // Sorting
    if (sort) {
      switch(sort) {
        case 'price-low':
          productsQuery = productsQuery.sort({ price: 1 });
          break;
        case 'price-high':
          productsQuery = productsQuery.sort({ price: -1 });
          break;
        case 'rating':
          productsQuery = productsQuery.sort({ rating: -1 });
          break;
        case 'newest':
          productsQuery = productsQuery.sort({ _id: -1 });
          break;
        default:
          productsQuery = productsQuery.sort({ _id: -1 });
      }
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    productsQuery = productsQuery.skip(skip).limit(parseInt(limit));
    
    const products = await productsQuery;
    const total = await Product.countDocuments(query);
    
    console.log(`✅ Found ${products.length} products (total: ${total})`);
    
    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ Advanced Search Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3. AUTOCOMPLETE / SUGGESTIONS - For search bar suggestions
 * URL: /api/products/suggestions?q=head
 */
app.get('/api/products/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const searchRegex = new RegExp(q, 'i');
    
    const suggestions = await Product.find({
      $or: [
        { title: searchRegex },
        { category: searchRegex }
      ]
    })
    .select('productId title price category image rating')
    .limit(5);
    
    res.json(suggestions);
    
  } catch (error) {
    console.error('❌ Suggestions Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 4. GET ALL CATEGORIES - For filter dropdown
 * URL: /api/products/categories
 */
app.get('/api/products/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    console.log(`📑 Found ${categories.length} categories`);
    res.json(categories);
  } catch (error) {
    console.error('❌ Categories Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 5. SEARCH BY CATEGORY - Get products by category
 * URL: /api/products/category/Electronics
 */
app.get('/api/products/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    console.log(`📑 Fetching products in category: ${category}`);
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const products = await Product.find({ 
      category: { $regex: new RegExp(category, 'i') } 
    })
    .skip(skip)
    .limit(parseInt(limit));
    
    const total = await Product.countDocuments({ 
      category: { $regex: new RegExp(category, 'i') } 
    });
    
    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ Category Search Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 6. GET SINGLE PRODUCT BY ID
 * URL: /api/products/:productId
 */
app.get('/api/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await Product.findOne({ productId });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
    
  } catch (error) {
    console.error('❌ Product Fetch Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 7. RELATED PRODUCTS - Based on category
 * URL: /api/products/:productId/related
 */
app.get('/api/products/:productId/related', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await Product.findOne({ productId });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const relatedProducts = await Product.find({
      category: product.category,
      productId: { $ne: productId }
    })
    .limit(4);
    
    res.json(relatedProducts);
    
  } catch (error) {
    console.error('❌ Related Products Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============= CART ROUTES =============
app.get('/api/cart', async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: 'guest' });
    if (!cart) {
      cart = new Cart({ 
        userId: 'guest', 
        items: [],
        totalAmount: 0,
        totalItems: 0
      });
      await cart.save();
    }
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cart/add', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    console.log('➕ Adding to cart:', productId);
    
    let product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    let cart = await Cart.findOne({ userId: 'guest' });
    if (!cart) {
      cart = new Cart({ userId: 'guest', items: [] });
    }

    const existingItem = cart.items.find(item => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId: product.productId,
        title: product.title,
        price: product.price,
        image: product.image,
        quantity
      });
    }

    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    
    await cart.save();
    res.json(cart);
  } catch (error) {
    console.error('❌ Cart Add Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/cart/update', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    const cart = await Cart.findOne({ userId: 'guest' });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (itemIndex > -1) {
      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }
      
      cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      
      await cart.save();
    }
    
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cart/remove/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const cart = await Cart.findOne({ userId: 'guest' });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item.productId !== productId);
    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= PAYMENT ROUTES =============
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    
    console.log('💰 Payment request received:');
    console.log('   - Amount:', amount);
    console.log('   - Razorpay Status:', razorpay ? '✅ Ready' : '❌ Not initialized');
    
    if (!razorpay) {
      console.error('❌ Razorpay not initialized');
      return res.status(500).json({ 
        error: 'Payment gateway not configured',
        details: 'Razorpay initialization failed'
      });
    }

    if (!amount || isNaN(amount) || amount < 1) {
      return res.status(400).json({ 
        error: 'Invalid amount',
        details: 'Amount must be greater than 0'
      });
    }

    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1
    };

    console.log('📦 Creating Razorpay order with options:', options);
    
    const order = await razorpay.orders.create(options);
    console.log('✅ Razorpay order created successfully:', order.id);
    
    const newOrder = new Order({
      orderId: `order_${Date.now()}`,
      razorpayOrderId: order.id,
      amount: amount,
      items: req.body.items || [],
      status: 'created'
    });
    
    await newOrder.save();
    console.log('✅ Order saved to database with ID:', newOrder.orderId);
    
    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });
    
  } catch (error) {
    console.error('❌ Payment creation failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to create payment order',
      details: error.message
    });
  }
});

app.post('/api/payment/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    console.log('💰 Verifying payment:', razorpay_order_id);

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      console.log('✅ Payment verified successfully');
      
      await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { 
          status: 'paid',
          paymentId: razorpay_payment_id,
          signature: razorpay_signature
        }
      );
      
      await Cart.findOneAndUpdate(
        { userId: 'guest' },
        { items: [], totalAmount: 0, totalItems: 0 }
      );
      
      res.json({ 
        success: true,
        message: 'Payment verified successfully' 
      });
    } else {
      console.error('❌ Invalid payment signature');
      res.status(400).json({ 
        success: false, 
        message: 'Invalid signature' 
      });
    }
  } catch (error) {
    console.error('❌ Payment verification error:', error.message);
    res.status(500).json({ 
      error: 'Payment verification failed',
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔧 Test API: http://localhost:${PORT}/api/test`);
  console.log(`📦 Products API: http://localhost:${PORT}/api/products`);
  console.log(`🔍 Search API: http://localhost:${PORT}/api/products/search?q=headphones`);
  console.log(`💡 Suggestions API: http://localhost:${PORT}/api/products/suggestions?q=head`);
  console.log(`📑 Categories API: http://localhost:${PORT}/api/products/categories`);
  console.log(`💰 Payment API: http://localhost:${PORT}/api/payment/create-order`);
});