// src/auth/RequireAuth.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { meRequest } from "../lib/api";

export default function RequireAuth({ children }) {
  const [state, setState] = useState({ loading: true, user: null });
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await meRequest();
        setState({ loading: false, user: data });
      } catch {
        setState({ loading: false, user: null });
      }
    })();
  }, []);

  if (state.loading) return null; // or a spinner

  if (!state.user) {
    // not logged in → send to login, but remember where the user wanted to go
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
