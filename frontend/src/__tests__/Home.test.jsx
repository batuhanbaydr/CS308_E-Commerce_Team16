// src/__tests__/Home.test.jsx

// Goal: navigates to category page when category button is clicked
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Home from "../pages/Home.jsx";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../lib/api", () => ({
  meRequest: vi.fn().mockResolvedValue({
    data: { id: "user-1", name: "Test User" },
  }),
  logoutRequest: vi.fn(),
}));

vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

describe("Home page", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("navigates to sweatshirts category when SWEATSHIRTS button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    // Find and click the SWEATSHIRTS button
    const sweatshirtsButton = await screen.findByRole("button", {
      name: /sweatshirts/i,
    });

    await user.click(sweatshirtsButton);

    // Should navigate to category page
    expect(mockNavigate).toHaveBeenCalledWith("/category/sweatshirts");
  });

  it("navigates to shirts category when SHIRTS button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    const shirtsButton = await screen.findByRole("button", {
      name: /^shirts$/i,
    });

    await user.click(shirtsButton);

    expect(mockNavigate).toHaveBeenCalledWith("/category/shirts");
  });
});

