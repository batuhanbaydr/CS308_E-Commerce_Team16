// src/pages/Login.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { attachCartToUser } from "../lib/api";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const CART_STORAGE_KEY = "tidl_cart_id";

// ---- role helpers -------------------------------------------------
const hasRole = (u, role) =>
  u?.roles?.includes(role) || u?.role === role || u?.userRole === role;

const isProductManager = (u) => hasRole(u, "PRODUCT_MANAGER");
const isSalesManager = (u) => hasRole(u, "SALES_MANAGER");
const isSupportManager = (u) => hasRole(u, "SUPPORT_AGENT");

const hasAdminAccess = (u) =>
  isSalesManager(u) || isProductManager(u) || isSupportManager(u);

// Decide where the user should land after login (and for "Admin Panel" button)
const getDefaultRouteForUser = (u) => {
  if (!u) {
    console.warn("getDefaultRouteForUser: user is null/undefined");
    return "/home";
  }
  
  console.log("getDefaultRouteForUser - user:", u);
  console.log("getDefaultRouteForUser - user.role:", u.role);
  console.log("getDefaultRouteForUser - user.roles:", u.roles);
  
  if (isProductManager(u)) {
    console.log("getDefaultRouteForUser: Product Manager detected");
    return "/backoffice/product-manager";
  }
  if (isSalesManager(u)) {
    console.log("getDefaultRouteForUser: Sales Manager detected");
    return "/backoffice/sales-manager";
  }
  if (isSupportManager(u)) {
    console.log("getDefaultRouteForUser: Support Agent detected");
    return "/backoffice/support-manager";
  }
  console.log("getDefaultRouteForUser: Normal customer, going to /home");
  return "/home"; // normal customer
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

  const { openCart } = useCartDrawer();
  const navigate = useNavigate();

  const [showMenu, setShowMenu] = useState(false);

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

  const go = (path) => () => {
    setShowMenu(false);
    navigate(path);
  };

  const handleLogout = async () => {
    await logout();
    setShowMenu(false);
    navigate("/login", { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      // 1) login through AuthContext
      const meData = await login(emailAddress, password);
      console.log("LOGIN meData =", meData);
      console.log("LOGIN meData.roles =", meData?.roles);
      console.log("LOGIN meData.role =", meData?.role);
      console.log("LOGIN meData.userRole =", meData?.userRole);


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

      // 3) redirect:
      // - if ?next= is provided, respect it (deep-link)
      // - otherwise send managers to their backoffice landing page
      const destination = next || getDefaultRouteForUser(meData);
      console.log("LOGIN destination:", destination);
      console.log("LOGIN isSalesManager check:", isSalesManager(meData));
      console.log("LOGIN meData.role:", meData?.role);
      console.log("LOGIN meData.roles:", meData?.roles);
      navigate(destination, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Login failed. Check e-mail or password.";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="category-page">
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
            <span
              className="login-topbar-link"
              style={{ cursor: "default", marginRight: "0.5rem" }}
            >
              {`HEY! ${user.name}`}
            </span>
          ) : (
            <span
              className="home-signin"
              onClick={() => navigate("/login")}
              style={{ marginRight: "0.5rem", cursor: "pointer" }}
            >
              SIGN IN
            </span>
          )}

          {user && (
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
                  <button className="details-menu-item" onClick={go("/profile")}>
                    Details
                  </button>

                  <button
                    className="details-menu-item"
                    onClick={go("/wishlist")}
                  >
                    Wishlist
                  </button>

                  {hasAdminAccess(user) && (
                    <button
                      className="details-menu-item"
                      onClick={() => {
                        setShowMenu(false);
                        navigate(getDefaultRouteForUser(user));
                      }}
                    >
                      Admin Panel
                    </button>
                  )}

                  <button className="details-menu-item" onClick={handleLogout}>
                    Log-out
                  </button>
                </div>
              )}
            </div>
          )}

          <img
            src={bagIcon}
            alt="Cart"
            className="category-icon"
            onClick={openCart}
          />
        </div>
      </header>

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
            Don’t have an account?{" "}
            <Link to="/signup">Click here to create one.</Link>
          </p>

          {user && (
            <p className="login-footer-text">
              Logged in as <strong>{user.emailAddress}</strong>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
