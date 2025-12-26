import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginRequest, logoutRequest, meRequest } from "../lib/api";

const AuthContext = createContext(null);

const FORCED_LOGOUT_KEY = "tidl_forced_logout";

function getRoleHome(role) {
  switch (role) {
    case "PRODUCT_MANAGER":
      return "/backoffice/product";
    case "SALES_MANAGER":
      return "/backoffice/sales";
    case "SUPPORT_AGENT":
      return "/backoffice/support";
    case "CUSTOMER":
    default:
      return "/home";
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [forcedLoggedOut, setForcedLoggedOut] = useState(() => {
    try {
      return sessionStorage.getItem(FORCED_LOGOUT_KEY) === "1";
    } catch {
      return false;
    }
  });

  const refreshMe = async () => {
    // 🔒 if user clicked logout, NEVER rehydrate until next login
    if (forcedLoggedOut) {
      setUser(null);
      return null;
    }

    try {
      const { data } = await meRequest();
      setUser(data);
      return data;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshMe();
      setLoading(false);
    })();
  }, [forcedLoggedOut]); // rerun if the flag changes

  const login = async (emailAddress, password) => {
    // user explicitly logs in -> allow rehydrate again
    try {
      sessionStorage.removeItem(FORCED_LOGOUT_KEY);
    } catch {}
    setForcedLoggedOut(false);

    await loginRequest(emailAddress, password);

    // now get real user
    const me = await refreshMe();
    return me;
  };

  const logout = async () => {
    // ✅ make logout immediate + authoritative in UI
    try {
      sessionStorage.setItem(FORCED_LOGOUT_KEY, "1");
    } catch {}
    setForcedLoggedOut(true);
    setUser(null);

    // fire request but do not allow it to rehydrate anything
    try {
      await logoutRequest();
    } catch {
      // ignore
    }
  };

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      loading,
      isAuthed: !!user,
      getRoleHome,
      refreshMe,
      login,
      logout,
      forcedLoggedOut,
    }),
    [user, loading, forcedLoggedOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
