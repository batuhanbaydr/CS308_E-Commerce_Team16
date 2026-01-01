import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login.jsx";

// ---- mocks ----
const mockNavigate = vi.fn();
const mockLogin = vi.fn();

vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: null,
    login: (...args) => mockLogin(...args),
    logout: vi.fn(),
  }),
}));

vi.mock("../lib/api", () => ({
  attachCartToUser: vi.fn(), // keep it mocked; we won’t use it in this test
}));

// mock router hooks used by Login.jsx
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    // ✅ No ?next= param in this test, so redirect uses role default
    useSearchParams: () => [new URLSearchParams("")],
  };
});

describe("Login role-based redirection", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogin.mockReset();

    // ensure no guest cart is attached during the test
    window.localStorage.removeItem("tidl_cart_id");
  });

  const cases = [
    ["PRODUCT_MANAGER", "/backoffice/product-manager"],
    ["SALES_MANAGER", "/backoffice/sales-manager"],
    ["SUPPORT_AGENT", "/backoffice/support-manager"],
  ];

  it.each(cases)(
    "redirects %s to %s (not /home)",
    async (role, expectedPath) => {
      const user = userEvent.setup();

      mockLogin.mockResolvedValueOnce({
        id: "u1",
        name: "Admin User",
        emailAddress: "admin@example.com",
        role,
        roles: [role],
      });

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <Login />
        </MemoryRouter>
      );

      await user.type(screen.getByPlaceholderText(/e-mail/i), "admin@example.com");
      await user.type(screen.getByPlaceholderText(/password/i), "secret123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("admin@example.com", "secret123");
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(expectedPath, { replace: true });
      });

      // extra safety: ensure it didn't go to /home
      expect(mockNavigate).not.toHaveBeenCalledWith("/home", expect.anything());
    }
  );
});
