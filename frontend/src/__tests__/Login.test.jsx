// src/__tests__/Login.test.jsx

// Goal: when I fill email+password and click “LOG IN”, we send the login request and navigate to /home.
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login.jsx";

// ---- mocks ----
const mockLoginRequest = vi.fn();
const mockMeRequest = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../lib/api", () => ({
  loginRequest: (...args) => mockLoginRequest(...args),
  meRequest: (...args) => mockMeRequest(...args),
}));

vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Login page", () => {
  beforeEach(() => {
    mockLoginRequest.mockReset();
    mockMeRequest.mockReset();
    mockNavigate.mockReset();
  });

  it("submits credentials, calls /login and /users/me, then navigates to /home", async () => {
    const user = userEvent.setup();

    mockLoginRequest.mockResolvedValue({ data: { token: "fake" } });
    mockMeRequest.mockResolvedValue({
      data: { id: "u1", name: "Test User", emailAddress: "test@example.com" },
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/e-mail/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "secret123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLoginRequest).toHaveBeenCalledWith(
        "test@example.com",
        "secret123"
      );
    });

    expect(mockMeRequest).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/home", {
        state: { user: expect.any(Object) },
      });
    });
  });

  it("shows error message from backend when login fails", async () => {
    const user = userEvent.setup();

    mockLoginRequest.mockRejectedValue({
      response: { data: { message: "Invalid credentials" } },
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/e-mail/i), "bad@example.com");
    await user.type(screen.getByPlaceholderText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/invalid credentials/i)
    ).toBeInTheDocument();
  });
});