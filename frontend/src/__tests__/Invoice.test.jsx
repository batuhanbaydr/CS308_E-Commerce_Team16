// src/__tests__/Invoice.test.jsx

//shows 'Invoice not found.' when order data is missing
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Invoice from "../pages/Invoice.jsx";

vi.mock("../lib/api", () => ({
  meRequest: vi.fn().mockResolvedValue({
    data: { id: "user-1", name: "Test User" },
  }),
  getOrderDetail: vi.fn().mockResolvedValue({
    data: null,   // 👈 no order found
  }),
}));


vi.mock("../context/CartDrawerContext", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

describe("Invoice page", () => {
  it("shows 'Invoice not found.' when order data is missing", async () => {
    render(
      <MemoryRouter initialEntries={["/invoice/123"]}>
        <Routes>
          <Route path="/invoice/:orderId" element={<Invoice />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Invoice not found\./i)
    ).toBeInTheDocument();
  });
});
