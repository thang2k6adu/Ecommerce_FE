import { useRef, useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { getUserId } from "@/utils/auth";
import { getUser } from "@/utils/jwt-helper";
import { formatTime, formatDate } from "@/utils/date";
import {
  // Thunks
  loadChatUsers,
  loadChatHistory,
  // Actions
  setMessageText,
  setViewMode,
  setSearch,
  addMessage,
  updateLastMessage,
  // Selectors
  selectChatUsers,
  selectSelectedUser,
  selectMessages,
  selectMessageText,
  selectConnectionStatus,
  selectUnreadCounts,
  selectUsersLoading,
  selectUsersLoaded,
  selectMessagesLoading,
  selectViewMode,
  selectSearchQuery,
  selectFilteredUsers,
} from "@/store/chat";
import { messageAPI } from "@/api/message.api";

import {
  sendMessage,
  isConnected,
} from "@/sockets";
import { useChatWebSocket } from "./useChatSocket";


export function useAdminChat() {
  const dispatch = useDispatch();
  
  // Use individual selectors from the new chat reducer
  const users = useSelector(selectChatUsers);
  const selectedUser = useSelector(selectSelectedUser);
  const messages = useSelector(selectMessages);
  const messageText = useSelector(selectMessageText);
  const connectionStatus = useSelector(selectConnectionStatus);
  const unreadCounts = useSelector(selectUnreadCounts);
  const usersLoading = useSelector(selectUsersLoading);
  const usersLoaded = useSelector(selectUsersLoaded);
  const messagesLoading = useSelector(selectMessagesLoading);
  const viewMode = useSelector(selectViewMode);
  const searchQuery = useSelector(selectSearchQuery);
  const filteredUsers = useSelector(selectFilteredUsers);
  
  // Combined loading state for backward compatibility
  const loading = usersLoading || messagesLoading;

  const messagesEndRef = useRef(null);
  const currentUserId = useRef(null);
  const pendingMessages = useRef(new Map()); // Track optimistic messages by temp ID

  // Initialize current user ID
  useEffect(() => {
    const user = getUser();
    if (user) {
      currentUserId.current = user.id || user.userId || user._id;
    }
  }, []);

  // Load users from API - chỉ load nếu chưa loaded hoặc force refresh
  const fetchUsers = useCallback((forceRefresh = false) => {
    if (!forceRefresh && usersLoaded) {
      return; // Đã load rồi, không cần load lại
    }
    
    dispatch(loadChatUsers()).unwrap().catch(() => {
      toast.error("Failed to load users");
    });
  }, [dispatch, usersLoaded]);

  // Load chat history for a selected user
  const fetchChatHistory = useCallback(
    (user) => {
      dispatch(loadChatHistory(user)).unwrap().catch(() => {
        toast.error("Failed to load chat history");
      });
    },
    [dispatch]
  );

  // Handle incoming WebSocket messages
  const handleSocketMessage = useCallback(
    (type, data) => {
      if (type === "status") {
        if (data.status === "connected") toast.success("Connected to chat server");
        if (data.status === "error") toast.error("Chat connection error");
        return;
      }

      if (type === "message") {
        // Skip empty messages
        if (!data.content || !data.content.trim()) {
          return;
        }

        // Check if this is an echo of a message we just sent (to avoid duplicates)
        const isEchoFromMe = data.senderId === currentUserId.current;
        const selId = getUserId(selectedUser);
        
        // Check if we already have this message (to avoid duplicates from optimistic updates)
        const hasDuplicate = messages.some(
          (msg) =>
            msg.content &&
            msg.content.trim() &&
            msg.content === data.content &&
            msg.senderId === data.senderId &&
            msg.receiverId === data.receiverId &&
            Math.abs(new Date(msg.createdAt).getTime() - new Date(data.createdAt).getTime()) < 5000 // Within 5 seconds
        );

        // If this is an echo of our message and we already have it optimistically, skip it
        if (isEchoFromMe && hasDuplicate) {
          // This is an echo of a message we already added optimistically, skip it
          // Update user's last message but don't add duplicate
          dispatch(
            updateLastMessage({
              userId: data.senderId,
              content: data.content,
              createdAt: data.createdAt,
            })
          );
          return;
        }

        const newMsg = {
          id: data.id,
          content: data.content,
          senderId: data.senderId,
          receiverId: data.receiverId,
          createdAt: data.createdAt,
          read: data.read,
          isReceived: true,
        };

        if (selectedUser && selId === data.senderId && !isEchoFromMe) {
          // Message from selected user to me
          dispatch(addMessage(newMsg));
          // Mark as read
          messageAPI.markAsRead(data.senderId).catch(() => {
            toast.error("Failed to mark as read");
          });
        } else if (isEchoFromMe && selectedUser && selId === data.receiverId) {
          // Echo of my message - should not happen due to duplicate check above, but add just in case
          dispatch(addMessage(newMsg));
        } else {
          // Message from other users
          if (!hasDuplicate) {
            toast.success("New message received");
            dispatch(addMessage(newMsg)); // will update unreadCounts in slice
          }
        }

        // Update user's last message
        dispatch(
          updateLastMessage({
            userId: data.senderId,
            content: data.content,
            createdAt: data.createdAt,
          })
        );
      }
    },
    [dispatch, selectedUser, messages]
  );

  // Initialize WebSocket
  useChatWebSocket(handleSocketMessage, "admin-chat");

  // Load users on mount - chỉ load 1 lần duy nhất
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Send message
  const sendChatMessage = useCallback(() => {
    if (!messageText.trim() || !selectedUser) return;
    if (!isConnected()) {
      toast.error("Chat not connected");
      return;
    }

    // Ensure currentUserId is set
    if (!currentUserId.current) {
      const user = getUser();
      if (user) {
        currentUserId.current = user.id || user.userId || user._id;
      }
      if (!currentUserId.current) {
        toast.error("User ID not found. Please refresh the page.");
        return;
      }
    }

    const messageContent = messageText.trim();
    const payload = { receiverId: getUserId(selectedUser), content: messageContent };
    const ok = sendMessage(payload);
    if (!ok) return toast.error("Failed to send");

    // Add optimistic message with temporary ID
    const tempId = `temp-${Date.now()}`;
    const msg = {
      id: tempId,
      content: messageContent,
      senderId: currentUserId.current,
      receiverId: getUserId(selectedUser),
      createdAt: new Date().toISOString(),
      isSent: true,
    };
    dispatch(addMessage(msg));
    
    // Clear message text after sending
    dispatch(setMessageText(""));
    
    // Store temp ID for potential replacement
    pendingMessages.current.set(tempId, msg);
  }, [dispatch, messageText, selectedUser]);

  // Filter users based on search query

  return {
    users,
    filteredUsers,
    selectedUser,
    selectedUserId: getUserId(selectedUser),
    messages,
    messageText,
    connectionStatus,
    unreadCounts,
    loading,                    // Combined loading (backward compatibility)
    usersLoading,               // Loading riêng cho users
    messagesLoading,            // Loading riêng cho messages
    viewMode,
    searchQuery,

    // setters
    setMessageText: (text) => dispatch(setMessageText(text)),
    setViewMode: (mode) => dispatch(setViewMode(mode)),
    setSearchQuery: (query) => dispatch(setSearch(query)),

    // actions
    loadChatHistory: fetchChatHistory,
    loadChatUsers: fetchUsers,
    sendMessage: sendChatMessage,

    // utils
    messagesEndRef,
    formatDate,
    formatTime,
    getUserId,
    getUserKey: getUserId,
  };
}
