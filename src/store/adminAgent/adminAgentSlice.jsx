import { createSlice } from "@reduxjs/toolkit";
import {
  sendMessage,
  confirmOrder,
  listOrders,
  confirmAllOrders,
  getSystemPrompt,
} from "./thunks";

const initialState = {
  messages: [],
  inputText: "",
  isLoading: false,
  error: null,
  chatHistory: [{ role: "system", content: getSystemPrompt() }],
};

const adminAgentSlice = createSlice({
  name: "adminAgent",
  initialState,
  reducers: {
    setInputText: (state, action) => {
      state.inputText = action.payload;
    },
    clearInputText: (state) => {
      state.inputText = "";
    },
    addMessage: (state, action) => {
      const message = {
        id: action.payload.id || Date.now(),
        role: action.payload.role,
        content: action.payload.content,
        timestamp: action.payload.timestamp || new Date(),
      };
      state.messages.push(message);

      // Also add to chat history (without id and timestamp)
      state.chatHistory.push({
        role: message.role,
        content: message.content,
      });
    },
    updateMessage: (state, action) => {
      const { id, content } = action.payload;
      const messageIndex = state.messages.findIndex((msg) => msg.id === id);
      if (messageIndex !== -1) {
        state.messages[messageIndex].content = content;
      }
    },
    setInitialMessage: (state, action) => {
      state.messages = [action.payload];
    },
    clearMessages: (state) => {
      state.messages = [];
      state.chatHistory = [{ role: "system", content: getSystemPrompt() }];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        // The actual message handling is done in the component
        // because we need to handle different response types
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Confirm order
      .addCase(confirmOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(confirmOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        // Message will be added by component
      })
      .addCase(confirmOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // List orders
      .addCase(listOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(listOrders.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(listOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Confirm all orders
      .addCase(confirmAllOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(confirmAllOrders.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(confirmAllOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setInputText,
  clearInputText,
  addMessage,
  updateMessage,
  setInitialMessage,
  clearMessages,
  clearError,
} = adminAgentSlice.actions;

// Selectors
export const selectMessages = (state) => state.adminAgent?.messages || [];
export const selectInputText = (state) => state.adminAgent?.inputText || "";
export const selectIsLoading = (state) => state.adminAgent?.isLoading || false;
export const selectError = (state) => state.adminAgent?.error;
export const selectChatHistory = (state) => state.adminAgent?.chatHistory || [];

export default adminAgentSlice.reducer;

