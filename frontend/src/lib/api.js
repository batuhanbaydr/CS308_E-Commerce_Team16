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
export const getOrderDetail = (orderId) => api.get(`/orders/${orderId}`);

export const pmGetOrderDetail = (orderId) =>
  api.get(`/admin/product/orders/${orderId}`);


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
// categories
// =====================


export function listCategoriesPublic() {
  return api.get("/categories");
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
export function getUserById(id) {
  return api.get(`/users/${id}`);
}
export function resolveUsers(ids) {
  const qs = ids.join(",");
  return api.get("/users/resolve", { params: { ids: qs } });
}


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

// ---------------- SALES ADMIN ----------------

/**
 * Apply discount to selected products
 * @param {number} discountPercent - Discount percentage (e.g., 10 for 10%)
 * @param {string[]} productIds - Array of product IDs
 * @param {boolean} notifyWishlist - Whether to notify wishlist users
 */
export function applyDiscount(discountPercent, productIds, notifyWishlist = true) {
  // Backend expects discountRate as decimal (0.15 = 15%)
  const discountRate = discountPercent / 100;
  return api.post("/admin/sales/discount", {
    productIds,
    discountRate,
    notifyWishlist, // Backend may use this to conditionally send emails
  });
}

/**
 * Get invoices by date range
 * @param {string} startDate - ISO date string (e.g., "2025-12-01")
 * @param {string} endDate - ISO date string (e.g., "2025-12-31")
 */
export function listInvoicesByDateRange(startDate, endDate) {
  // Convert to ISO instant format
  const start = new Date(startDate + "T00:00:00Z").toISOString();
  const end = new Date(endDate + "T23:59:59Z").toISOString();
  return api.get("/admin/sales/invoices", {
    params: { start, end },
  });
}

/**
 * Get revenue and profit summary with time series
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {string} groupBy - "day" | "week" | "month" (default: "day")
 */
export function getRevenueProfit(startDate, endDate, groupBy = "day") {
  const start = new Date(startDate + "T00:00:00Z").toISOString();
  const end = new Date(endDate + "T23:59:59Z").toISOString();
  return api.get("/admin/sales/revenue-profit", {
    params: { start, end, groupBy },
  });
}

/**
 * Download invoice PDF
 * @param {string} orderId - Order ID
 */
export function downloadInvoicePdf(orderId) {
  return api.get(`/admin/sales/invoices/${orderId}/pdf`, {
    responseType: "blob", // Important for binary data
  });
}

// ---------------- REFUND ADMIN ----------------

/**
 * List all refund requests (for Sales Manager)
 * @param {string} status - Optional: "REQUESTED" | "APPROVED" | "DENIED" | "REFUNDED"
 */
export function listRefunds(status = null) {
  const params = {};
  if (status) params.status = status;
  return api.get("/admin/refunds", { params });
}

/**
 * Decide on a refund request (approve or deny)
 * @param {string} refundId - Refund request ID
 * @param {boolean} approve - true to approve, false to deny
 * @param {string} managerNote - Optional note from manager
 */
export function decideRefund(refundId, approve, managerNote = "") {
  return api.put(`/admin/refunds/${refundId}/decision`, {
    approve,
    managerNote,
  });
}

/**
 * Mark a refund as completed (product returned, refund processed)
 * @param {string} refundId - Refund request ID
 */
export function markRefunded(refundId) {
  return api.put(`/admin/refunds/${refundId}/refund`);
}

// =======================
// SUPPORT / CHAT
// =======================

// customer or guest: start a conversation
export function startConversation(guestSessionId) {
  const body = guestSessionId ? { guestSessionId } : null;
  return api.post("/chat/start", body);
}

// Active conversations for support agents
export function supportListActiveConversations() {
  return api.get("/chat/active");
}

// Claim a conversation as the current agent (uses auth principal email)
export function supportClaimConversation(conversationId) {
  return api.post(`/chat/${conversationId}/claim`);
}

// Full message history for a conversation
export function supportGetConversationMessages(conversationId) {
  return api.get(`/chat/${conversationId}/messages`);
}

// Customer context (profile, cart, orders, wishlist, ...)
export function supportGetConversationContext(conversationId) {
  return api.get(`/chat/${conversationId}/context`);
}

// Upload attachment and get back an attachmentUrl
export function supportUploadChatAttachment(conversationId, file) {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`/chat/${conversationId}/attachment`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

// Added by Batu (not working currently)

// Send a new message in a conversation
export function supportSendMessage(conversationId, body) {
  // body: { text?: string, attachmentUrl?: string, attachmentName?: string }
  return api.post(`/chat/${conversationId}/messages`, body);
}

// ------- optional customer-specific helpers (if your backend has them) -----

export function supportEnsureCustomerConversation() {
  return api.post("/support/customer/conversation");
}

export function supportCustomerGetMessages(conversationId) {
  return api.get(`/support/customer/conversations/${conversationId}/messages`);
}

export function supportCustomerGetConversation(conversationId) {
  return api.get(`/support/customer/conversations/${conversationId}`);
}

export function supportCustomerUploadAttachment(conversationId, file) {
  const form = new FormData();
  form.append("file", file);
  return api.post(
    `/support/conversations/${conversationId}/attachments`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
}

// Customer sends a message ***
export function supportCustomerSendMessage(conversationId, body) {
  // body: { text?: string, attachmentUrl?: string, attachmentName?: string }
  return api.post(
    `/support/customer/conversations/${conversationId}/messages`,
    body
  );
}


export { api };
