import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaShoppingCart, FaStar, FaFilter, FaArrowLeft, FaTimes } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import './SearchResults.css';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('relevance');
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    category: 'all'
  });
  
  const query = searchParams.get('q') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const category = searchParams.get('category') || 'all';

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch search results when URL params change
  useEffect(() => {
    fetchSearchResults();
  }, [searchParams]);

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get('http://localhost:5000/api/products/categories');
      setCategories(['all', ...data]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSearchResults = async () => {
    try {
      setLoading(true);
      
      // Build URL with all parameters
      let url = 'http://localhost:5000/api/products/advanced-search?';
      const params = new URLSearchParams();
      
      if (query) params.append('q', query);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (category && category !== 'all') params.append('category', category);
      if (sortBy !== 'relevance') params.append('sort', sortBy);
      
      url += params.toString();
      
      console.log('🔍 Fetching:', url);
      
      const { data } = await axios.get(url);
      
      // Handle both array and paginated response
      if (data.products) {
        setProducts(data.products);
      } else {
        setProducts(data);
      }
      
    } catch (error) {
      console.error('Search error:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (e) => {
    const newSort = e.target.value;
    setSortBy(newSort);
    
    // Update URL with new sort
    const params = new URLSearchParams(searchParams);
    if (newSort !== 'relevance') {
      params.set('sort', newSort);
    } else {
      params.delete('sort');
    }
    navigate(`/search?${params.toString()}`);
  };

  const handleFilterApply = () => {
    const params = new URLSearchParams();
    
    if (query) params.append('q', query);
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (sortBy !== 'relevance') params.append('sort', sortBy);
    
    navigate(`/search?${params.toString()}`);
    setShowMobileFilter(false);
  };

  const handleFilterClear = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      category: 'all'
    });
    
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (sortBy !== 'relevance') params.append('sort', sortBy);
    
    navigate(`/search?${params.toString()}`);
  };

  // Initialize filters from URL
  useEffect(() => {
    setFilters({
      minPrice: minPrice || '',
      maxPrice: maxPrice || '',
      category: category || 'all'
    });
  }, [minPrice, maxPrice, category]);

  if (loading) {
    return (
      <div className="search-loading">
        <div className="loading-spinner"></div>
        <h2>Searching for "{query}"...</h2>
        <p>Finding the best products for you</p>
      </div>
    );
  }

  return (
    <div className="search-results-container">
      {/* Header Section */}
      <div className="results-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <FaArrowLeft /> Continue Shopping
        </button>
        
        <div className="results-title">
          <h1>
            {query ? `"${query}"` : 'All Products'}
            <span className="results-count">{products.length} products found</span>
          </h1>
        </div>
        
        <div className="sort-section">
          <label>Sort by:</label>
          <select value={sortBy} onChange={handleSortChange}>
            <option value="relevance">Relevance</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Customer Rating</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-header">
          <h3><FaFilter /> Filters</h3>
          {(filters.minPrice || filters.maxPrice || filters.category !== 'all') && (
            <button className="clear-filters" onClick={handleFilterClear}>
              <FaTimes /> Clear All
            </button>
          )}
        </div>
        
        <div className="filter-grid">
          <div className="filter-item">
            <label>Category</label>
            <select 
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
            >
              <option value="all">All Categories</option>
              {categories.filter(c => c !== 'all').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-item">
            <label>Min Price (₹)</label>
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
              min="0"
            />
          </div>
          
          <div className="filter-item">
            <label>Max Price (₹)</label>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
              min="0"
            />
          </div>
          
          <div className="filter-actions">
            <button className="apply-filters" onClick={handleFilterApply}>
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Filter Button */}
      <button 
        className="mobile-filter-btn"
        onClick={() => setShowMobileFilter(!showMobileFilter)}
      >
        <FaFilter /> Filters & Sort
      </button>

      {/* Mobile Filter Modal */}
      {showMobileFilter && (
        <div className="mobile-filter-modal">
          <div className="modal-header">
            <h3>Filters & Sort</h3>
            <button onClick={() => setShowMobileFilter(false)}>
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-content">
            <div className="modal-section">
              <h4>Sort By</h4>
              <select value={sortBy} onChange={(e) => {
                handleSortChange(e);
                setShowMobileFilter(false);
              }}>
                <option value="relevance">Relevance</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Rating</option>
              </select>
            </div>
            
            <div className="modal-section">
              <h4>Category</h4>
              <select 
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              >
                <option value="all">All Categories</option>
                {categories.filter(c => c !== 'all').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="modal-section">
              <h4>Price Range (₹)</h4>
              <div className="price-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="clear-btn" onClick={() => {
                handleFilterClear();
                setShowMobileFilter(false);
              }}>
                Clear All
              </button>
              <button className="apply-btn" onClick={handleFilterApply}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {products.length === 0 ? (
        <div className="no-results">
          <img 
            src="https://cdn-icons-png.flaticon.com/512/7486/7486754.png" 
            alt="No results" 
          />
          <h2>No products found</h2>
          <p>
            {query 
              ? `We couldn't find any products matching "${query}"`
              : 'No products match your filters'
            }
          </p>
          <div className="no-results-actions">
            <button className="shop-now-btn" onClick={() => navigate('/')}>
              Browse All Products
            </button>
            <button className="clear-search-btn" onClick={handleFilterClear}>
              Clear Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.productId} className="product-card">
              <div className="product-image">
                <img src={product.image} alt={product.title} />
                {product.rating >= 4.5 && (
                  <span className="product-badge">Best Seller</span>
                )}
              </div>
              <div className="product-info">
                <h3>{product.title}</h3>
                <p className="product-category">{product.category}</p>
                <div className="product-rating">
                  <div className="stars">
                    {[...Array(5)].map((_, i) => (
                      <FaStar 
                        key={i} 
                        color={i < Math.floor(product.rating) ? '#FFD700' : '#e4e5e9'} 
                      />
                    ))}
                  </div>
                  <span className="rating-value">{product.rating}</span>
                </div>
                <p className="product-description">
                  {product.description.length > 60 
                    ? `${product.description.substring(0, 60)}...` 
                    : product.description
                  }
                </p>
                <div className="product-footer">
                  <span className="product-price">₹{product.price}</span>
                  <button 
                    className="add-to-cart-btn"
                    onClick={() => addToCart(product)}
                  >
                    <FaShoppingCart /> Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;