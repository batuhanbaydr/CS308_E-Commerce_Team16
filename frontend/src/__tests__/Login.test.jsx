// src/__tests__/Login.test.jsx

// Goal: when I fill email+password and click "LOG IN", we send the login request and navigate to /home.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Login from "../pages/Login.jsx";
import { AuthProvider } from "../context/AuthContext";

// ---- mocks ----
const mockLoginRequest = vi.fn();
const mockMeRequest = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../lib/api", () => ({
  loginRequest: (...args) => mockLoginRequest(...args),
  meRequest: (...args) => mockMeRequest(...args),
  logoutRequest: vi.fn(),
}));

vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Login page", () => {
  beforeEach(() => {
    mockLoginRequest.mockReset();
    mockMeRequest.mockReset();
    mockNavigate.mockReset();
  });

  it("submits credentials, calls /login and /users/me, then navigates to /home", async () => {
    const user = userEvent.setup();

    mockLoginRequest.mockResolvedValue({ data: { token: "fake" } });

    // AuthProvider may call meRequest on mount, and Login calls it again after login.
    mockMeRequest.mockResolvedValue({
      data: { id: "u1", name: "Test User", emailAddress: "test@example.com" },
    });

    renderLogin();

    await user.type(screen.getByPlaceholderText(/e-mail/i), "test@example.com");
    await user.type(screen.getByPlaceholderText(/password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLoginRequest).toHaveBeenCalledWith("test@example.com", "secret123");
    });

 
    await waitFor(() => {
      expect(mockMeRequest).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/home", { replace: true });
    });
  });

  it("shows error message from backend when login fails", async () => {
    const user = userEvent.setup();

    mockLoginRequest.mockRejectedValue({
      response: { data: { message: "Invalid credentials" } },
    });

    // If AuthProvider calls meRequest on mount, let it resolve harmlessly
    mockMeRequest.mockResolvedValue({ data: null });

    renderLogin();

    await user.type(screen.getByPlaceholderText(/e-mail/i), "bad@example.com");
    await user.type(screen.getByPlaceholderText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith("/home");
  });
});
