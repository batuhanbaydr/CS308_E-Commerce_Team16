import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StockTab from "../tabs/StockTab";
import { pmListProducts, pmSetVariantStock } from "../../../../lib/api";
import { vi } from "vitest";

vi.mock("../../../../lib/api", async () => {
  const actual = await vi.importActual("../../../../lib/api");
  return {
    ...actual,
    pmListProducts: vi.fn(),
    pmSetVariantStock: vi.fn(),
  };
});

describe("StockTab – validation", () => {
  it("shows error and does not call API when stock is not a whole number", async () => {
    pmListProducts.mockResolvedValueOnce({
      data: [
        {
          id: "p1",
          name: "Test Product",
          category: "Shirts",
          variants: [{ sku: "SKU-1", color: "Black", size: "M", stock: 5 }],
        },
      ],
    });

    render(<StockTab />);

    await waitFor(() =>
      expect(screen.getByText("Stock")).toBeInTheDocument()
    );

    // expand product
    await userEvent.click(screen.getByRole("button", { name: /manage/i }));

    // change stock input to invalid value (e.g. decimal)
    const input = screen.getByDisplayValue("5");
    await userEvent.clear(input);
    await userEvent.type(input, "3.5");

    // click Save
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    // UI error should appear, and API should NOT be called
    expect(
      screen.getByText(/stock must be a whole number/i)
    ).toBeInTheDocument();

    expect(pmSetVariantStock).not.toHaveBeenCalled();
  });
});
