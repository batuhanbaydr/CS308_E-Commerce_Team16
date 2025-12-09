// src/__tests__/SignUp.test.jsx

// Goal: If passwords don’t match, we don’t call backend; instead we show an error.
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SignUp from "../pages/SignUp.jsx";

const mockSignupRequest = vi.fn();

vi.mock("../lib/api", () => ({
  signupRequest: (...args) => mockSignupRequest(...args),
}));

vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

describe("SignUp page", () => {
  beforeEach(() => {
    mockSignupRequest.mockReset();
  });

  it("shows 'Passwords do not match' and does not call signup when passwords differ", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/your name/i), "New User");
    await user.type(screen.getByPlaceholderText(/^e-mail$/i), "new@example.com");
    await user.type(screen.getByPlaceholderText(/^password$/i), "secret123");
    await user.type(
      screen.getByPlaceholderText(/confirm password/i),
      "different"
    );
    await user.type(
      screen.getByPlaceholderText(/home address/i),
      "Random Street 12"
    );

    await user.click(
      screen.getByRole("button", { name: /sign up/i })
    );

    expect(mockSignupRequest).not.toHaveBeenCalled();
    expect(
      screen.getByText(/passwords do not match/i)
    ).toBeInTheDocument();
  });
});