// src/lib/api.js
import axios from "axios";

/**
 * Axios client
 * - baseURL already includes "/api"
 * - withCredentials: true (cookie-based auth)
 */
const api = axios.create({
  baseURL: "http://localhost:8080/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Small helper: sleep
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Small helper: retry wrapper
 * Only used where cookie/session may not be immediately ready right after login/logout.
 */
async function withRetry(fn, { retries = 2, delayMs = 120 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const status = e?.response?.status;

      // Retry only on auth-ish failures where cookie might not be established yet
      const shouldRetry = status === 401 || status === 403;

      if (!shouldRetry || i === retries) break;

      await sleep(delayMs * (i + 1)); // backoff: 120ms, 240ms, 360ms...
    }
  }
  throw lastErr;
}

// =====================
// AUTH
// =====================

export function loginRequest(emailAddress, password) {
  return api.post("/auth/login", { emailAddress, password });
}

export function logoutRequest() {
  return api.post("/auth/logout");
}

export function signupRequest(data) {
  // data: { name, emailAddress, password, homeAddress }
  return api.post("/auth/signup", data);
}

/**
 * FIX: /users/me can sometimes 401/403 immediately after login
 * due to cookie/session timing. We retry a couple of times quickly.
 */
export function meRequest() {
  return withRetry(() => api.get("/users/me"), { retries: 2, delayMs: 150 });
}

export function updateProfile(profile) {
  // profile: { name, homeAddress, emailAddress, addresses: [...] }
  return api.put("/users/me", profile);
}

// =====================
// ACCOUNT
// =====================

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

// =====================
// ORDERS
// =====================

export function getOrders(page = 0, size = 10) {
  return api.get("/orders", { params: { me: true, page, size } });
}

export function getOrderDetail(orderId) {
  return api.get(`/orders/${orderId}`);
}

// =====================
// RETURNS
// =====================

export function getReturns(page = 0, size = 10) {
  return api.get("/returns", { params: { me: true, page, size } });
}

export function createReturn(orderId, orderItemIds, reason) {
  return api.post("/returns", { orderId, orderItemIds, reason });
}

// =====================
// PAYMENT METHODS
// =====================

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

// =====================
// PRODUCTS
// =====================

export function listProducts(category) {
  const params = {};
  if (category) params.category = category;
  return api.get("/products", { params });
}

export function fetchProduct(productId) {
  return api.get(`/products/${productId}`);
}

// ===================================================
// BASKET
// ===================================================

function buildBasketParams(userId, cartId) {
  const params = {};
  if (userId) params.userId = userId;
  if (cartId) params.cartId = cartId;
  return params;
}

export function getBasket({ userId, cartId } = {}) {
  return api.get("/basket", {
    params: buildBasketParams(userId, cartId),
  });
}

export function addToBasket({ userId, cartId, productId, sku, quantity }) {
  const body = { productId, sku, quantity };
  const params = buildBasketParams(userId, cartId);
  return api.post("/basket/items", body, { params });
}

export function updateBasketItem({ userId, cartId, productId, sku, quantity }) {
  const body = { productId, sku, quantity };
  const params = buildBasketParams(userId, cartId);
  return api.put("/basket/items", body, { params });
}

export function removeBasketItem({ userId, cartId, productId, sku }) {
  const params = buildBasketParams(userId, cartId);
  return api.delete(`/basket/items/${productId}/${sku}`, { params });
}

export function attachCartToUser(cartId) {
  return api.post("/basket/attach", null, { params: { cartId } });
}

// =====================
// REVIEWS
// =====================

export const getReviewsForProduct = (productId) =>
  api.get(`/reviews/product/${productId}`);

export const createReview = (payload) => api.post("/reviews", payload);

// ===================================================
// MOCK CHECKOUT + PAYMENT
// ===================================================

export function checkout(
  cartId,
  shipping,
  billing,
  paymentDetails,
  useSameAddress = true
) {
  const cardNumber = paymentDetails.cardNumber?.replace(/\s/g, "") || "";
  const cardLast4 = cardNumber.slice(-4);
  const expiryParts = paymentDetails.expiryDate?.split("/") || [];
  const cardExpMonth = parseInt(expiryParts[0], 10) || 0;
  const cardExpYearRaw = parseInt(expiryParts[1], 10) || 0;
  const cardExpYear = cardExpYearRaw ? 2000 + cardExpYearRaw : 0;

  let cardBrand = "VISA";
  if (cardNumber.startsWith("5")) cardBrand = "MASTERCARD";
  if (cardNumber.startsWith("3")) cardBrand = "AMEX";

  return api.post("/checkout", {
    cartId,
    // Shipping
    shippingFullName: shipping.fullName,
    shippingLine1: shipping.line1,
    shippingLine2: shipping.line2 || "",
    shippingCity: shipping.city,
    shippingState: shipping.state,
    shippingCountry: shipping.country,
    shippingZipCode: shipping.zipCode,
    shippingPhoneNumber: shipping.phoneNumber,
    // Billing
    useShippingAsBilling: useSameAddress,
    billingFullName: billing.fullName,
    billingLine1: billing.line1,
    billingLine2: billing.line2 || "",
    billingCity: billing.city,
    billingState: billing.state,
    billingCountry: billing.country,
    billingZipCode: billing.zipCode,
    billingPhoneNumber: billing.phoneNumber,
    // Payment
    cardHolderName: paymentDetails.holderName,
    cardBrand,
    cardLast4,
    cardExpMonth,
    cardExpYear,
  });
}

// =====================
// WISHLIST
// =====================

export function getWishlist() {
  return api.get("/wishlist");
}

export function addWishlistItem(productId) {
  return api.post(`/wishlist/items/${productId}`);
}

export function removeWishlistItem(productId) {
  return api.delete(`/wishlist/items/${productId}`);
}

export function clearWishlist() {
  return api.delete("/wishlist");
}

// =======================
// PRODUCT MANAGER (ADMIN)
// =======================

export const pmListProducts = () => api.get("/admin/product/products");
export const pmCreateProduct = (payload) =>
  api.post("/admin/product/products", payload);
export const pmUpdateProduct = (id, payload) =>
  api.put(`/admin/product/products/${id}`, payload);
export const pmDeleteProduct = (id) =>
  api.delete(`/admin/product/products/${id}`);

export const pmSetVariantStock = (id, sku, stock) =>
  api.patch(`/admin/product/products/${id}/variants/${sku}/stock`, null, {
    params: { stock },
  });

export function pmListCategories() {
  return api.get("/admin/product/categories");
}

export function pmCreateCategory(name) {
  return api.post("/admin/product/categories", { name });
}

export function pmDeleteCategory(id) {
  return api.delete(`/admin/product/categories/${id}`);
}

export function pmListOrders() {
  return api.get("/admin/product/orders");
}

export function pmUpdateOrderStatus(orderId, status) {
  return api.patch(`/admin/product/orders/${orderId}/status`, null, {
    params: { status },
  });
}

// Reviews moderation (Product Manager)
export function pmListPendingReviews() {
  return api.get("/reviews/pending");
}

export function pmApproveReview(reviewId) {
  return api.post(`/reviews/${reviewId}/approve`);
}

export function pmRejectReview(reviewId, moderationNote = null) {
  return api.post(
    `/reviews/${reviewId}/reject`,
    moderationNote ? { moderationNote } : null
  );
}

export function pmUpdateReviewStatus(reviewId, status) {
  return api.patch(`/reviews/${reviewId}/status`, null, {
    params: { status },
  });
}

export function pmUpdateReviewStatusBody(reviewId, status) {
  return api.patch(`/reviews/${reviewId}/status`, { status });
}

export function pmDeleteReview(reviewId) {
  return api.delete(`/reviews/${reviewId}`);
}

export { api };
