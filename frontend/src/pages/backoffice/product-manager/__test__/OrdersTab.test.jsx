import { render, screen, waitFor } from "@testing-library/react";
import OrdersTab from "../tabs/OrdersTab";

import { pmListOrders } from "../../../../lib/api";
vi.mock("../../../../lib/api", async () => {
  const actual = await vi.importActual("../../../../lib/api");
  return {
    ...actual,
    pmListOrders: vi.fn(),
    pmUpdateOrderStatus: vi.fn(),
  };
});


describe("OrdersTab – status dropdown", () => {
  it("includes CART and non-delivery statuses", async () => {
    pmListOrders.mockResolvedValueOnce({
      data: [
        {
          id: "order-2",
          status: "CART",
          items: [],
          createdAt: "2025-01-01T10:00:00Z",
        },
      ],
    });

    render(<OrdersTab />);

    await waitFor(() =>
      expect(screen.getByText("Orders")).toBeInTheDocument()
    );

    const select = screen.getByRole("combobox");

    expect(select).toHaveTextContent("CART");
    expect(select).toHaveTextContent("PAID");
    expect(select).toHaveTextContent("DELIVERED");
  });
});
