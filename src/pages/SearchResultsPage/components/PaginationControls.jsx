import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PaginationControls = ({ pagination, onPageChange }) => {
  if (pagination.totalPages <= 1) return null;

  return (
    <>
      <div className='flex justify-center items-center gap-4 mt-8'>
        <Button
          variant="outline"
          size="icon"
          disabled={!pagination.hasPrevious}
          onClick={() => onPageChange(pagination.currentPage - 1)}
        >
          <ChevronLeft size={20} />
        </Button>
        
        <div className='flex items-center gap-2'>
          {[...Array(pagination.totalPages)].map((_, index) => (
            <Button
              key={index}
              variant={pagination.currentPage === index ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(index)}
              className="w-10 h-10"
            >
              {index + 1}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          disabled={!pagination.hasNext}
          onClick={() => onPageChange(pagination.currentPage + 1)}
        >
          <ChevronRight size={20} />
        </Button>
      </div>

      <div className='text-center mt-4 text-sm text-gray-600'>
        Trang {pagination.currentPage + 1} / {pagination.totalPages}
      </div>
    </>
  );
};

export default PaginationControls;

