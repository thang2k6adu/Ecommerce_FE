import { combineReducers, configureStore } from "@reduxjs/toolkit";
import productReducer from "./features/product";
import orderReducer from "./features/order";
import cartReducer from "./features/cart";
// import categoryReducer from "./features/category";
import commonReducer from "./features/common";
import userReducer from "./features/user";
import userProfileReducer from "./userProfileSlice";
import productSlice from "./productSlice";
import authSlice from "./authSlice";
import resourceSlice from "./resourceSlice";
import uploadSlice from "./uploadSlice";
import categorySlice from "./categorySlice";
import adminUserSlice from "./adminUserSlice";
import categoryTypeSlice from "./categoryTypeSlice";
import userProfileSlice from "./userProfileSlice";
import addressSlice from "./addressSlice";
import chatSlice from "./chat";
import adminAgentSlice from "./adminAgent/adminAgentSlice";

const rootReducer = combineReducers({
  productState: productReducer,
  orderState: orderReducer,
  cartState: cartReducer,
  categoryState: categorySlice,
  commonState: commonReducer,
  userState: userReducer,
  userProfile: userProfileReducer,
  productSlice: productSlice,
  authSlice: authSlice,
  resourceSlice: resourceSlice,
  uploadSlice: uploadSlice,
  // categorySlice: categorySlice,
  adminUsers: adminUserSlice,
  categoryTypeSlice: categoryTypeSlice,
  userProfileSlice: userProfileSlice,
  addressState: addressSlice,

  chat: chatSlice,
  adminAgent: adminAgentSlice,
});

const store = configureStore({
  reducer: rootReducer,
});

export default store;
