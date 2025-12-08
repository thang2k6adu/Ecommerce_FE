import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const EmptyState = () => {
  const navigate = useNavigate();
  
  return (
    <div className='text-center py-20'>
      <p className='text-lg text-gray-500'>Không tìm thấy sản phẩm nào</p>
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={() => navigate('/')}
      >
        Về trang chủ
      </Button>
    </div>
  );
};

export default EmptyState;

