import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import './SearchBar.css';

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    category: 'all'
  });
  
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
    fetchCategories();
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const { data } = await axios.get('http://localhost:5000/api/products/categories');
      setCategories(['all', ...data]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch suggestions based on search term
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.trim().length > 1) {
        try {
          const { data } = await axios.get(`http://localhost:5000/api/products/search?q=${searchTerm}`);
          setSuggestions(data.slice(0, 5)); // Top 5 suggestions
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
      } else {
        setSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Save search to recent
  const saveSearch = (term) => {
    if (!term.trim()) return;
    
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Handle search submit
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      saveSearch(searchTerm);
      
      // Build query string with filters
      let queryParams = new URLSearchParams();
      queryParams.append('q', searchTerm);
      if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
      if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);
      if (filters.category !== 'all') queryParams.append('category', filters.category);
      
      navigate(`/search?${queryParams.toString()}`);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (term) => {
    setSearchTerm(term);
    saveSearch(term);
    navigate(`/search?q=${encodeURIComponent(term)}`);
    setShowSuggestions(false);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setSuggestions([]);
    navigate('/');
  };

  // Clear recent searches
  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <div className="search-container" ref={searchRef}>
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search for products, brands and more..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
          />
          {searchTerm && (
            <button type="button" className="clear-btn" onClick={clearSearch}>
              <FaTimes />
            </button>
          )}
          <button type="submit" className="search-btn">
            Search
          </button>
        </div>

        {/* Filter Toggle Button */}
        <button 
          type="button" 
          className={`filter-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters
        </button>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <h4>Filter Products</h4>
          <div className="filter-row">
            <div className="filter-group">
              <label>Category</label>
              <select 
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Min Price (₹)</label>
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
              />
            </div>
            <div className="filter-group">
              <label>Max Price (₹)</label>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
              />
            </div>
          </div>
          <button className="apply-filters-btn" onClick={handleSearch}>
            Apply Filters
          </button>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="suggestions-dropdown">
          {/* Search suggestions */}
          {suggestions.length > 0 && (
            <div className="suggestions-section">
              <h4>Product Suggestions</h4>
              {suggestions.map((product) => (
                <div
                  key={product.productId}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(product.title)}
                >
                  <FaSearch className="suggestion-icon" />
                  <div className="suggestion-content">
                    <span className="suggestion-title">{product.title}</span>
                    <span className="suggestion-category">{product.category}</span>
                  </div>
                  <span className="suggestion-price">₹{product.price}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recent searches */}
          {recentSearches.length > 0 && suggestions.length === 0 && (
            <div className="suggestions-section">
              <div className="section-header">
                <h4>Recent Searches</h4>
                <button className="clear-recent" onClick={clearRecent}>
                  Clear
                </button>
              </div>
              {recentSearches.map((term, index) => (
                <div
                  key={index}
                  className="suggestion-item recent"
                  onClick={() => handleSuggestionClick(term)}
                >
                  <FaSearch className="suggestion-icon" />
                  <span>{term}</span>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {searchTerm.length > 1 && suggestions.length === 0 && (
            <div className="no-suggestions">
              <p>No products found for "{searchTerm}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;