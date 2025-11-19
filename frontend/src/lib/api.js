// src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export function loginRequest(emailAddress, password) {
  // IMPORTANT: backend expects emailAddress
  return api.post("/auth/login", { emailAddress, password });
}

export function signupRequest(data) {
  return api.post("/auth/signup", data);
}

export function meRequest() {
  return api.get("/users/me");
}

export function updateProfile(name, homeAddress, emailAddress) {
  return api.put("/users/me", { name, homeAddress, emailAddress });
}

export function logoutRequest() {
  return api.post("/auth/logout");
}

// Account endpoints
export function getAccountDetails() {
  return api.get("/account");
}

export function updateAccount(emailAddress, phoneNumber) {
  return api.put("/account", { emailAddress, phoneNumber });
}

export function changePassword(currentPassword, newPassword) {
  return api.post("/account/change-password", { currentPassword, newPassword });
}

// Orders endpoints
export function getOrders(page = 0, size = 10) {
  return api.get("/orders", { params: { me: true, page, size } });
}

export function getOrderDetail(orderId) {
  return api.get(`/orders/${orderId}`);
}

// Returns endpoints
export function getReturns(page = 0, size = 10) {
  return api.get("/returns", { params: { me: true, page, size } });
}

export function createReturn(orderId, orderItemIds, reason) {
  return api.post("/returns", { orderId, orderItemIds, reason });
}

// Payment Methods endpoints
export function getPaymentMethods() {
  return api.get("/users/me/payment-methods");
}

export function addPaymentMethod(brand, last4, expMonth, expYear, holderName, nickname, isDefault = false, token = "") {
  return api.post("/users/me/payment-methods", {
    brand,
    last4,
    expMonth,
    expYear,
    holderName,
    nickname,
    isDefault,
    token
  });
}

export function updatePaymentMethod(pmId, holderName, expMonth, expYear, nickname, isDefault) {
  return api.put(`/users/me/payment-methods/${pmId}`, {
    holderName,
    expMonth,
    expYear,
    nickname,
    isDefault
  });
}

export function deletePaymentMethod(pmId) {
  return api.delete(`/users/me/payment-methods/${pmId}`);
}

export default api;
