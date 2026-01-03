// src/pages/SupportChatPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  meRequest,
  logoutRequest,
  startConversation,
  supportGetConversationMessages,
  supportUploadChatAttachment,
  supportSendMessage,
} from "../lib/api";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";

// ---- helpers ---------------------------------------------------------

// Turn backend messages into a uniform shape for the UI
function normalizeMessages(list) {
  if (!Array.isArray(list)) return [];
  return list.map((m, idx) => {
    const id =
      m.id ||
      m.messageId ||
      m._id ||
      (m.createdAt ? `${m.createdAt}-${idx}` : `msg-${idx}`);

    const rawRole = m.senderType || m.senderRole || m.sender || "";
    const role = rawRole.toString().toUpperCase();

    let from = "system";
    if (role === "AGENT" || role === "SUPPORT_AGENT") from = "agent";
    else if (role === "CUSTOMER" || role === "USER") from = "customer";

    return {
      id,
      from,
      text: m.text || "",
      createdAt: m.createdAt || m.timestamp || null,
      attachmentUrl: m.attachmentUrl || null,
      attachmentName:
        m.attachmentName ||
        m.attachmentOriginalFilename ||
        m.filename ||
        null,
    };
  });
}

// Make attachment URL safe to open directly in a new tab
function resolveAttachmentUrl(url) {
  if (!url) return "#";
  if (/^https?:\/\//i.test(url)) return url;
  // If backend returns a relative path like "/api/…", prefix current origin.
  if (url.startsWith("/")) {
    return `${window.location.origin}${url}`;
  }
  return url;
}

// ---- component -------------------------------------------------------

export default function SupportChatPage() {
  // shared topbar state (same pattern as Home)
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { openCart } = useCartDrawer();

  // chat state
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState(() =>
    normalizeMessages([
      {
        id: "sys-1",
        sender: "SYSTEM",
        text: "Start by sending us a message. We’ll reply as soon as an agent is available.",
      },
    ])
  );
  const [input, setInput] = useState("");
  const [fileToUpload, setFileToUpload] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [initError, setInitError] = useState("");
  const [sendError, setSendError] = useState("");

  // ----- auth / user bootstrap ---------------------------------------

  useEffect(() => {
    if (location.state?.user) {
      setUser(location.state.user);
      return;
    }
    (async () => {
      try {
        const { data } = await meRequest();
        setUser(data);
      } catch {
        setUser(null);
      }
    })();
  }, [location.state]);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // ignore
    }
    setUser(null);
    navigate("/home");
  };

useEffect(() => {
  let cancelled = false;

  async function bootstrap() {
    setInitError("");
    try {
      // ✅ use real backend endpoint
      const convRes = await startConversation(null); // guest or logged-in

      if (cancelled) return;

      const conv = convRes?.data || {};
      const cid = conv.id || conv.conversationId;
      if (!cid) {
        setInitError("Could not start a support chat. Please try again.");
        return;
      }
      setConversationId(cid);

      // ✅ load history from /chat/{id}/messages
      try {
        const histRes = await supportGetConversationMessages(cid);
        if (!cancelled && Array.isArray(histRes?.data)) {
          setMessages(normalizeMessages(histRes.data));
        }
      } catch (err) {
        console.warn("Failed to load history:", err);
      }
    } catch (err) {
      console.error("Failed to create conversation:", err);
      setInitError("Could not start a support chat. Please try again.");
    }
  }

  bootstrap();
  return () => {
    cancelled = true;
  };
}, []);

  // ----- send message (customer endpoints) ----------------------------

  const handleSend = async (e) => {
    e?.preventDefault();
    setSendError("");

    const trimmed = input.trim();
    if (!trimmed && !fileToUpload) return;
    if (!conversationId) {
      setSendError("Chat is still initialising. Please wait a moment.");
      return;
    }

    let attachmentMeta = null;

    // 1) upload attachment first (if any) via customer endpoint
    if (fileToUpload) {
      try {
        setUploading(true);
        const uploadRes = await supportUploadChatAttachment(
          conversationId,
          fileToUpload
        );
        const data = uploadRes?.data || {};
        attachmentMeta = {
          attachmentUrl: data.attachmentUrl || data.url,
          attachmentName:
            data.attachmentName ||
            data.originalFilename ||
            fileToUpload.name,
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to upload attachment:", err);
        setSendError("Failed to upload attachment. Please try again.");
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    // 2) send message to backend (customer endpoint)
    try {
      const body = {
        text: trimmed || (attachmentMeta ? "(attachment)" : ""),
        ...(attachmentMeta || {}),
      };

      await supportSendMessage(conversationId, body);

      // 3) optimistic UI update
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          from: "customer",
          text: body.text,
          createdAt: new Date().toISOString(),
          attachmentUrl: attachmentMeta?.attachmentUrl || null,
          attachmentName: attachmentMeta?.attachmentName || null,
        },
      ]);

      setInput("");
      setFileToUpload(null);
      setSendError("");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to send message:", err);
      setSendError(
        `Failed to send message${
          err?.response?.status ? ` (status ${err.response.status})` : ""
        }`
      );
    }
  };

  // ----- render helpers -----------------------------------------------

  const renderMessageBubble = (m) => {
    const isMine = m.from === "customer";

    if (m.from === "system") {
      return (
        <div
          key={m.id}
          style={{
            fontSize: 13,
            color: "#6b7280",
            marginBottom: 8,
          }}
        >
          {m.text}
        </div>
      );
    }

    return (
      <div
        key={m.id}
        style={{
          display: "flex",
          justifyContent: isMine ? "flex-end" : "flex-start",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            maxWidth: "70%",
            padding: "10px 14px",
            borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            background: isMine ? "#3d211c" : "#f5f5f5",
            color: isMine ? "#ffffff" : "#111827",
            fontSize: 14,
            lineHeight: 1.4,
          }}
        >
          {m.text && <div>{m.text}</div>}
          {m.attachmentUrl && (
            <div style={{ marginTop: m.text ? 6 : 0, fontSize: 13 }}>
              <span style={{ opacity: 0.8 }}>Attached file: </span>
              <a
                href={resolveAttachmentUrl(m.attachmentUrl)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: isMine ? "#fef3c7" : "#2563eb",
                  textDecoration: "underline",
                  wordBreak: "break-all",
                }}
              >
                {m.attachmentName || "View file"}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ----- JSX ----------------------------------------------------------

  return (
    <div className="category-page">
      {/* Topbar copied from store pages */}
      <header className="category-topbar">
        <button className="category-brand" onClick={() => navigate("/home")}>
          TIDL
        </button>

        <nav className="category-nav">
          <button
            onClick={() => navigate("/category/sweatshirts")}
            className="category-nav-item"
          >
            SWEATSHIRTS
          </button>
          <button
            onClick={() => navigate("/category/shirts")}
            className="category-nav-item"
          >
            SHIRTS
          </button>
          <button
            onClick={() => navigate("/category/pants")}
            className="category-nav-item"
          >
            PANTS
          </button>
        </nav>

        <div className="category-actions">
          <img
            src={searchIcon}
            alt="Search"
            className="category-icon"
            onClick={() => navigate("/search")}
          />

          {user ? (
            <>
              <span
                className="login-topbar-link"
                style={{ cursor: "default", marginRight: "0.5rem" }}
              >
                {`HEY! ${user.name}`}
              </span>
              <div
                className="home-menu"
                onClick={() => setShowMenu((p) => !p)}
                style={{ marginRight: "0.5rem" }}
              >
                <span />
                <span />
                <span />
                {showMenu && (
                  <div className="details-menu">
                    <button
                      className="details-menu-item"
                      onClick={() => navigate("/profile")}
                    >
                      Details
                    </button>

                    <button
                      className="details-menu-item"
                      onClick={() => navigate("/wishlist")}
                    >
                      Wishlist
                    </button>

                    <button
                      className="details-menu-item"
                      onClick={handleLogout}
                    >
                      Log-out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <span
              className="home-signin"
              onClick={() => navigate("/login")}
              style={{ marginRight: "0.5rem", cursor: "pointer" }}
            >
              SIGN IN
            </span>
          )}

          <img
            src={bagIcon}
            alt="Cart"
            className="category-icon"
            onClick={openCart}
          />
        </div>
      </header>

      {/* Main support layout */}
      <main
        style={{
          paddingTop: "120px",
          paddingBottom: "80px",
          maxWidth: "1120px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#3d211c",
            marginBottom: "8px",
          }}
        >
          SUPPORT
        </h1>
        <p style={{ color: "#666", fontSize: "14px", marginBottom: "24px" }}>
          Chat with our team in real time. Attach screenshots, PDFs or videos if
          you need.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 3fr) minmax(260px, 1.4fr)",
            gap: "24px",
          }}
        >
          {/* Left: conversation card */}
          <section
            style={{
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 18px 45px rgba(0,0,0,0.06)",
              background: "#fcf9f9ff",
              display: "flex",
              flexDirection: "column",
              minHeight: "420px",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #e2e2e2ff",
                background: "#edededff",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "999px",
                  background: "#3d211c",
                  color: "#f5f5f5ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                {user?.name ? user.name[0] : "G"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {user?.email || "Guest"}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  We’ll assign a support agent shortly.
                </div>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                padding: "16px 20px",
                background: "#ffffff",
                overflowY: "auto",
              }}
            >
              {initError && (
                <div
                  style={{
                    color: "#b91c1c",
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                >
                  {initError}
                </div>
              )}

              {messages.map(renderMessageBubble)}
            </div>

            <form
              onSubmit={handleSend}
              style={{
                borderTop: "1px solid #e5e7eb",
                background: "#ffffff",
                padding: "10px 12px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  rows={2}
                  style={{
                    width: "90%",
                    resize: "none",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    padding: "8px 10px",
                    fontFamily: "inherit",
                    fontSize: 14,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                {sendError && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#b91c1c",
                    }}
                  >
                    {sendError}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  alignItems: "flex-end",
                }}
              >
                <button
                  type="submit"
                  disabled={uploading}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "999px",
                    border: "none",
                    background: "#3d211c",
                    color: "#fff",
                    fontSize: 14,
                    cursor: uploading ? "default" : "pointer",
                    opacity: uploading ? 0.7 : 1,
                  }}
                >
                  {uploading ? "Uploading…" : "Send"}
                </button>

                <label
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: 12,
                    color: "#6b7280",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Attach file
                  <input
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setFileToUpload(f);
                      setSendError("");
                    }}
                  />
                </label>
                {fileToUpload && (
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    Selected: {fileToUpload.name}
                  </div>
                )}
              </div>
            </form>
          </section>

          {/* Right: info panel */}
          <aside
            style={{
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              padding: "18px 18px 20px",
              background: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <h2
                style={{
                  fontSize: 13,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                WHAT YOU CAN DO
              </h2>
              <span
                style={{
                  fontSize: 11,
                  color: "#16a34a",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "999px",
                    background: "#22c55e",
                  }}
                />
                Online
              </span>
            </div>

            <ul
              style={{
                paddingLeft: "18px",
                margin: "6px 0 16px",
                fontSize: 13,
                color: "#4b5563",
              }}
            >
              <li>Ask sizing, delivery or return questions.</li>
              <li>Share screenshots, PDFs, or photos of your issue.</li>
              <li>
                If you’re signed in, we’ll see your recent orders and cart to help
                faster.
              </li>
            </ul>

            <div
              style={{
                marginTop: 10,
                padding: "12px 12px",
                borderRadius: "12px",
                background: "#fffef4ff",
                border: "1px solid #bdaf73ff",
                fontSize: 12,
                color: "#675846ff",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Privacy Disclaimer:
              </div>
              <div>
                Your files are only used to resolve this support request. Don’t share
                sensitive information like passwords or card numbers.
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}