// src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------------- AUTH ----------------

export function loginRequest(emailAddress, password) {
  // backend expects { emailAddress, password }
  return api.post("/auth/login", { emailAddress, password });
}

export function signupRequest(data) {
  // { name, emailAddress, password, homeAddress }
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

// ---------------- ACCOUNT ----------------

export function getAccountDetails() {
  return api.get("/account");
}

export function updateAccount(emailAddress, phoneNumber) {
  return api.put("/account", { emailAddress, phoneNumber });
}

export function changePassword(currentPassword, newPassword) {
  return api.post("/account/change-password", {
    currentPassword,
    newPassword,
  });
}

// ---------------- ORDERS ----------------

export function getOrders(page = 0, size = 10) {
  return api.get("/orders", { params: { me: true, page, size } });
}

export function getOrderDetail(orderId) {
  return api.get(`/orders/${orderId}`);
}

// ---------------- RETURNS ----------------

export function getReturns(page = 0, size = 10) {
  return api.get("/returns", { params: { me: true, page, size } });
}

export function createReturn(orderId, orderItemIds, reason) {
  return api.post("/returns", { orderId, orderItemIds, reason });
}

// ---------------- PAYMENT METHODS ----------------

export function getPaymentMethods() {
  return api.get("/users/me/payment-methods");
}

export function addPaymentMethod(
  brand,
  last4,
  expMonth,
  expYear,
  holderName,
  nickname,
  isDefault = false,
  token = ""
) {
  return api.post("/users/me/payment-methods", {
    brand,
    last4,
    expMonth,
    expYear,
    holderName,
    nickname,
    isDefault,
    token,
  });
}

export function updatePaymentMethod(
  pmId,
  holderName,
  expMonth,
  expYear,
  nickname,
  isDefault
) {
  return api.put(`/users/me/payment-methods/${pmId}`, {
    holderName,
    expMonth,
    expYear,
    nickname,
    isDefault,
  });
}

export function deletePaymentMethod(pmId) {
  return api.delete(`/users/me/payment-methods/${pmId}`);
}

// ---------------- PRODUCTS ----------------

export function listProducts(category) {
  const params = {};
  if (category) {
    params.category = category; // ?category=SWEATSHIRTS, etc.
  }
  return api.get("/products", { params });
}

export function fetchProduct(productId) {
  return api.get(`/products/${productId}`);
}

// ===================================================
//                     BASKET
// ===================================================

// small helper so we always send userId/cartId in the same way
function buildBasketParams(userId, cartId) {
  const params = {};
  if (userId) params.userId = userId;
  if (cartId) params.cartId = cartId;
  return params;
}

/**
 * GET /api/basket?userId=...&cartId=...
 * usage from Cart.jsx:
 *   getBasket({ userId: user.id, cartId })
 */
export function getBasket({ userId, cartId } = {}) {
  return api.get("/basket", {
    params: buildBasketParams(userId, cartId),
  });
}

/**
 * POST /api/basket/items
 * body: { productId, sku, quantity }
 * usage:
 *   addToBasket({ userId, cartId, productId, sku, quantity })
 */
export function addToBasket({ userId, cartId, productId, sku, quantity }) {
  const body = { productId, sku, quantity };
  const params = buildBasketParams(userId, cartId);
  return api.post("/basket/items", body, { params });
}

/**
 * PUT /api/basket/items
 * body: { productId, sku, quantity }
 * usage:
 *   updateBasketItem({ userId, cartId, productId, sku, quantity })
 */
export function updateBasketItem({
  userId,
  cartId,
  productId,
  sku,
  quantity,
}) {
  const body = { productId, sku, quantity };
  const params = buildBasketParams(userId, cartId);
  return api.put("/basket/items", body, { params });
}

/**
 * DELETE /api/basket/items/{productId}/{sku}
 * usage:
 *   removeBasketItem({ userId, cartId, productId, sku })
 */
export function removeBasketItem({ userId, cartId, productId, sku }) {
  const params = buildBasketParams(userId, cartId);
  return api.delete(`/basket/items/${productId}/${sku}`, { params });
}

export default api;
