import React from 'react';

const SearchResultsHeader = ({ keyword, totalItems }) => {
  return (
    <div className='mb-6'>
      <h1 className='text-2xl font-bold mb-2'>
        {keyword ? `Kết quả tìm kiếm cho "${keyword}"` : 'Tất cả sản phẩm'}
      </h1>
      <p className='text-gray-600'>
        Tìm thấy {totalItems} sản phẩm
      </p>
    </div>
  );
};

export default SearchResultsHeader;

