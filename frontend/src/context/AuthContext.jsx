import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { loginRequest, logoutRequest, meRequest } from "../lib/api";

const AuthContext = createContext(null);

const FORCED_LOGOUT_KEY = "tidl_forced_logout";

function getRoleHome(role) {
  switch (role) {
    case "PRODUCT_MANAGER":
      return "/backoffice/product-manager";
    case "SALES_MANAGER":
      return "/backoffice/sales-manager";
    case "SUPPORT_AGENT":
      return "/backoffice/support-manager";
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

  // ✅ refs to avoid stale state + prevent race during login
  const forcedLoggedOutRef = useRef(forcedLoggedOut);
  const loginInProgressRef = useRef(false);

  useEffect(() => {
    forcedLoggedOutRef.current = forcedLoggedOut;
  }, [forcedLoggedOut]);

  /**
   * refreshMe:
   * - if forcedLoggedOut: do nothing (unless ignoreForced=true)
   * - if /me fails:
   *    - if a login is in progress, DO NOT set user to null (prevents alternating redirects)
   *    - otherwise set user null (normal behavior)
   */
  const refreshMe = async ({ ignoreForced = false } = {}) => {
    const forced = forcedLoggedOutRef.current;

    if (!ignoreForced && forced) {
      setUser(null);
      return null;
    }

    try {
      const { data } = await meRequest();
      setUser(data);
      return data;
    } catch (err) {
     
      if (loginInProgressRef.current) {
        return null;
      }
      setUser(null);
      return null;
    }
  };

  // Initial hydration + rerun when forcedLoggedOut changes,
  // but avoid racing during explicit login.
  useEffect(() => {
    (async () => {
      // If we are mid-login, skip this run entirely
      if (loginInProgressRef.current) return;

      setLoading(true);
      await refreshMe(); // respects forcedLoggedOut
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedLoggedOut]);

  const login = async (emailAddress, password) => {
    loginInProgressRef.current = true;

    // user explicitly logs in -> allow rehydrate again
    try {
      sessionStorage.removeItem(FORCED_LOGOUT_KEY);
    } catch {}
    setForcedLoggedOut(false);

    try {
      // server sets cookie
      await loginRequest(emailAddress, password);

      // now fetch /me (bypass forced gate)
      const me = await refreshMe({ ignoreForced: true });

      // if still null, treat as real login failure for UI (instead of random redirect)
      if (!me) {
        throw new Error("Login succeeded but /users/me did not return a user.");
      }

      return me;
    } finally {
      loginInProgressRef.current = false;
      setLoading(false);
    }
  };

  const logout = async () => {
    // make logout immediate + authoritative
    try {
      sessionStorage.setItem(FORCED_LOGOUT_KEY, "1");
    } catch {}
    setForcedLoggedOut(true);
    setUser(null);

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
