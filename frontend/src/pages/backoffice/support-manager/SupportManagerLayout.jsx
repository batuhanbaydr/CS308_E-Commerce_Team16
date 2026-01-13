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

import TopBar from "../product-manager/Topbar";
import SupportSidebar from "./Sidebar";
import "../product-manager/productManager.css";

// ---------- small helpers ----------

// WebSocket endpoint (for STOMP)
const WS_BASE_URL =
  import.meta.env.VITE_BACKEND_WS_URL || "http://localhost:8080/ws";

// Base URL for serving uploaded files
const FILE_BASE_URL =
  import.meta.env.VITE_BACKEND_FILE_BASE_URL || "http://localhost:8080";

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function formatDateTime(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

function toNumberMaybe(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  try {
    const n = Number(String(v));
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function formatMoney(v) {
  const n = toNumberMaybe(v);
  if (n === null) return v !== undefined && v !== null ? String(v) : "";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Make attachment URL safe + point to backend, not the SPA
function resolveAttachmentUrl(url) {
  if (!url) return "#";

  // already absolute or data url
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;

  // ✅ FRONTEND public assets: keep as-is (Vite serves from same origin)
  if (
    url.startsWith("/products/") ||
    url.startsWith("/assets/") ||
    url.startsWith("/images/")
  ) {
    return url;
  }

  // attachments served by backend
  if (url.startsWith("/")) return `${FILE_BASE_URL}${url}`;
  return `${FILE_BASE_URL}/${url.replace(/^\/+/, "")}`;
}

// ✅ Used to match optimistic message with server echo (no backend change needed)
// IMPORTANT: senderPrincipal backend'de değişken gelebiliyor (email / user:xxx)
// Bu yüzden fingerprint'e senderPrincipal dahil ETMİYORUZ.
function fingerprintMsg({ conversationId, senderType, text, attachmentUrl }) {
  const st = (senderType || "").toUpperCase();
  return [
    conversationId || "",
    st,
    (text || "").trim(),
    attachmentUrl || "",
  ].join("|");
}

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

export default function SupportManagerLayout() {
  const { user } = useAuth();
  const agentEmail = user?.emailAddress || user?.email || user?.username || null;

  return (
    <div className="pm-layout">
      <TopBar />

      <div className="pm-body">
        <SupportSidebar />

        <main className="pm-content">
          <SupportLiveChatPanel agentEmail={agentEmail} />
        </main>
      </div>
    </div>
  );
}

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
  const optimisticKeysRef = useRef(new Set()); // ✅ for optimistic dedup
  const messagesEndRef = useRef(null);

  // auto scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // WebSocket / STOMP connect once
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_BASE_URL),
      reconnectDelay: 5000,
      debug: () => {},
    });

    client.onConnect = () => setStompConnected(true);
    client.onDisconnect = () => setStompConnected(false);

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
    if (!event) return;

    const incomingId =
      event.messageId ||
      event.id ||
      event._id ||
      `ev-${event.timestamp || Date.now()}`;

    setMessages((prev) => {
      // server id dedup
      if (messageIdsRef.current.has(incomingId)) return prev;

      const normalized = {
        messageId: incomingId,
        conversationId: event.conversationId,
        senderType: (event.senderType || "").toUpperCase(), // ✅ normalize
        senderPrincipal: event.senderPrincipal,
        text: event.text,
        attachmentUrl: event.attachmentUrl,
        timestamp: event.timestamp
          ? new Date(event.timestamp).getTime()
          : Date.now(),
      };

      // ✅ If this message is the server echo of our optimistic message,
      // remove optimistic one and keep server one.
      const fp = fingerprintMsg(normalized);
      if (optimisticKeysRef.current.has(fp)) {
        optimisticKeysRef.current.delete(fp);

        const withoutOptimistic = prev.filter((m) => fingerprintMsg(m) !== fp);

        messageIdsRef.current.add(incomingId);
        const merged = [...withoutOptimistic, normalized];
        merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        return merged;
      }

      // normal add
      messageIdsRef.current.add(incomingId);
      const next = [...prev, normalized];
      next.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      return next;
    });
  }, []);

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

  // When selected conversation changes, load history + context and subscribe
  useEffect(() => {
    messageIdsRef.current = new Set();
    optimisticKeysRef.current = new Set(); // ✅ reset optimistic tracker
    setMessages([]);
    setContext(null);

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

        const baseMsgs = (msgsRes.data || []).map((m, idx) => {
          const id = m.id || m.messageId || m._id || `hist-${idx}`;
          return {
            messageId: id,
            conversationId: m.conversationId,
            senderType: (m.senderType || "").toUpperCase(), // ✅ normalize
            senderPrincipal: m.senderPrincipal,
            text: m.text,
            attachmentUrl: m.attachmentUrl,
            timestamp: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
          };
        });

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

  // resubscribe on reconnect
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

      // 1) upload file if present
      if (pendingFile) {
        const { data } = await supportUploadChatAttachment(
          selectedId,
          pendingFile
        );
        attachmentUrl = data?.attachmentUrl || null;
      }

      // 2) send via WebSocket
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

      // 3) optimistic local event
      const optimisticEvent = {
        messageId: `local-${Date.now()}`,
        conversationId: selectedId,
        senderType: "AGENT",
        senderPrincipal: agentEmail || "agent",
        text: trimmed,
        attachmentUrl,
        timestamp: Date.now(),
      };

      // ✅ mark this optimistic message so server echo replaces it
      optimisticKeysRef.current.add(fingerprintMsg(optimisticEvent));

      messageIdsRef.current.add(optimisticEvent.messageId);

      setMessages((prev) => {
        const next = [...prev, optimisticEvent];
        next.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        return next;
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

  // ---- context adapters (DTO aware) ----
  const cart = context?.cart || null; // BasketDTO
  const cartItems = safeArray(cart?.items); // BasketItemDTO[]
  const orders = safeArray(context?.orders); // OrderSummaryDTO[]

  // ✅ FIX: wishlist backend'den bazen array gelebiliyor (ctx.setWishlist(List.of(wishlist)))
  const wishlistRaw = context?.wishlist ?? null;
  const wishlistObj = Array.isArray(wishlistRaw)
    ? wishlistRaw[0] ?? null
    : wishlistRaw;

  const wishlistProducts = safeArray(wishlistObj?.products);
  const wishlistProductIds = safeArray(wishlistObj?.productIds);

  const wishlistCount =
    typeof wishlistObj?.count === "number"
      ? wishlistObj.count
      : wishlistProductIds.length || wishlistProducts.length;

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
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                Active conversations
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                OPEN / CLAIMED sessions
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#4b5563" }}>
              {queue.length} total
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
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
                        {conv.assignedAgentId
                          ? conv.assignedAgentId
                          : "Unassigned"}
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
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
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
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
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
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      No messages yet in this conversation.
                    </div>
                  )}

                  {messages.map((m) => {
                    const isAgent = (m.senderType || "").toUpperCase() === "AGENT";
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
                            boxShadow: "0 1px 2px rgba(15,23,42,0.12)",
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
                            {m.senderPrincipal ? `• ${m.senderPrincipal}` : ""}
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
                              href={resolveAttachmentUrl(m.attachmentUrl)}
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

              {/* Context */}
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
                    style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}
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
                    <div style={{ fontSize: 13, color: "#4b5563" }}>
                      Loading context…
                    </div>
                  )}

                  {!contextLoading && !context && (
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      No extra context available.
                    </div>
                  )}

                  {!contextLoading && context && (
                    <>
                      {/* PROFILE */}
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
                              <strong>Email:</strong> {context.user.emailAddress}
                            </div>
                            {context.user.phoneNumber && (
                              <div>
                                <strong>Phone:</strong> {context.user.phoneNumber}
                              </div>
                            )}
                            {context.user.homeAddress && (
                              <div>
                                <strong>Address:</strong> {context.user.homeAddress}
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

                      {/* CART (BasketDTO + BasketItemDTO) */}
                      <div
                        style={{
                          marginBottom: 12,
                          paddingBottom: 10,
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

                        {!cart && (
                          <div style={{ fontSize: 11, color: "#6b7280" }}>
                            No cart information.
                          </div>
                        )}

                        {cart && (
                          <>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#4b5563",
                                marginBottom: 8,
                              }}
                            >
                              <div>
                                <strong>OrderId (cart):</strong> {cart.orderId || "-"}
                              </div>
                              <div>
                                <strong>Subtotal:</strong> {formatMoney(cart.subtotal)}
                              </div>
                              <div>
                                <strong>Items:</strong> {cartItems.length}
                              </div>
                            </div>

                            {!cartItems.length && (
                              <div style={{ fontSize: 11, color: "#6b7280" }}>
                                Cart is empty.
                              </div>
                            )}

                            {cartItems.length > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 8,
                                }}
                              >
                                {cartItems.slice(0, 5).map((it, idx) => (
                                  <div
                                    key={`${it.productId}-${it.sku || idx}`}
                                    style={{
                                      display: "flex",
                                      gap: 10,
                                      padding: "8px 8px",
                                      border: "1px solid #e5e7eb",
                                      borderRadius: 10,
                                      background: "#fff",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 8,
                                        overflow: "hidden",
                                        border: "1px solid #e5e7eb",
                                        background: "#f3f4f6",
                                        flex: "0 0 auto",
                                      }}
                                    >
                                      {it.mainImageUrl ? (
                                        <img
                                          src={resolveAttachmentUrl(it.mainImageUrl)}
                                          alt={it.name || it.productId}
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                          }}
                                          onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                          }}
                                        />
                                      ) : null}
                                    </div>

                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: "#111827",
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                        }}
                                        title={it.name || it.productId}
                                      >
                                        {it.name || it.productId}
                                      </div>

                                      <div
                                        style={{
                                          fontSize: 11,
                                          color: "#6b7280",
                                          marginTop: 2,
                                        }}
                                      >
                                        {it.sku
                                          ? `SKU: ${it.sku}`
                                          : `Product: ${it.productId}`}
                                      </div>

                                      <div
                                        style={{
                                          fontSize: 11,
                                          color: "#374151",
                                          marginTop: 4,
                                        }}
                                      >
                                        Qty: <strong>{it.quantity}</strong>
                                        {it.unitPrice !== undefined &&
                                        it.unitPrice !== null ? (
                                          <>
                                            {" "}
                                            • Unit:{" "}
                                            <strong>{formatMoney(it.unitPrice)}</strong>
                                          </>
                                        ) : null}
                                        {it.lineTotal !== undefined &&
                                        it.lineTotal !== null ? (
                                          <>
                                            {" "}
                                            • Line:{" "}
                                            <strong>{formatMoney(it.lineTotal)}</strong>
                                          </>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {cartItems.length > 5 && (
                                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                                    +{cartItems.length - 5} more item(s)…
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* ORDERS (OrderSummaryDTO[]) */}
                      <div
                        style={{
                          marginBottom: 12,
                          paddingBottom: 10,
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

                        {!orders.length && (
                          <div style={{ fontSize: 11, color: "#6b7280" }}>
                            No order data.
                          </div>
                        )}

                        {orders.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                            }}
                          >
                            {orders.slice(0, 5).map((o) => (
                              <div
                                key={o.id}
                                style={{
                                  padding: "8px 8px",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: 10,
                                  background: "#fff",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: 10,
                                  }}
                                >
                                  <div style={{ minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "#111827",
                                      }}
                                    >
                                      Order
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "#111827",
                                        marginTop: 2,
                                        wordBreak: "break-all",
                                        lineHeight: 1.2,
                                      }}
                                      title={o.id}
                                    >
                                      #{o.id}
                                    </div>
                                  </div>

                                  <span
                                    style={{
                                      fontSize: 11,
                                      padding: "3px 10px",
                                      borderRadius: 999,
                                      border: "1px solid #e5e7eb",
                                      backgroundColor: "#ffffff",
                                      color: "#374151",
                                      flexShrink: 0,
                                      whiteSpace: "nowrap",
                                      marginTop: 2,
                                    }}
                                    title={o.status || "UNKNOWN"}
                                  >
                                    {o.status || "UNKNOWN"}
                                  </span>
                                </div>

                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#4b5563",
                                    marginTop: 4,
                                  }}
                                >
                                  <div>
                                    <strong>Created:</strong>{" "}
                                    {formatDateTime(o.createdAt)}
                                  </div>
                                  <div>
                                    <strong>Total:</strong>{" "}
                                    {formatMoney(o.grandTotal)}
                                  </div>
                                </div>
                              </div>
                            ))}

                            {orders.length > 5 && (
                              <div style={{ fontSize: 11, color: "#6b7280" }}>
                                +{orders.length - 5} more order(s)…
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* WISHLIST (WishlistResponseDTO) */}
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

                        {!wishlistObj && (
                          <div style={{ fontSize: 11, color: "#6b7280" }}>
                            No wishlist data.
                          </div>
                        )}

                        {wishlistObj && (
                          <>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#4b5563",
                                marginBottom: 8,
                              }}
                            >
                              <strong>Count:</strong> {wishlistCount}
                            </div>

                            {wishlistCount === 0 && (
                              <div style={{ fontSize: 11, color: "#6b7280" }}>
                                No wishlist items.
                              </div>
                            )}

                            {wishlistCount > 0 && wishlistProducts.length > 0 ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 8,
                                }}
                              >
                                {wishlistProducts.slice(0, 5).map((p, idx) => (
                                  <div
                                    key={p.id || p._id || p.productId || idx}
                                    style={{
                                      display: "flex",
                                      gap: 10,
                                      padding: "8px 8px",
                                      border: "1px solid #e5e7eb",
                                      borderRadius: 10,
                                      background: "#fff",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 8,
                                        overflow: "hidden",
                                        border: "1px solid #e5e7eb",
                                        background: "#f3f4f6",
                                        flex: "0 0 auto",
                                      }}
                                    >
                                      {p.mainImageUrl || p.imageUrl || p.thumbnailUrl ? (
                                        <img
                                          src={resolveAttachmentUrl(
                                            p.mainImageUrl || p.imageUrl || p.thumbnailUrl
                                          )}
                                          alt={p.name || p.title || "product"}
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                          }}
                                          onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                          }}
                                        />
                                      ) : null}
                                    </div>

                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: "#111827",
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                        }}
                                        title={p.name || p.title || p.id}
                                      >
                                        {p.name || p.title || p.id || "Product"}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 11,
                                          color: "#6b7280",
                                          marginTop: 2,
                                        }}
                                      >
                                        ID: {p.id || p._id || p.productId || "-"}
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {wishlistProducts.length > 5 && (
                                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                                    +{wishlistProducts.length - 5} more wishlist item(s)…
                                  </div>
                                )}
                              </div>
                            ) : wishlistCount > 0 ? (
                              <div style={{ fontSize: 11, color: "#6b7280" }}>
                                {wishlistProductIds.length
                                  ? `ProductIds: ${wishlistProductIds
                                      .slice(0, 6)
                                      .join(", ")}${
                                      wishlistProductIds.length > 6 ? "…" : ""
                                    }`
                                  : "No wishlist items."}
                              </div>
                            ) : null}
                          </>
                        )}
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