// src/pages/backoffice/support-manager/SupportManagerLayout.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../../../context/AuthContext.jsx";

import {
  supportListActiveConversations,
  supportClaimConversation,
  supportGetConversationMessages,
  supportGetConversationContext,
  supportUploadChatAttachment,
} from "../../../lib/api";

import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

// ✅ reuse the same frame & styles as Product Manager
import TopBar from "../product-manager/Topbar";
import SupportSidebar from "./Sidebar";
import "../product-manager/productManager.css";

/**
 * Simple utility to format dates nicely
 */
function formatDateTime(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

/**
 * Small pill for status
 */
function StatusPill({ status }) {
  const label = status || "UNKNOWN";
  const colorMap = {
    OPEN: "#d2a07cff",
    CLAIMED: "#7296cfff",
    CLOSED: "#6b7280",
  };
  const bg = colorMap[label] || "#6b7280";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        color: "white",
        backgroundColor: bg,
        textTransform: "uppercase",
        letterSpacing: 0.4,
      }}
    >
      {label}
    </span>
  );
}

/**
 * Main layout for /backoffice/support-manager/*
 * Uses the same frame as ProductManagerLayout (pm-layout / pm-body / pm-sidebar / pm-content).
 */
export default function SupportManagerLayout() {
  const { user } = useAuth();

  const agentEmail =
    user?.emailAddress || user?.email || user?.username || null;

  return (
    <div className="pm-layout">
      <TopBar />

      <div className="pm-body">
        <SupportSidebar />

        <main className="pm-content">
          {/* Single tab: Live Chat */}
          <SupportLiveChatPanel agentEmail={agentEmail} />
        </main>
      </div>
    </div>
  );
}

/**
 * Live chat panel: left = queue, right = messages + context
 * Styled as a .pm-tab so it matches the PM look inside the content area.
 */
function SupportLiveChatPanel({ agentEmail }) {
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [context, setContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);

  const [messageText, setMessageText] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [sending, setSending] = useState(false);

  const [stompClient, setStompClient] = useState(null);
  const [stompConnected, setStompConnected] = useState(false);

  const subscriptionRef = useRef(null);
  const messageIdsRef = useRef(new Set());
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Connect STOMP once
  useEffect(() => {
    const client = new Client({
      // Backend: registry.addEndpoint("/ws").withSockJS();
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      reconnectDelay: 5000,
      debug: () => {
        // silence logs in UI
      },
    });

    client.onConnect = () => {
      setStompConnected(true);
    };
    client.onDisconnect = () => {
      setStompConnected(false);
    };

    client.activate();
    setStompClient(client);

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      client.deactivate();
    };
  }, []);

  const appendEvent = useCallback((event) => {
    if (!event || !event.messageId) return;
    setMessages((prev) => {
      if (messageIdsRef.current.has(event.messageId)) return prev;
      const next = [...prev, event];
      messageIdsRef.current.add(event.messageId);
      next.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      return next;
    });
  }, []);

  // Load active conversations into queue
  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    setQueueError(null);
    try {
      const { data } = await supportListActiveConversations();
      setQueue(data || []);
    } catch (err) {
      console.error(err);
      setQueueError("Failed to load conversations");
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // When conversation changes, load message history + context and (re)subscribe
  useEffect(() => {
    // Clear messages + context
    messageIdsRef.current = new Set();
    setMessages([]);
    setContext(null);

    // Unsubscribe from previous
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    if (!selectedId) return;

    const fetchData = async () => {
      setMessagesLoading(true);
      setContextLoading(true);
      try {
        const [msgsRes, ctxRes] = await Promise.all([
          supportGetConversationMessages(selectedId),
          supportGetConversationContext(selectedId),
        ]);

        const baseMsgs = (msgsRes.data || []).map((m) => ({
          messageId: m.id,
          conversationId: m.conversationId,
          senderType: m.senderType,
          senderPrincipal: m.senderPrincipal,
          text: m.text,
          attachmentUrl: m.attachmentUrl,
          timestamp: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
        }));

        const idSet = new Set();
        baseMsgs.forEach((m) => idSet.add(m.messageId));
        messageIdsRef.current = idSet;

        baseMsgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(baseMsgs);

        setContext(ctxRes.data || null);
      } catch (err) {
        console.error(err);
      } finally {
        setMessagesLoading(false);
        setContextLoading(false);
      }
    };

    fetchData();

    // Subscribe to live updates if STOMP is ready
    if (stompClient && stompConnected) {
      const sub = stompClient.subscribe(
        `/topic/conversations/${selectedId}`,
        (msg) => {
          try {
            const body = JSON.parse(msg.body);
            appendEvent(body);
          } catch (e) {
            console.error("Failed to parse message", e);
          }
        }
      );
      subscriptionRef.current = sub;
    }
  }, [selectedId, stompClient, stompConnected, appendEvent]);

  // If STOMP connects later (reconnect), resubscribe to current convo
  useEffect(() => {
    if (!selectedId || !stompClient || !stompConnected) return;
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    const sub = stompClient.subscribe(
      `/topic/conversations/${selectedId}`,
      (msg) => {
        try {
          const body = JSON.parse(msg.body);
          appendEvent(body);
        } catch (e) {
          console.error("Failed to parse WS message", e);
        }
      }
    );
    subscriptionRef.current = sub;
  }, [stompConnected, stompClient, selectedId, appendEvent]);

  const handleClaim = async (conversationId) => {
    try {
      await supportClaimConversation(conversationId);
      await loadQueue();
    } catch (err) {
      console.error(err);
      alert("Failed to claim conversation");
    }
  };

  const handleSend = async () => {
    if (!selectedId) return;
    if (!stompClient || !stompConnected) {
      alert("WebSocket not connected yet.");
      return;
    }
    const trimmed = messageText.trim();
    if (!trimmed && !pendingFile) return;

    setSending(true);
    try {
      let attachmentUrl = null;
      if (pendingFile) {
        const { data } = await supportUploadChatAttachment(
          selectedId,
          pendingFile
        );
        attachmentUrl = data?.attachmentUrl || null;
      }

      const payload = {
        conversationId: selectedId,
        text: trimmed,
        attachmentUrl,
        senderType: "AGENT",
      };

      stompClient.publish({
        destination: "/app/chat.send",
        body: JSON.stringify(payload),
      });

      setMessageText("");
      setPendingFile(null);
    } catch (err) {
      console.error(err);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Derived: currently selected conversation object
  const selectedConversation = useMemo(
    () => queue.find((c) => c.id === selectedId),
    [queue, selectedId]
  );

  const queueSorted = useMemo(
    () =>
      [...queue].sort(
        (a, b) =>
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime()
      ),
    [queue]
  );

  return (
    <div
      className="pm-tab"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
      }}
    >
      {/* Header using pm-tab styles so it matches PM look */}
      <div className="pm-tab-header">
        <h2 className="pm-tab-title">Live Chat</h2>

        <div className="pm-tab-actions" style={{ alignItems: "center" }}>
          <span
            style={{
              fontSize: 12,
              padding: "3px 8px",
              borderRadius: 999,
              backgroundColor: stompConnected ? "#dcfce7" : "#fee2e2",
              color: stompConnected ? "#13261aff" : "#2e0a0aff",
              border: `1px solid ${
                stompConnected ? "#537d62ff" : "#6e3f3fff"
              }`,
            }}
          >
            WS: {stompConnected ? "Connected" : "Disconnected"}
          </span>

          <button
            type="button"
            onClick={loadQueue}
            className="pm-btn pm-btn-secondary"
          >
            Refresh queue
          </button>
        </div>
      </div>

      {/* Main content: queue + chat */}
      <section
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
          gap: 12,
        }}
      >
        {/* Queue */}
        <div
          style={{
            width: 320,
            backgroundColor: "#f9fafb",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "linear-gradient(to right, #f3f4f6, #e5e7eb)",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                Active conversations
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                OPEN / CLAIMED sessions
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#4b5563",
              }}
            >
              {queue.length} total
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
            }}
          >
            {queueLoading && (
              <div style={{ padding: 12, fontSize: 13, color: "#4b5563" }}>
                Loading conversations…
              </div>
            )}

            {!queueLoading && queueError && (
              <div
                style={{
                  padding: 12,
                  fontSize: 13,
                  color: "#2e0a0aff",
                  backgroundColor: "#6e3f3fff",
                }}
              >
                {queueError}
              </div>
            )}

            {!queueLoading && !queueError && !queueSorted.length && (
              <div style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>
                No active conversations.
              </div>
            )}

            {!queueLoading &&
              !queueError &&
              queueSorted.map((conv) => {
                const isSelected = conv.id === selectedId;
                const isClaimedByMe =
                  conv.assignedAgentId &&
                  agentEmail &&
                  conv.assignedAgentId === agentEmail;

                const title =
                  conv.userEmail ||
                  conv.userId ||
                  (conv.guestSessionId
                    ? `Guest (${conv.guestSessionId.slice(0, 8)}…)`
                    : "Anonymous user");

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedId(conv.id)}
                    style={{
                      width: "100%",
                      border: "none",
                      borderBottom: "1px solid #e5e7eb",
                      padding: "10px 10px",
                      textAlign: "left",
                      cursor: "pointer",
                      backgroundColor: isSelected ? "#e0f2fe" : "transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1f242dff",
                          maxWidth: 170,
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                        }}
                      >
                        {title}
                      </div>
                      <StatusPill status={conv.status} />
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6b7280",
                        marginBottom: 4,
                      }}
                    >
                      Updated: {formatDateTime(conv.updatedAt)}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "#4b5563",
                          maxWidth: 160,
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                        }}
                      >
                        Agent:{" "}
                        {conv.assignedAgentId ? conv.assignedAgentId : "Unassigned"}
                      </div>
                      {conv.status !== "CLOSED" && !isClaimedByMe && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClaim(conv.id);
                          }}
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 999,
                            border: "1px solid #1b212fff",
                            backgroundColor: "#26314dff",
                            color: "white",
                            cursor: "pointer",
                          }}
                        >
                          Claim
                        </button>
                      )}
                      {isClaimedByMe && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 999,
                            border: "1px solid #3d8b5aff",
                            backgroundColor: "#dcfce7",
                            color: "#2d553cff",
                          }}
                        >
                          Assigned to you
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Chat + context */}
        <div
          style={{
            flex: 1,
            backgroundColor: "white",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {/* Top bar of chat */}
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#f9fafb",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                {selectedConversation
                  ? selectedConversation.userEmail ||
                    selectedConversation.userId ||
                    (selectedConversation.guestSessionId
                      ? `Guest (${selectedConversation.guestSessionId.slice(
                          0,
                          8
                        )}…)`
                      : "Anonymous user")
                  : "Select a conversation"}
              </div>
              {selectedConversation && (
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  Conversation ID: {selectedConversation.id}
                </div>
              )}
            </div>
            {selectedConversation && (
              <StatusPill status={selectedConversation.status} />
            )}
          </div>

          {!selectedConversation && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9ca3af",
                fontSize: 14,
              }}
            >
              Pick a conversation from the left to start chatting.
            </div>
          )}

          {selectedConversation && (
            <div
              style={{
                flex: 1,
                display: "flex",
                overflow: "hidden",
              }}
            >
              {/* Messages */}
              <div
                style={{
                  flex: 2.5,
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                  borderRight: "1px solid #e5e7eb",
                }}
              >
                {/* Message history */}
                <div
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    overflowY: "auto",
                    backgroundColor: "#f3f4f6",
                  }}
                >
                  {messagesLoading && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#4b5563",
                        marginBottom: 8,
                      }}
                    >
                      Loading messages…
                    </div>
                  )}

                  {!messagesLoading && !messages.length && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6b7280",
                      }}
                    >
                      No messages yet in this conversation.
                    </div>
                  )}

                  {messages.map((m) => {
                    const isAgent = m.senderType === "AGENT";
                    const align = isAgent ? "flex-end" : "flex-start";
                    const bg = isAgent ? "#3d211c" : "white";
                    const color = isAgent ? "white" : "#111827";

                    return (
                      <div
                        key={m.messageId}
                        style={{
                          display: "flex",
                          justifyContent: align,
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "70%",
                            borderRadius: 12,
                            padding: "6px 9px",
                            backgroundColor: bg,
                            color,
                            boxShadow:
                              "0 1px 2px rgba(15,23,42,0.12)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              opacity: isAgent ? 0.9 : 0.7,
                              marginBottom: 2,
                            }}
                          >
                            {m.senderType}{" "}
                            {m.senderPrincipal
                              ? `• ${m.senderPrincipal}`
                              : ""}
                          </div>
                          {m.text && (
                            <div
                              style={{
                                fontSize: 13,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                marginBottom: m.attachmentUrl ? 4 : 0,
                              }}
                            >
                              {m.text}
                            </div>
                          )}
                          {m.attachmentUrl && (
                            <a
                              href={m.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: 12,
                                color: isAgent ? "#bfdbfe" : "#5474baff",
                                textDecoration: "underline",
                              }}
                            >
                              View attachment
                            </a>
                          )}
                          <div
                            style={{
                              fontSize: 10,
                              opacity: 0.8,
                              marginTop: 3,
                              textAlign: "right",
                            }}
                          >
                            {formatDateTime(m.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Compose box */}
                <div
                  style={{
                    borderTop: "1px solid #e5e7eb",
                    padding: "8px 10px",
                    backgroundColor: "white",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write a reply… (Enter = send, Shift+Enter = new line)"
                    style={{
                      width: "100%",
                      minHeight: 56,
                      resize: "vertical",
                      fontSize: 13,
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      padding: "6px 8px",
                      fontFamily: "inherit",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <label
                        style={{
                          fontSize: 12,
                          borderRadius: 999,
                          padding: "4px 8px",
                          border: "1px solid #d1d5db",
                          backgroundColor: "#f9fafb",
                          cursor: "pointer",
                        }}
                      >
                        Attach file
                        <input
                          type="file"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            setPendingFile(file || null);
                          }}
                        />
                      </label>
                      {pendingFile && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#4b5563",
                            maxWidth: 200,
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                          }}
                        >
                          {pendingFile.name}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={sending || (!messageText.trim() && !pendingFile)}
                      onClick={handleSend}
                      className="pm-btn pm-btn-primary"
                    >
                      {sending ? "Sending…" : "Send"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Customer context */}
              <div
                style={{
                  flex: 1.2,
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                  backgroundColor: "#f9fafb",
                }}
              >
                <div
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    Customer context
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    Profile + basic commerce info
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    overflowY: "auto",
                  }}
                >
                  {contextLoading && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#4b5563",
                      }}
                    >
                      Loading context…
                    </div>
                  )}

                  {!contextLoading && !context && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6b7280",
                      }}
                    >
                      No extra context available.
                    </div>
                  )}

                  {!contextLoading && context && (
                    <>
                      {/* Logged in? */}
                      <div
                        style={{
                          marginBottom: 10,
                          padding: "8px 9px",
                          borderRadius: 8,
                          backgroundColor: context.loggedIn
                            ? "#ecfdf5"
                            : "#fefce8",
                          border: `1px solid ${
                            context.loggedIn ? "#346546ff" : "#ffe57fff"
                          }`,
                          fontSize: 12,
                        }}
                      >
                        <strong>
                          {context.loggedIn
                            ? "Logged-in customer"
                            : "Guest session"}
                        </strong>
                      </div>

                      {/* User profile */}
                      {context.user && (
                        <div
                          style={{
                            marginBottom: 12,
                            paddingBottom: 10,
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 4,
                            }}
                          >
                            Profile
                          </div>
                          <div style={{ fontSize: 12, color: "#374151" }}>
                            <div>
                              <strong>Name:</strong> {context.user.name}
                            </div>
                            <div>
                              <strong>Email:</strong>{" "}
                              {context.user.emailAddress}
                            </div>
                            {context.user.phoneNumber && (
                              <div>
                                <strong>Phone:</strong>{" "}
                                {context.user.phoneNumber}
                              </div>
                            )}
                            {context.user.homeAddress && (
                              <div>
                                <strong>Address:</strong>{" "}
                                {context.user.homeAddress}
                              </div>
                            )}
                            {context.user.role && (
                              <div>
                                <strong>Role:</strong> {context.user.role}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Stub sections for cart/orders/wishlist; wire up later */}
                      <div
                        style={{
                          marginBottom: 10,
                          paddingBottom: 8,
                          borderBottom: "1px dashed #e5e7eb",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            marginBottom: 3,
                          }}
                        >
                          Cart
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {context.cart
                            ? "Cart data is available (not yet rendered)."
                            : "No cart information wired yet."}
                        </div>
                      </div>

                      <div
                        style={{
                          marginBottom: 10,
                          paddingBottom: 8,
                          borderBottom: "1px dashed #e5e7eb",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            marginBottom: 3,
                          }}
                        >
                          Recent orders
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {Array.isArray(context.orders) &&
                          context.orders.length
                            ? `${context.orders.length} order(s) – connect your real order DTOs here.`
                            : "No order data wired yet."}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            marginBottom: 3,
                          }}
                        >
                          Wishlist
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {Array.isArray(context.wishlist) &&
                          context.wishlist.length
                            ? `${context.wishlist.length} wishlist item(s) – connect to your models.`
                            : "No wishlist data wired yet."}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}