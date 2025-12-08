import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productAPI } from '@/api/product.api';
import FilterSidebar from '@/components/Filters/FilterSidebar';
import SearchResultsContent from './components/SearchResultsContent';
import '@/components/Filters/priceFillter.css';

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalItems: 0,
    totalPages: 0,
    pageSize: 12,
    hasNext: false,
    hasPrevious: false
  });
  const [availableBrands, setAvailableBrands] = useState([]);

  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || '',
    categoryId: searchParams.get('categoryId') || null,
    typeId: searchParams.get('typeId') || null,
    brand: searchParams.get('brand') || null,
    minPrice: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')) : null,
    maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')) : null,
    minRating: searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')) : null,
    isNewArrival: searchParams.get('isNewArrival') === 'true',
    sortBy: searchParams.get('sortBy') || 'name',
    sortDirection: searchParams.get('sortDirection') || 'asc',
    page: searchParams.get('page') ? parseInt(searchParams.get('page')) : 0,
    size: 12
  });

  // Fetch products
  const fetchSearchResults = useCallback(async () => {
    setLoading(true);
    try {
      // Clean up params - remove null/undefined values
      const cleanParams = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});

      const response = await productAPI.search(cleanParams);
      
      setProducts(response.products || []);
      setPagination({
        currentPage: response.currentPage,
        totalItems: response.totalItems,
        totalPages: response.totalPages,
        pageSize: response.pageSize,
        hasNext: response.hasNext,
        hasPrevious: response.hasPrevious
      });

      // Extract unique brands from results
      const brands = [...new Set(response.products?.map(p => p.brand).filter(Boolean))];
      setAvailableBrands(brands);
    } catch (error) {
      console.error('Search error:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSearchResults();
  }, [fetchSearchResults]);

  // Update URL when filters change
  const updateURL = (newFilters) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '' && key !== 'size') {
        params.set(key, value.toString());
      }
    });
    setSearchParams(params);
  };

  // Filter handlers
  const handleFilterChange = (updates) => {
    const newFilters = { ...filters, ...updates, page: 0 }; // Reset to page 0 when filters change
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const handlePriceChange = ({ minPrice, maxPrice }) => {
    handleFilterChange({ minPrice, maxPrice });
  };

  const handleRatingChange = (minRating) => {
    handleFilterChange({ minRating });
  };

  const handleSortChange = (sortBy, sortDirection) => {
    handleFilterChange({ sortBy, sortDirection });
  };

  const handleNewArrivalChange = (isNewArrival) => {
    handleFilterChange({ isNewArrival });
  };

  const handleBrandChange = (brand) => {
    handleFilterChange({ brand });
  };

  const handlePageChange = (newPage) => {
    const newFilters = { ...filters, page: newPage };
    setFilters(newFilters);
    updateURL(newFilters);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      keyword: filters.keyword, // Keep keyword
      categoryId: null,
      typeId: null,
      brand: null,
      minPrice: null,
      maxPrice: null,
      minRating: null,
      isNewArrival: false,
      sortBy: 'name',
      sortDirection: 'asc',
      page: 0,
      size: 12
    };
    setFilters(clearedFilters);
    updateURL(clearedFilters);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className='flex flex-col md:flex-row gap-6'>
        {/* Sidebar Filters */}
        <div className='w-full md:w-[280px] lg:w-[300px]'>
          <div className='sticky top-20'>
            <FilterSidebar
              filters={filters}
              availableBrands={availableBrands}
              onPriceChange={handlePriceChange}
              onRatingChange={handleRatingChange}
              onSortChange={handleSortChange}
              onNewArrivalChange={handleNewArrivalChange}
              onBrandChange={handleBrandChange}
              onClearFilters={handleClearFilters}
            />
          </div>
        </div>

        {/* Results */}
        <div className='flex-1'>
          <SearchResultsContent
            loading={loading}
            products={products}
            pagination={pagination}
            filters={filters}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;

