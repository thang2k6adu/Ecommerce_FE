import axiosClient from "./axiosClient";

// Không try catch trong API Service để giữ code clean nhé
export const authAPI = {
  login: (data) => axiosClient.post("/api/auth/login", data),
  register: (data) => axiosClient.post("/api/auth/register", data),
  refreshToken: (refreshToken) => 
    axiosClient.post("/api/auth/refresh", { refresh_token: refreshToken }),
  logout: () => axiosClient.post("/api/auth/logout"),
};

