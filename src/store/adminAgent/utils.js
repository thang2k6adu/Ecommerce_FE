// Pattern matching utilities for command detection

export const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export const CONFIRM_PATTERNS = [
  // Patterns với UUID
  /xác nhận.*đơn.*hàng.*(?:có.*ID|ID)?\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /confirm.*order.*(?:with.*ID|ID)?\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /xác nhận.*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /confirm.*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /duyệt.*đơn.*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /approve.*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  // Patterns với số (fallback)
  /xác nhận.*đơn.*hàng.*#?(\d+)/i,
  /confirm.*order.*#?(\d+)/i,
  /xác nhận.*(\d+)/i,
  /confirm.*(\d+)/i,
  /duyệt.*đơn.*(\d+)/i,
  /approve.*(\d+)/i,
];

export const BULK_CONFIRM_PATTERNS = [
  /xác nhận.*hết.*đơn.*hàng/i,
  /xác nhận.*tất cả.*đơn.*hàng/i,
  /xác nhận.*hết.*chưa.*được.*xác nhận/i,
  /xác nhận.*tất cả.*chưa.*được.*xác nhận/i,
  /xác nhận.*hết/i,
  /xác nhận.*tất cả/i,
  /confirm.*all.*order/i,
  /confirm.*all.*pending/i,
  /duyệt.*hết/i,
  /duyệt.*tất cả/i,
];

export const LIST_ORDERS_PATTERNS = [
  /danh sách.*đơn.*hàng/i,
  /list.*order/i,
  /hiển thị.*đơn/i,
  /show.*order/i,
  /đơn.*hàng.*chờ/i,
];

/**
 * Extract order ID from text (UUID or number)
 */
export const extractOrderId = (text) => {
  const lowerText = text.toLowerCase();
  const hasConfirmKeyword = 
    lowerText.includes("xác nhận") || 
    lowerText.includes("confirm") || 
    lowerText.includes("duyệt") || 
    lowerText.includes("approve");

  if (!hasConfirmKeyword) return null;

  // Ưu tiên UUID
  const uuidMatch = text.match(UUID_PATTERN);
  if (uuidMatch) {
    return uuidMatch[0];
  }

  // Fallback: tìm số
  for (const pattern of CONFIRM_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Check if text matches bulk confirm pattern
 */
export const isBulkConfirmCommand = (text) => {
  const lowerText = text.toLowerCase();
  return BULK_CONFIRM_PATTERNS.some(pattern => lowerText.match(pattern));
};

/**
 * Check if text matches list orders pattern
 */
export const isListOrdersCommand = (text) => {
  const lowerText = text.toLowerCase();
  return LIST_ORDERS_PATTERNS.some(pattern => lowerText.match(pattern));
};

/**
 * Extract order ID from AI response
 */
export const extractOrderIdFromResponse = (response) => {
  const responseLower = response.toLowerCase();
  const hasConfirmKeyword = 
    responseLower.includes("xác nhận") || 
    responseLower.includes("confirm");

  if (!hasConfirmKeyword) return null;

  // Ưu tiên UUID
  const uuidMatch = response.match(UUID_PATTERN);
  if (uuidMatch) {
    return uuidMatch[0];
  }

  // Fallback: tìm số
  const numberMatch = response.match(/#?(\d+)/);
  if (numberMatch) {
    return numberMatch[1];
  }

  return null;
};

