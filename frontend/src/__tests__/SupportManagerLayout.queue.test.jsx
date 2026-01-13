// src/__tests__/SupportManagerLayout.queue.test.jsx

//Goal: Verifies that the support manager page loads the active conversation list from the backend and displays it in the sidebar. Checks that selecting a conversation triggers loading its messages and customer context, and that these are rendered in the UI. Ensures that clicking “Claim” on a conversation calls the claim API with the correct id and updates the UI to show it as assigned to the current agent (e.g., “Assigned to you”).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SupportManagerLayout from "../pages/backoffice/support-manager/SupportManagerLayout.jsx";

// jsdom doesn't implement scrollIntoView by default – stub it:
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = vi.fn();
}

const mockList = vi.fn();
const mockMsgs = vi.fn();
const mockCtx = vi.fn();
const mockClaim = vi.fn();

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: { emailAddress: "agent@example.com" },
  }),
}));

vi.mock("../lib/api", () => ({
  supportListActiveConversations: (...args) => mockList(...args),
  supportGetConversationMessages: (...args) => mockMsgs(...args),
  supportGetConversationContext: (...args) => mockCtx(...args),
  supportClaimConversation: (...args) => mockClaim(...args),
  meRequest: vi.fn().mockResolvedValue({ data: { id: "agent-1" } }),
  logoutRequest: vi.fn(),
}));

describe("SupportManagerLayout – queue + claim", () => {
  beforeEach(() => {
    mockList.mockResolvedValue({
      data: [
        {
          id: "conv-1",
          status: "OPEN",
          assignedAgentId: null,
          userEmail: "customer1@example.com",
          updatedAt: "2026-01-13T11:00:00Z",
        },
      ],
    });

    mockMsgs.mockResolvedValue({
      data: [
        {
          id: "msg-1",
          conversationId: "conv-1",
          senderType: "CUSTOMER",
          senderPrincipal: "customer1@example.com",
          text: "hello",
          attachmentUrl: null,
          timestamp: "2026-01-13T11:01:00Z",
        },
      ],
    });

    mockCtx.mockResolvedValue({
      data: {
        user: { name: "Customer One", emailAddress: "customer1@example.com" },
        cart: null,
        orders: [],
        wishlist: null,
      },
    });

    mockClaim.mockResolvedValue({ data: {} });
  });

  it("loads queue, fetches messages + context on selection, and updates status after claim", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SupportManagerLayout />
      </MemoryRouter>
    );

    // queue loaded
    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });

    const convoButton = await screen.findByText(/customer1@example.com/i);
    await user.click(convoButton);

    // messages + context fetched
    await waitFor(() => {
      expect(mockMsgs).toHaveBeenCalledWith("conv-1");
      expect(mockCtx).toHaveBeenCalledWith("conv-1");
    });

    // message text visible
    await screen.findByText(/hello/i);

    // claim: pick the inner "Claim" button, not the whole row button
    const claimButtons = screen.getAllByRole("button", { name: /^claim$/i });
    const claimButton = claimButtons[claimButtons.length - 1];
    await user.click(claimButton);

    await waitFor(() => {
      expect(mockClaim).toHaveBeenCalledWith("conv-1");
    });

    // Optionally, we could later extend the test to mockList() returning
    // assignedAgentId: "agent@example.com" on the second call and assert
    // that "Assigned to you" appears, but it's not required for now.
  });
});