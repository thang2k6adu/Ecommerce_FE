import { createAsyncThunk } from "@reduxjs/toolkit";
import { agentAPI } from "@/api/agent.api";
import {
  extractOrderId,
  isBulkConfirmCommand,
  isListOrdersCommand,
  extractOrderIdFromResponse,
} from "./utils";

const SYSTEM_PROMPT = `Bạn là một AI assistant chuyên giúp admin quản lý đơn hàng trong hệ thống e-commerce. 
Nhiệm vụ chính của bạn:
1. Trả lời các câu hỏi về đơn hàng
2. Tổng hợp thông tin đơn hàng khi được yêu cầu
3. Xác nhận đơn hàng khi admin yêu cầu (chuyển từ PENDING sang SHIPPING)

Khi admin yêu cầu xác nhận đơn hàng, bạn cần:
- Hỏi rõ số đơn hàng hoặc ID đơn hàng nếu chưa rõ
- Xác nhận lại thông tin đơn hàng trước khi xác nhận
- Thực hiện xác nhận bằng cách gọi hàm confirmOrder với orderId

Luôn trả lời bằng tiếng Việt, thân thiện và chuyên nghiệp.`;

/**
 * Send message to AI agent
 */
export const sendMessage = createAsyncThunk(
  "adminAgent/sendMessage",
  async ({ inputText, chatHistory }, { rejectWithValue }) => {
    try {
      const lowerText = inputText.toLowerCase();

      // Check for confirm order command
      const orderId = extractOrderId(inputText);
      if (orderId) {
        return { type: "confirmOrder", orderId };
      }

      // Check for bulk confirm command
      if (isBulkConfirmCommand(inputText)) {
        return { type: "bulkConfirm" };
      }

      // Check for list orders command
      if (isListOrdersCommand(inputText)) {
        return { type: "listOrders" };
      }

      // Prepare messages for AI
      let messagesToSend = [...chatHistory];

      // Add context about orders if needed
      if (lowerText.includes("đơn hàng") || lowerText.includes("order")) {
        try {
          const orders = await agentAPI.getOrders();
          const pendingCount = orders.filter((o) => o.status === "PENDING").length;
          messagesToSend.push({
            role: "system",
            content: `Context: Hiện có ${pendingCount} đơn hàng đang chờ xác nhận (PENDING). Tổng số đơn hàng: ${orders.length}.`,
          });
        } catch (err) {
          console.error("Error fetching orders context:", err);
        }
      }

      // Call AI API
      const response = await agentAPI.chat(messagesToSend);

      // Check if response contains confirm command
      const responseOrderId = extractOrderIdFromResponse(response);
      if (responseOrderId) {
        return { 
          type: "aiConfirmOrder", 
          response, 
          orderId: responseOrderId 
        };
      }

      return { type: "aiResponse", response };
    } catch (error) {
      return rejectWithValue(error.message || "Không thể kết nối với AI");
    }
  }
);

/**
 * Confirm a single order
 */
export const confirmOrder = createAsyncThunk(
  "adminAgent/confirmOrder",
  async (orderId, { rejectWithValue }) => {
    try {
      // Get order info first
      const order = await agentAPI.getOrderById(orderId);

      // Confirm order
      await agentAPI.confirmOrder(orderId);

      return {
        orderId,
        orderNumber: order.orderNumber || "N/A",
        status: order.status,
        totalAmount: order.totalAmount || "N/A",
      };
    } catch (error) {
      return rejectWithValue(error.message || "Đơn hàng không tồn tại hoặc đã được xử lý");
    }
  }
);

/**
 * List pending orders
 */
export const listOrders = createAsyncThunk(
  "adminAgent/listOrders",
  async (_, { rejectWithValue }) => {
    try {
      const orders = await agentAPI.getOrders();
      const pendingOrders = orders.filter((o) => o.status === "PENDING");

      return { pendingOrders, totalOrders: orders.length };
    } catch (error) {
      return rejectWithValue(error.message || "Không thể tải danh sách đơn hàng");
    }
  }
);

/**
 * Confirm all pending orders
 */
export const confirmAllOrders = createAsyncThunk(
  "adminAgent/confirmAllOrders",
  async (_, { rejectWithValue }) => {
    try {
      // Get all orders
      const orders = await agentAPI.getOrders();
      const pendingOrders = orders.filter((o) => o.status === "PENDING");

      if (pendingOrders.length === 0) {
        return { pendingOrders: [], results: [] };
      }

      // Confirm each order
      const results = [];
      for (let i = 0; i < pendingOrders.length; i++) {
        const order = pendingOrders[i];
        try {
          await agentAPI.confirmOrder(order.id);
          results.push({
            orderId: order.id,
            orderNumber: order.orderNumber || order.id,
            success: true,
          });

          // Small delay to avoid API spam
          if (i < pendingOrders.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        } catch (error) {
          results.push({
            orderId: order.id,
            orderNumber: order.orderNumber || order.id,
            success: false,
            error: error.message || "Lỗi không xác định",
          });
        }
      }

      return { pendingOrders, results };
    } catch (error) {
      return rejectWithValue(error.message || "Lỗi không xác định");
    }
  }
);

/**
 * Get system prompt
 */
export const getSystemPrompt = () => SYSTEM_PROMPT;

