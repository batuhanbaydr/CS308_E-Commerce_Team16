// src/__tests__/ProductDetail.reviews.test.jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProductDetail from "../pages/ProductDetail.jsx";

vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

const mockFetchProduct = vi.fn();
const mockListProducts = vi.fn();
const mockMeRequest = vi.fn();
const mockAddToBasket = vi.fn();
const mockLogoutRequest = vi.fn();
const mockGetReviews = vi.fn();
const mockCreateReview = vi.fn();

vi.mock("../lib/api", () => ({
  fetchProduct: (...args) => mockFetchProduct(...args),
  listProducts: (...args) => mockListProducts(...args),
  meRequest: (...args) => mockMeRequest(...args),
  addToBasket: (...args) => mockAddToBasket(...args),
  logoutRequest: (...args) => mockLogoutRequest(...args),
  getReviewsForProduct: (...args) => mockGetReviews(...args),
  createReview: (...args) => mockCreateReview(...args),
}));

describe("ProductDetail - review submission", () => {
  beforeEach(() => {
    mockFetchProduct.mockReset();
    mockListProducts.mockReset();
    mockMeRequest.mockReset();
    mockAddToBasket.mockReset();
    mockGetReviews.mockReset();
    mockCreateReview.mockReset();

    mockMeRequest.mockResolvedValue({
      data: {
        id: "user-1",
        name: "Reviewer",
        emailAddress: "rev@example.com",
      },
    });

    mockFetchProduct.mockResolvedValue({
      data: {
        id: "prod-1",
        name: "Test Shirt",
        basePrice: "30.00",
        mainImageUrl: "",
        imageUrls: [],
        category: "shirts",
        variants: [],
      },
    });

    // related products: just return empty list so .then() works
    mockListProducts.mockResolvedValue({ data: [] });

    // first call: initial load (no reviews)
    // second call: after successful submission (1 review)
    mockGetReviews
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          {
            id: "r1",
            rating: 4,
            comment: "Nice!",
            commentStatus: "APPROVED",
          },
        ],
      });

    mockCreateReview.mockResolvedValue({
      data: { id: "r1" },
    });
  });

  it("sends rating+comment and refreshes reviews", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/product/prod-1"]}>
        <Routes>
          <Route path="/product/:productId" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // wait for product + initial reviews
    await waitFor(() =>
      expect(mockFetchProduct).toHaveBeenCalledWith("prod-1")
    );
    await waitFor(() =>
      expect(mockGetReviews).toHaveBeenCalledWith("prod-1")
    );

    // select 4 stars (aria-label from component: "4 stars")
    await user.click(
      screen.getByRole("button", { name: /4 stars/i })
    );

    // textarea: just grab the only textbox
    const commentInput = screen.getByRole("textbox");
    await user.type(commentInput, "Really nice product");

    await user.click(
      screen.getByRole("button", { name: /submit review/i })
    );

    // createReview called with correct payload
    await waitFor(() => {
      expect(mockCreateReview).toHaveBeenCalledTimes(1);
    });

    const payload = mockCreateReview.mock.calls[0][0];
    expect(payload).toMatchObject({
      productId: "prod-1",
      rating: 4,
      comment: "Really nice product",
    });

    // should re-fetch reviews
    await waitFor(() => {
      expect(mockGetReviews).toHaveBeenCalledTimes(2);
    });

    // the second getReviews returns "Nice!" -> should be visible
    expect(
      await screen.findByText(/nice!/i)
    ).toBeInTheDocument();
  });
});