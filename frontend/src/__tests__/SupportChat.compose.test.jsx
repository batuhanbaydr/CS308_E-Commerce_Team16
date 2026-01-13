// src/__tests__/SupportChat.compose.test.jsx

// Goal: Verifies that in the Support live chat panel, the composer enables the
// Send button when there is either text or an attachment, and that Enter sends
// while Shift+Enter inserts a newline.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SupportManagerLayout from "../pages/backoffice/support-manager/SupportManagerLayout.jsx";

// ───────────────────── DOM polyfills ─────────────────────

// JSDOM doesn't implement scrollIntoView, but our component calls it on a ref.
if (!("scrollIntoView" in window.HTMLElement.prototype)) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

// ───────────────────── Mocks ─────────────────────

// Avoid dialogs breaking tests
beforeEach(() => {
  window.alert = vi.fn();
  window.confirm = vi.fn(() => true);
});

// AuthContext: SupportManagerLayout uses useAuth to get agent email
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: {
      id: "agent-1",
      emailAddress: "agent@example.com",
      name: "Agent User",
    },
  }),
}));

// Cart drawer, in case TopBar/Sidebar touch it
vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({
    openCart: vi.fn(),
    closeCart: vi.fn(),
  }),
}));

// STOMP & SockJS mocks so no real WebSocket connection happens
vi.mock("@stomp/stompjs", () => {
  // Proper constructor-style mock for `new Client(...)`
  function ClientMock() {
    this.activate = vi.fn(() => {
      // When React sets `client.onConnect` and then calls activate,
      // trigger onConnect immediately so stompConnected becomes true.
      if (typeof this.onConnect === "function") {
        this.onConnect();
      }
    });
    this.deactivate = vi.fn();
    this.subscribe = vi.fn(() => ({ unsubscribe: vi.fn() }));
    this.publish = vi.fn();
    this.onConnect = undefined;
    this.onDisconnect = undefined;
  }

  return {
    __esModule: true,
    Client: ClientMock,
  };
});

vi.mock("sockjs-client", () => ({
  __esModule: true,
  default: vi.fn(() => ({})),
}));

// API mocks used by SupportManagerLayout
const mockListActiveConversations = vi.fn();
const mockClaimConversation = vi.fn();
const mockGetMessages = vi.fn();
const mockGetContext = vi.fn();
const mockUploadAttachment = vi.fn();
const mockCloseConversation = vi.fn();

vi.mock("../lib/api", () => ({
  supportListActiveConversations: (...args) =>
    mockListActiveConversations(...args),
  supportClaimConversation: (...args) => mockClaimConversation(...args),
  supportGetConversationMessages: (...args) => mockGetMessages(...args),
  supportGetConversationContext: (...args) => mockGetContext(...args),
  supportUploadChatAttachment: (...args) => mockUploadAttachment(...args),
  supportCloseConversation: (...args) => mockCloseConversation(...args),
}));

// ───────────────────── Test ─────────────────────

describe("Support Live Chat – composer behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // One OPEN conversation in queue
    mockListActiveConversations.mockResolvedValue({
      data: [
        {
          id: "conv-1",
          status: "OPEN",
          userEmail: "customer@example.com",
          updatedAt: new Date().toISOString(),
          assignedAgentId: null,
        },
      ],
    });

    // No message history, no extra context
    mockGetMessages.mockResolvedValue({ data: [] });
    mockGetContext.mockResolvedValue({ data: null });

    // Upload returns a fake attachment URL
    mockUploadAttachment.mockResolvedValue({
      data: { attachmentUrl: "/files/test.png" },
    });
  });

  it("enables send when text or file is present and handles Enter vs Shift+Enter", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SupportManagerLayout />
      </MemoryRouter>
    );

    // 1) Wait for queue to load and click the conversation to open chat panel
    const convoButton = await screen.findByText(/customer@example\.com/i);
    await user.click(convoButton);

    // 2) Grab composer elements
    const textarea = await screen.findByPlaceholderText(
      /write a reply/i // matches: "Write a reply… (Enter = send, Shift+Enter = new line)"
    );

    const sendButton = await screen.findByRole("button", { name: /send/i });

    // Initially disabled (no text, no file)
    expect(sendButton).toBeDisabled();

    // 3) Typing text enables it
    await user.type(textarea, "hello");
    expect(sendButton).toBeEnabled();

    // Clear text => disabled again
    await user.clear(textarea);
    expect(sendButton).toBeDisabled();

    // 4) Simulate file attach: label text "Attach file" wraps input
    const fileInput = await screen.findByLabelText(/attach file/i);
    const file = new File(["dummy"], "test.png", { type: "image/png" });

    await user.upload(fileInput, file);
    expect(sendButton).toBeEnabled();

    // 5) Shift+Enter => newline, not send
    await user.clear(textarea);
    await user.type(textarea, "line1");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(textarea.value).toContain("line1\n");

    // 6) Enter => send (textarea should be cleared after send completes)
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(textarea.value).toBe("");
    });
  });
});