import { useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import ChatHeader from "./components/ChatHeader";
import MessageList from "./components/MessageList";
import ChatInput from "./components/ChatInput";
import {
  selectMessages,
  selectInputText,
  selectIsLoading,
  selectChatHistory,
  setInputText,
  clearInputText,
  addMessage,
  updateMessage,
  setInitialMessage,
} from "@/store/adminAgent/adminAgentSlice";
import {
  sendMessage,
  confirmOrder,
  listOrders,
  confirmAllOrders,
} from "@/store/adminAgent/thunks";

export default function AdminAgent() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const messages = useSelector(selectMessages);
  const inputText = useSelector(selectInputText);
  const isLoading = useSelector(selectIsLoading);
  const chatHistory = useSelector(selectChatHistory);
  const messagesEndRef = useRef(null);

  // Initialize with greeting message
  useEffect(() => {
    if (messages.length === 0) {
      dispatch(
        setInitialMessage({
          id: 1,
          role: "assistant",
          content: t("admin.agent.greeting"),
          timestamp: new Date(),
        })
      );
    }
  }, [dispatch, t, messages.length]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleConfirmOrder = async (orderId) => {
    try {
      // Add info message
      const infoMessageId = Date.now();
      dispatch(
        addMessage({
          id: infoMessageId,
          role: "assistant",
          content: `Đang kiểm tra đơn hàng #${orderId}...\nĐang xác nhận đơn hàng...`,
          timestamp: new Date(),
        })
      );

      const result = await dispatch(confirmOrder(orderId)).unwrap();

      // Update info message with order details
      dispatch(
        updateMessage({
          id: infoMessageId,
          content: `Đang kiểm tra đơn hàng #${orderId}...\n` +
            `Số đơn: ${result.orderNumber}\n` +
            `Trạng thái: ${result.status}\n` +
            `Tổng tiền: ${result.totalAmount}\n\n` +
            `Đang xác nhận đơn hàng...`,
        })
      );

      // Add success message
      dispatch(
        addMessage({
          id: Date.now() + 1,
          role: "assistant",
          content: `✅ Đã xác nhận đơn hàng #${orderId} thành công!\n` +
            `Trạng thái đã được cập nhật từ PENDING sang SHIPPING.`,
          timestamp: new Date(),
        })
      );

      toast.success("Đã xác nhận đơn hàng thành công!");
    } catch (error) {
      dispatch(
        addMessage({
          id: Date.now() + 1,
          role: "assistant",
          content: `❌ Không thể xác nhận đơn hàng #${orderId}.\n` +
            `Lỗi: ${error || "Đơn hàng không tồn tại hoặc đã được xử lý."}`,
          timestamp: new Date(),
        })
      );
      toast.error("Không thể xác nhận đơn hàng");
    }
  };

  const handleListOrders = async () => {
    try {
      const result = await dispatch(listOrders()).unwrap();
      const { pendingOrders } = result;

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

      dispatch(
        addMessage({
          id: Date.now(),
          role: "assistant",
          content: content,
          timestamp: new Date(),
        })
      );
    } catch (error) {
      toast.error("Không thể tải danh sách đơn hàng");
      dispatch(
        addMessage({
          id: Date.now(),
          role: "assistant",
          content: `❌ Không thể tải danh sách đơn hàng: ${error}`,
          timestamp: new Date(),
        })
      );
    }
  };

  const handleConfirmAllOrders = async () => {
    try {
      // Start message
      dispatch(
        addMessage({
          id: Date.now(),
          role: "assistant",
          content: "🔄 Đang lấy danh sách các đơn hàng chưa được xác nhận...",
          timestamp: new Date(),
        })
      );

      const result = await dispatch(confirmAllOrders()).unwrap();
      const { pendingOrders, results } = result;

      if (pendingOrders.length === 0) {
        dispatch(
          addMessage({
            id: Date.now() + 1,
            role: "assistant",
            content: "✅ Không có đơn hàng nào đang chờ xác nhận.",
            timestamp: new Date(),
          })
        );
        toast.success("Không có đơn hàng nào cần xác nhận");
        return;
      }

      // Info message
      dispatch(
        addMessage({
          id: Date.now() + 2,
          role: "assistant",
          content: `📦 Tìm thấy ${pendingOrders.length} đơn hàng đang chờ xác nhận.\n` +
            `Đang bắt đầu xác nhận từng đơn hàng...\n\n`,
          timestamp: new Date(),
        })
      );

      // Progress messages
      const progressMessageIds = [];
      for (let i = 0; i < pendingOrders.length; i++) {
        const order = pendingOrders[i];
        const progressMessageId = Date.now() + 3 + i;
        progressMessageIds.push(progressMessageId);

        dispatch(
          addMessage({
            id: progressMessageId,
            role: "assistant",
            content: `⏳ [${i + 1}/${pendingOrders.length}] Đang xác nhận đơn hàng ${order.orderNumber || order.id}...`,
            timestamp: new Date(),
          })
        );
      }

      // Update progress messages based on results
      results.forEach((result, index) => {
        const progressMessageId = progressMessageIds[index];
        const order = pendingOrders[index];

        if (result.success) {
          dispatch(
            updateMessage({
              id: progressMessageId,
              content: `✅ [${index + 1}/${pendingOrders.length}] Đã xác nhận đơn hàng ${result.orderNumber || order.id}`,
            })
          );
        } else {
          dispatch(
            updateMessage({
              id: progressMessageId,
              content: `❌ [${index + 1}/${pendingOrders.length}] Không thể xác nhận đơn hàng ${result.orderNumber || order.id}: ${result.error || "Lỗi không xác định"}`,
            })
          );
        }
      });

      // Summary
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;
      const failedOrders = results.filter((r) => !r.success);

      let summaryContent = `\n📊 Tổng kết:\n` +
        `✅ Thành công: ${successCount}/${pendingOrders.length} đơn hàng\n` +
        `❌ Thất bại: ${failCount}/${pendingOrders.length} đơn hàng\n`;

      if (failedOrders.length > 0) {
        summaryContent += `\n⚠️ Các đơn hàng không thể xác nhận:\n`;
        failedOrders.forEach((result) => {
          summaryContent += `• ${result.orderNumber}: ${result.error}\n`;
        });
      }

      dispatch(
        addMessage({
          id: Date.now() + 1000,
          role: "assistant",
          content: summaryContent,
          timestamp: new Date(),
        })
      );

      if (successCount > 0) {
        toast.success(`Đã xác nhận ${successCount} đơn hàng thành công!`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} đơn hàng không thể xác nhận`);
      }
    } catch (error) {
      dispatch(
        addMessage({
          id: Date.now() + 1,
          role: "assistant",
          content: `❌ Không thể thực hiện xác nhận hàng loạt.\n` +
            `Lỗi: ${error || "Lỗi không xác định"}`,
          timestamp: new Date(),
        })
      );
      toast.error("Không thể xác nhận hàng loạt đơn hàng");
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    dispatch(addMessage(userMessage));
    dispatch(clearInputText());

    try {
      const result = await dispatch(
        sendMessage({ inputText: inputText.trim(), chatHistory })
      ).unwrap();

      // Handle different response types
      if (result.type === "confirmOrder") {
        await handleConfirmOrder(result.orderId);
        return;
      }

      if (result.type === "bulkConfirm") {
        await handleConfirmAllOrders();
        return;
      }

      if (result.type === "listOrders") {
        await handleListOrders();
        return;
      }

      if (result.type === "aiConfirmOrder") {
        // Add AI response first
        dispatch(
          addMessage({
            id: Date.now() + 1,
            role: "assistant",
            content: result.response,
            timestamp: new Date(),
          })
        );
        // Then confirm order
        await handleConfirmOrder(result.orderId);
        return;
      }

      if (result.type === "aiResponse") {
        dispatch(
          addMessage({
            id: Date.now() + 1,
            role: "assistant",
            content: result.response,
            timestamp: new Date(),
          })
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Không thể kết nối với AI. Vui lòng thử lại.");

      dispatch(
        addMessage({
          id: Date.now() + 1,
          role: "assistant",
          content: "Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại.",
          timestamp: new Date(),
        })
      );
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
        setInputText={(text) => dispatch(setInputText(text))}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        onKeyPress={handleKeyPress}
      />
    </div>
  );
}
