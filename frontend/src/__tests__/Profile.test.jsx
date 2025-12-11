// src/__tests__/Profile.test.jsx

// renders user name in the greeting when profile loads
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Profile from "../pages/Profile.jsx";

// ---- Mocks ----
vi.mock("../lib/api", () => ({
  meRequest: vi.fn().mockResolvedValue({
    data: {
      id: "1",
      name: "Zeynep Aksu",
      emailAddress: "zeynep@example.com",
      homeAddress: "Istanbul",
    },
  }),
  getAccountDetails: vi.fn().mockResolvedValue({
    data: {
      emailAddress: "zeynep@example.com",
      phoneNumber: "5551234567",
    },
  }),
  updateAccount: vi.fn().mockResolvedValue({}),
  changePassword: vi.fn().mockResolvedValue({}),
  getOrders: vi.fn().mockResolvedValue({ data: { content: [] } }),
  getReturns: vi.fn().mockResolvedValue({ data: { content: [] } }),
  createReturn: vi.fn().mockResolvedValue({}),
  updateProfile: vi.fn().mockResolvedValue({}),
  logoutRequest: vi.fn().mockResolvedValue({}),
}));

// Profile imports useCartDrawer from "../context/CartDrawerContext.jsx"
vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

describe("Profile page", () => {
  it("renders user name in the greeting when profile loads", async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    // The heading is: "Hi, Zeynep Aksu!"
    expect(
      await screen.findByText(/Hi,\s*Zeynep Aksu!/i)
    ).toBeInTheDocument();
  });
});
