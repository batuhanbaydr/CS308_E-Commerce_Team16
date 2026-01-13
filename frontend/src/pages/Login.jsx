// src/pages/Login.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { attachCartToUser } from "../lib/api";
import { useAuth } from "../context/AuthContext.jsx";
import CategoryTopbar from "../components/CategoryTopbar.jsx";

const CART_STORAGE_KEY = "tidl_cart_id";

// ---- role helpers -------------------------------------------------
const hasRole = (u, role) =>
  u?.roles?.includes(role) || u?.role === role || u?.userRole === role;

const isProductManager = (u) => hasRole(u, "PRODUCT_MANAGER");
const isSalesManager = (u) => hasRole(u, "SALES_MANAGER");
const isSupportManager = (u) => hasRole(u, "SUPPORT_AGENT");

// Decide where the user should land after login (and for "Admin Panel" button)
const getDefaultRouteForUser = (u) => {
  if (!u) return "/home";
  if (isProductManager(u)) return "/backoffice/product-manager";
  if (isSalesManager(u)) return "/backoffice/sales-manager";
  if (isSupportManager(u)) return "/backoffice/support-manager";
  return "/home";
};

function safeDecodeNext(nextParam) {
  if (!nextParam) return null;
  try {
    return decodeURIComponent(nextParam);
  } catch {
    return null;
  }
}

export default function Login() {
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();
  const { user, login, logout } = useAuth();

  const [searchParams] = useSearchParams();
  const next = useMemo(
    () => safeDecodeNext(searchParams.get("next")),
    [searchParams]
  );

  // If user is already logged in and they visit /login, allow re-login (no auto redirect).
  useEffect(() => {
    // intentionally empty
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      // 1) login through AuthContext
      const meData = await login(emailAddress, password);

      // 2) attach guest cart
      if (typeof window !== "undefined" && meData?.id) {
        const guestCartId = window.localStorage.getItem(CART_STORAGE_KEY);
        if (guestCartId) {
          try {
            await attachCartToUser(guestCartId);
          } catch (attachError) {
            console.log(
              "Could not attach cart (may be empty or already attached):",
              attachError
            );
          } finally {
            window.localStorage.removeItem(CART_STORAGE_KEY);
          }
        }
      }

      // 3) redirect (respect ?next=)
      const destination = next || getDefaultRouteForUser(meData);
      navigate(destination, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Login failed. Check e-mail or password.";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="category-page">
      {/* ✅ Dynamic topbar everywhere */}
      <CategoryTopbar />

      <main className="login-wrapper">
        <div className="login-card">
          <h1 className="login-title">LOGIN</h1>
          <p className="login-subtitle">Please enter your e-mail and password:</p>

          {errorMsg && <p className="login-error">{errorMsg}</p>}

          <form onSubmit={handleSubmit} className="login-form">
            <input
              className="login-input"
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="E-mail"
              required
            />
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            <button type="submit" className="login-button">
              SIGN IN
            </button>
          </form>

          <p className="login-footer-text">
            Don’t have an account? <Link to="/signup">Click here to create one.</Link>
          </p>


        </div>
      </main>
    </div>
  );
}
