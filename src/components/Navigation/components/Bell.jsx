import React, { useEffect, useState, useRef } from 'react';
import { Bell as BellIcon, Image as ImageIcon, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { orderAPI } from '@/api/order.api';
import { formatCurrency } from '@/utils/currencyFormatter';
import { useNavigate } from 'react-router-dom';

export default function BellComponent() {
  const navigate = useNavigate();
  const [unreviewedItems, setUnreviewedItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [failedThumbs, setFailedThumbs] = useState(new Set());
  const dropdownRef = useRef(null);

  // Load unreviewed items
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await orderAPI.getUnreviewed();
        if (!mounted) return;
        setUnreviewedItems(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error('Failed to load unreviewed items', err);
      }
    };
    load();
    return () => (mounted = false);
  }, []);

  // Click outside closes dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-11 w-11"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Unreviewed orders"
      >
        <BellIcon size={20} />
        {unreviewedItems.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-black text-white rounded-full text-[11px] w-5 h-5 flex items-center justify-center">
            {unreviewedItems.length}
          </span>
        )}
      </Button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-96 bg-white border rounded-xl shadow-lg z-50 overflow-hidden"
          style={{ minWidth: 420 }}
        >
  <div className="p-3 border-b font-medium bg-gray-600 text-white flex items-center gap-2">
        <BellRing className="w-5 h-5 text-white" />
        <span>Thông báo sản phẩm</span>
  </div>

          <div className="max-h-80 overflow-auto">
            {unreviewedItems.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">
                Không có đơn hàng cần đánh giá.
              </div>
            ) : (
              unreviewedItems.map((it) => (
                <div
                  key={it.id}
                  className="group flex items-center gap-3 p-3 bg-white border-b last:border-0 rounded-md hover:bg-gray-50 transition-colors"
                  style={{ margin: '6px 8px' }}
                >
                  <div className="flex-shrink-0">
                    {(!failedThumbs.has(it.id) && (it.thumbnail || it.image)) ? (
                      <img
                        src={it.thumbnail || it.image}
                        alt={it.productName || it.name || 'product'}
                        className="w-14 h-14 rounded-md object-cover"
                        loading="lazy"
                        onError={() => {
                          setFailedThumbs((s) => new Set([...s, it.id]));
                        }}
                        title={it.productName || it.name}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-md bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="font-medium text-sm" title={it.productName || it.name}>
                      {it.productName || it.name || 'Sản phẩm'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Số lượng: {it.quantity} •{' '}
                      {it.unitPrice ? formatCurrency(it.unitPrice) : ''}
                    </div>
                    {it.description && (
                      <div className="text-xs text-gray-400 mt-1">
                        {it.description}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    <button
                      className="relative flex items-center justify-center text-sm font-medium bg-orange-500 text-white px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all duration-150 transform hover:-translate-y-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(false);

                        // ensure dropdown closes before navigation
                        setTimeout(() => {
                          navigate('/order-success');
                        }, 0);
                      }}
                      aria-label={`Đánh giá ${it.productName || it.name || 'sản phẩm'}`}
                    >
                      <span className="truncate">Đánh giá</span>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t text-right bg-gray-50">
            <button
              className="text-xs text-gray-600 rounded px-2 py-1 hover:bg-gray-100"
              onClick={() => setOpen(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
