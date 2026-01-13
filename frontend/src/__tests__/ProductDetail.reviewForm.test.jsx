// src/__tests__/ProductDetail.reviewForm.test.jsx

// Goal: Verifies that on ProductDetail page, the review form
// - requires a rating (shows error if missing)
// - calls the review API with correct payload
// - clears the comment after successful submit.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProductDetail from "../pages/ProductDetail.jsx";

// ---- mocks for lib/api ----
const mockMeRequest = vi.fn();
const mockFetchProduct = vi.fn();
const mockGetReviewsForProduct = vi.fn();
const mockCreateReview = vi.fn();

// single merged mock: match actual imports in ProductDetail.jsx
vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    meRequest: (...args) => mockMeRequest(...args),
    fetchProduct: (...args) => mockFetchProduct(...args),
    getReviewsForProduct: (...args) => mockGetReviewsForProduct(...args),
    createReview: (...args) => mockCreateReview(...args),
    // not used in this test, but imported by the component:
    listProducts: vi.fn().mockResolvedValue({ data: [] }),
    addToBasket: vi.fn(),
    logoutRequest: vi.fn(),
  };
});

// ---- mock CartDrawer context so ProductDetail can call useCartDrawer() ----
vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({
    openCart: vi.fn(),
  }),
}));

describe("ProductDetail – Review form", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // logged-in user so review form is visible
    mockMeRequest.mockResolvedValue({
      data: { id: "user-1", emailAddress: "user@example.com", name: "Test User" },
    });

    // product fetch
    mockFetchProduct.mockResolvedValue({
      data: {
        id: "prod-1",
        name: "Fancy Hoodie",
        basePrice: 120,
        variants: [],      // keep it simple
        sizes: [],
        imageUrls: [],
        mainImageUrl: null,
        category: null,
      },
    });

    // initial reviews: empty
    mockGetReviewsForProduct.mockResolvedValue({
      data: [],
    });

    // review creation
    mockCreateReview.mockResolvedValue({
      data: {
        id: "rev-1",
        rating: 5,
        comment: "Nice hoodie",
      },
    });
  });

  it("requires rating, calls API with product id and clears comment after submit", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/product/prod-1"]}>
        <Routes>
          <Route path="/product/:productId" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for product load / user load
    await waitFor(() => {
      expect(mockFetchProduct).toHaveBeenCalledWith("prod-1");
      expect(mockMeRequest).toHaveBeenCalled();
    });

    // Form elements
    const commentBox = await screen.findByPlaceholderText(
      /tell us what you liked or disliked/i
    );

    const submitBtn = await screen.findByRole("button", {
      name: /submit review/i,
    });

    // Button is enabled (component only disables while submitting)
    expect(submitBtn).toBeEnabled();

    // 1) Try submitting with no rating -> error message
    await user.click(submitBtn);

    await screen.findByText(/please select a rating between 1 and 5/i);

    // 2) Now set rating + comment and submit
    const ratingButton = await screen.findByRole("button", {
      name: /5 stars/i,
    });

    await user.click(ratingButton);
    await user.type(commentBox, "Nice hoodie");

    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateReview).toHaveBeenCalledWith({
        productId: "prod-1",
        rating: 5,
        comment: "Nice hoodie",
      });
    });

    // After successful submit, comment is cleared
    expect(commentBox.value).toBe("");
  });
});