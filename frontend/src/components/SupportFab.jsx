// src/components/SupportFab.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function SupportFab() {
  const navigate = useNavigate();
  const location = useLocation();

  const isSupportPage = location.pathname.startsWith("/support/chat");
  if (isSupportPage) return null;

  return (
    <button
      type="button"
      className="support-fab"
      onClick={() => navigate("/support/chat")}
      aria-label="Open support chat"
    >
      <span className="support-fab-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M4 5.5C4 4.12 5.12 3 6.5 3h11C18.88 3 20 4.12 20 5.5v7c0 1.38-1.12 2.5-2.5 2.5H11l-3.7 3.1c-.32.27-.8.04-.8-.38V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" />
        </svg>
      </span>
    </button>
  );
}