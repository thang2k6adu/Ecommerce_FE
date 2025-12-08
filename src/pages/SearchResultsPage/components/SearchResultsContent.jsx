import React from 'react';
import Spinner from '@/components/Spinner/Spinner';
import SearchResultsHeader from './SearchResultsHeader';
import ProductsGrid from './ProductsGrid';
import PaginationControls from './PaginationControls';
import EmptyState from './EmptyState';

const SearchResultsContent = ({ 
  loading, 
  products, 
  pagination, 
  filters,
  onPageChange 
}) => {
  if (loading) {
    return (
      <div className='flex justify-center items-center py-20'>
        <Spinner />
      </div>
    );
  }

  if (products.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <SearchResultsHeader 
        keyword={filters.keyword} 
        totalItems={pagination.totalItems} 
      />
      <ProductsGrid products={products} />
      <PaginationControls 
        pagination={pagination} 
        onPageChange={onPageChange} 
      />
    </>
  );
};

export default SearchResultsContent;

