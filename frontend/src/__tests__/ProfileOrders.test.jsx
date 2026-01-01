// src/__tests__/ProfileOrders.test.jsx

// Goal: displays orders list when orders are available
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Profile from "../pages/Profile.jsx";

const mockGetOrders = vi.fn();

vi.mock("../lib/api", () => ({
  meRequest: vi.fn().mockResolvedValue({
    data: {
      id: "user-1",
      name: "Test User",
      emailAddress: "test@example.com",
      addresses: [],
    },
  }),
  getAccountDetails: vi.fn().mockResolvedValue({
    data: {
      emailAddress: "test@example.com",
      phoneNumber: "5551234567",
    },
  }),
  getOrders: (...args) => mockGetOrders(...args),
  getReturns: vi.fn().mockResolvedValue({
    data: { content: [] },
  }),
  updateAccount: vi.fn(),
  changePassword: vi.fn(),
  createReturn: vi.fn(),
  updateProfile: vi.fn(),
  logoutRequest: vi.fn(),
}));

vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

describe("Profile page - Orders section", () => {
  beforeEach(() => {
    mockGetOrders.mockReset();
  });

  it("displays orders list when orders are available", async () => {
    mockGetOrders.mockResolvedValue({
      data: {
        content: [
          {
            id: "ORDER-1",
            createdAt: "2025-01-01T10:00:00Z",
            status: "DELIVERED",
            grandTotal: 199.99,
          },
          {
            id: "ORDER-2",
            createdAt: "2025-01-15T14:30:00Z",
            status: "PROCESSING",
            grandTotal: 149.50,
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    // Wait for orders to load (ORDER-1 appears in both list and dropdown)
    // Use findAllByText to handle multiple occurrences
    const order1Elements = await screen.findAllByText(/ORDER-1/i, {}, { timeout: 3000 });
    expect(order1Elements.length).toBeGreaterThan(0);
    
    // ORDER-2 should also appear
    const order2Elements = await screen.findAllByText(/ORDER-2/i, {}, { timeout: 3000 });
    expect(order2Elements.length).toBeGreaterThan(0);

    // Check for order statuses
    expect(await screen.findByText(/DELIVERED/i)).toBeInTheDocument();
    expect(await screen.findByText(/PROCESSING/i)).toBeInTheDocument();
  });

  it("displays 'No orders found' when orders list is empty", async () => {
    mockGetOrders.mockResolvedValue({
      data: { content: [] },
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    // Wait for empty state message
    expect(
      await screen.findByText(/No orders found/i)
    ).toBeInTheDocument();
  });
});

