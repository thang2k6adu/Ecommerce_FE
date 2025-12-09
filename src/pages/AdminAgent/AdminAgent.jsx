import { useState, useRef, useEffect, useCallback } from "react";
import { agentAPI } from "@/api/agent.api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import ChatHeader from "./components/ChatHeader";
import MessageList from "./components/MessageList";
import ChatInput from "./components/ChatInput";

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

export default function AdminAgent() {
  const { t } = useTranslation();
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content: t('admin.agent.greeting'),
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatHistoryRef = useRef([
    { role: "system", content: SYSTEM_PROMPT },
  ]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    // Thêm user message vào chat history
    chatHistoryRef.current.push({
      role: "user",
      content: inputText.trim(),
    });

    try {
      const lowerText = inputText.toLowerCase();
      
      // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      
      // Kiểm tra nếu user yêu cầu xác nhận đơn hàng - nhiều pattern khác nhau
      // Ưu tiên match UUID trước, sau đó mới match số
      const confirmPatterns = [
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
      
      // Nếu có UUID trong text, ưu tiên extract UUID
      const uuidMatch = inputText.match(uuidPattern);
      if (uuidMatch && (lowerText.includes("xác nhận") || lowerText.includes("confirm") || lowerText.includes("duyệt") || lowerText.includes("approve"))) {
        const orderId = uuidMatch[0];
        await handleConfirmOrder(orderId);
        return;
      }
      
      // Nếu không có UUID, thử match với các pattern khác
      for (const pattern of confirmPatterns) {
        const match = inputText.match(pattern);
        if (match) {
          const orderId = match[1];
          await handleConfirmOrder(orderId);
          return;
        }
      }

      // Kiểm tra nếu user yêu cầu xác nhận hàng loạt
      const bulkConfirmPatterns = [
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
      
      for (const pattern of bulkConfirmPatterns) {
        if (lowerText.match(pattern)) {
          await handleConfirmAllOrders();
          return;
        }
      }

      // Kiểm tra nếu user yêu cầu xem danh sách đơn hàng
      if (lowerText.match(/danh sách.*đơn.*hàng|list.*order|hiển thị.*đơn|show.*order|đơn.*hàng.*chờ/i)) {
        await handleListOrders();
        return;
      }

      // Gọi GPT API với context về orders nếu cần
      let messagesToSend = [...chatHistoryRef.current];
      
      // Nếu câu hỏi liên quan đến đơn hàng, thêm context
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

      const response = await agentAPI.chat(messagesToSend);
      
      // Kiểm tra nếu response chứa lệnh xác nhận đơn hàng
      const responseLower = response.toLowerCase();
      const hasConfirmKeyword = responseLower.includes("xác nhận") || responseLower.includes("confirm");
      
      if (hasConfirmKeyword) {
        // Ưu tiên tìm UUID trước
        const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const uuidMatch = response.match(uuidPattern);
        
        if (uuidMatch) {
          const orderId = uuidMatch[0];
          // Thêm response vào messages trước
          chatHistoryRef.current.push({
            role: "assistant",
            content: response,
          });
          const assistantMessage = {
            id: Date.now() + 1,
            role: "assistant",
            content: response,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          // Sau đó xác nhận đơn hàng
          await handleConfirmOrder(orderId);
          return;
        }
        
        // Fallback: tìm số đơn hàng
      const responseConfirmMatch = response.match(/#?(\d+)/);
        if (responseConfirmMatch) {
        const orderId = responseConfirmMatch[1];
        // Thêm response vào messages trước
        chatHistoryRef.current.push({
          role: "assistant",
          content: response,
        });
        const assistantMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        // Sau đó xác nhận đơn hàng
        await handleConfirmOrder(orderId);
        return;
        }
      }
      
      // Thêm assistant response vào chat history
      chatHistoryRef.current.push({
        role: "assistant",
        content: response,
      });

      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Không thể kết nối với AI. Vui lòng thử lại.");
      
      const errorMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: "Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmOrder = async (orderId) => {
    try {
      // Lấy thông tin đơn hàng trước
      const order = await agentAPI.getOrderById(orderId);
      
      const infoMessage = {
        id: Date.now(),
        role: "assistant",
        content: `Đang kiểm tra đơn hàng #${orderId}...\n` +
                 `Số đơn: ${order.orderNumber || "N/A"}\n` +
                 `Trạng thái: ${order.status}\n` +
                 `Tổng tiền: ${order.totalAmount || "N/A"}\n\n` +
                 `Đang xác nhận đơn hàng...`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, infoMessage]);

      // Xác nhận đơn hàng
      await agentAPI.confirmOrder(orderId);
      
      const successMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: `✅ Đã xác nhận đơn hàng #${orderId} thành công!\n` +
                 `Trạng thái đã được cập nhật từ PENDING sang SHIPPING.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);

      // Cập nhật chat history
      chatHistoryRef.current.push({
        role: "assistant",
        content: successMessage.content,
      });

      toast.success("Đã xác nhận đơn hàng thành công!");
    } catch (error) {
      console.error("Error confirming order:", error);
      const errorMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: `❌ Không thể xác nhận đơn hàng #${orderId}.\n` +
                 `Lỗi: ${error.message || "Đơn hàng không tồn tại hoặc đã được xử lý."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error("Không thể xác nhận đơn hàng");
    } finally {
      setIsLoading(false);
    }
  };

  const handleListOrders = async () => {
    try {
      setIsLoading(true);
      const orders = await agentAPI.getOrders();
      
      const pendingOrders = orders.filter((o) => o.status === "PENDING");
      
      let content = `📋 Danh sách đơn hàng:\n\n`;
      if (pendingOrders.length === 0) {
        content += `Không có đơn hàng nào đang chờ xác nhận.`;
      } else {
        content += `Có ${pendingOrders.length} đơn hàng đang chờ xác nhận:\n\n`;
        pendingOrders.slice(0, 10).forEach((order) => {
          content += `• Đơn #${order.id} - ${order.orderNumber || "N/A"} - ${order.totalAmount || "N/A"} VNĐ\n`;
        });
        if (pendingOrders.length > 10) {
          content += `\n... và ${pendingOrders.length - 10} đơn hàng khác.`;
        }
        content += `\n\n💡 Bạn có thể:\n- Xác nhận đơn hàng bằng cách nói "xác nhận đơn hàng [ID]"\n- Xác nhận tất cả bằng cách nói "xác nhận hết các đơn hàng chưa được xác nhận"`;
      }

      const listMessage = {
        id: Date.now(),
        role: "assistant",
        content: content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, listMessage]);

      chatHistoryRef.current.push({
        role: "assistant",
        content: content,
      });
    } catch (error) {
      console.error("Error listing orders:", error);
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAllOrders = async () => {
    try {
      setIsLoading(true);
      
      // Thông báo bắt đầu
      const startMessage = {
        id: Date.now(),
        role: "assistant",
        content: "🔄 Đang lấy danh sách các đơn hàng chưa được xác nhận...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, startMessage]);

      // Lấy danh sách đơn hàng
      const orders = await agentAPI.getOrders();
      const pendingOrders = orders.filter((o) => o.status === "PENDING");

      if (pendingOrders.length === 0) {
        const noOrdersMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: "✅ Không có đơn hàng nào đang chờ xác nhận.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, noOrdersMessage]);
        chatHistoryRef.current.push({
          role: "assistant",
          content: noOrdersMessage.content,
        });
        toast.success("Không có đơn hàng nào cần xác nhận");
        return;
      }

      // Thông báo số lượng đơn hàng sẽ xác nhận
      const infoMessage = {
        id: Date.now() + 2,
        role: "assistant",
        content: `📦 Tìm thấy ${pendingOrders.length} đơn hàng đang chờ xác nhận.\n` +
                 `Đang bắt đầu xác nhận từng đơn hàng...\n\n`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, infoMessage]);

      let successCount = 0;
      let failCount = 0;
      const failedOrders = [];

      // Xác nhận từng đơn hàng
      for (let i = 0; i < pendingOrders.length; i++) {
        const order = pendingOrders[i];
        // Hiển thị tiến trình
        const progressMessageId = Date.now() + 3 + i;
        const progressMessage = {
          id: progressMessageId,
          role: "assistant",
          content: `⏳ [${i + 1}/${pendingOrders.length}] Đang xác nhận đơn hàng ${order.orderNumber || order.id}...`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, progressMessage]);

        try {
          await agentAPI.confirmOrder(order.id);
          successCount++;

          // Cập nhật message tiến trình thành công
          setMessages((prev) => {
            const updated = [...prev];
            const messageIndex = updated.findIndex((msg) => msg.id === progressMessageId);
            if (messageIndex !== -1) {
              updated[messageIndex] = {
                ...updated[messageIndex],
                content: `✅ [${i + 1}/${pendingOrders.length}] Đã xác nhận đơn hàng ${order.orderNumber || order.id}`,
              };
            }
            return updated;
          });

          // Delay nhỏ để tránh spam API
          if (i < pendingOrders.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        } catch (error) {
          failCount++;
          failedOrders.push({
            id: order.id,
            orderNumber: order.orderNumber || "N/A",
            error: error.message || "Lỗi không xác định",
          });

          // Cập nhật message tiến trình thất bại
          setMessages((prev) => {
            const updated = [...prev];
            const messageIndex = updated.findIndex((msg) => msg.id === progressMessageId);
            if (messageIndex !== -1) {
              updated[messageIndex] = {
                ...updated[messageIndex],
                content: `❌ [${i + 1}/${pendingOrders.length}] Không thể xác nhận đơn hàng ${order.orderNumber || order.id}: ${error.message || "Lỗi không xác định"}`,
              };
            }
            return updated;
          });
        }
      }

      // Tổng kết kết quả
      let summaryContent = `\n📊 Tổng kết:\n` +
        `✅ Thành công: ${successCount}/${pendingOrders.length} đơn hàng\n` +
        `❌ Thất bại: ${failCount}/${pendingOrders.length} đơn hàng\n`;

      if (failedOrders.length > 0) {
        summaryContent += `\n⚠️ Các đơn hàng không thể xác nhận:\n`;
        failedOrders.forEach((order) => {
          summaryContent += `• ${order.orderNumber}: ${order.error}\n`;
        });
      }

      const summaryMessage = {
        id: Date.now() + 1000,
        role: "assistant",
        content: summaryContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, summaryMessage]);

      chatHistoryRef.current.push({
        role: "assistant",
        content: summaryContent,
      });

      if (successCount > 0) {
        toast.success(`Đã xác nhận ${successCount} đơn hàng thành công!`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} đơn hàng không thể xác nhận`);
      }
    } catch (error) {
      console.error("Error confirming all orders:", error);
      const errorMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: `❌ Không thể thực hiện xác nhận hàng loạt.\n` +
                 `Lỗi: ${error.message || "Lỗi không xác định"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error("Không thể xác nhận hàng loạt đơn hàng");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ChatHeader />
      <MessageList 
        messages={messages} 
        isLoading={isLoading} 
        messagesEndRef={messagesEndRef}
      />
      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        onKeyPress={handleKeyPress}
      />
    </div>
  );
}

