import React from 'react';
import ProductCard from '../../ProductListPage/ProductCard';

const ProductsGrid = ({ products }) => {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
      {products.map((product) => (
        <ProductCard 
          key={product.id} 
          {...product} 
          title={product.name}
        />
      ))}
    </div>
  );
};

export default ProductsGrid;

