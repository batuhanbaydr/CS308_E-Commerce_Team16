import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeliveriesTab from "../tabs/Deliveries";
import { pmListOrders } from "../../../../lib/api";

vi.mock("../../../../lib/api", async () => {
  const actual = await vi.importActual("../../../../lib/api");
  return {
    ...actual,
    pmListOrders: vi.fn(),
    pmUpdateOrderStatus: vi.fn(),
  };
});


describe("DeliveriesTab – status dropdown", () => {
  it("shows only delivery-related statuses", async () => {
    pmListOrders.mockResolvedValueOnce({
      data: [
        {
          id: "order-1",
          status: "PROCESSING",
          items: [],
          createdAt: "2025-01-01T10:00:00Z",
        },
      ],
    });

    render(<DeliveriesTab />);

    await waitFor(() =>
      expect(screen.getByText("Deliveries")).toBeInTheDocument()
    );

    const select = screen.getByRole("combobox");

    // allowed statuses
    expect(select).toHaveTextContent("PROCESSING");
    expect(select).toHaveTextContent("SHIPPED");
    expect(select).toHaveTextContent("DELIVERED");

    // explicitly NOT allowed
    expect(select).not.toHaveTextContent("CART");
    expect(select).not.toHaveTextContent("PAID");
    expect(select).not.toHaveTextContent("CANCELLED");
  });
});
