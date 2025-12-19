import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequest, meRequest, attachCartToUser } from "../lib/api";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";

const hasAdminAccess = (user) =>
  user?.roles?.includes("SALES_MANAGER") ||
  user?.roles?.includes("PRODUCT_MANAGER") ||
  user?.roles?.includes("SUPPORT_AGENT") ||
  user?.role === "SALES_MANAGER" ||
  user?.role === "PRODUCT_MANAGER" ||
  user?.role === "SUPPORT_AGENT";

const CART_STORAGE_KEY = "tidl_cart_id";

export default function Login() {
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const { openCart } = useCartDrawer();

  // 🔧 ADDED (to fix crash in topbar):
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const go = (path) => () => navigate(path);
  const handleLogout = () => {
    // keep it simple here; your existing page already navigates after login
    setUser(null);
    navigate("/login");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      // ⛔️ keeping your original call (no logic change)
      await loginRequest(emailAddress, password);

      let meData = null;
      try {
        const { data } = await meRequest();
        setUserInfo(data);
        setUser(data); // 🔧 reflect greeting in the header if it stays on this page
        meData = data;
      } catch (inner) {
        console.log("could not load /users/me", inner);
      }

      // If there's a guest cart in localStorage, attach it to the logged-in user
      if (typeof window !== "undefined" && meData?.id) {
        const guestCartId = window.localStorage.getItem(CART_STORAGE_KEY);
        if (guestCartId) {
          try {
            // Attach guest cart to user account
            await attachCartToUser(guestCartId);
            // Clear guest cartId from localStorage after successful attach
            window.localStorage.removeItem(CART_STORAGE_KEY);
          } catch (attachError) {
            // If attach fails (e.g., cart is empty or already attached), just clear localStorage
            console.log("Could not attach cart (may be empty or already attached):", attachError);
            window.localStorage.removeItem(CART_STORAGE_KEY);
          }
        }
      }

      navigate("/home", { state: { user: meData } });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Login failed. Check e-mail or password.";
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
          <button
            onClick={() => navigate("/shop-the-look")}
            className="category-nav-item"
          >
            SHOP THE LOOK
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

                  <button className="details-menu-item" onClick={go("/wishlist")}>
                    Wishlist
                  </button>

                  {/* 🔐 Only for SALES_MANAGER / PRODUCT_MANAGER / SUPPORT_AGENT */}
                  {hasAdminAccess(user) && (
                    <button
                      className="details-menu-item"
                      onClick={go("/admin")}
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

      {/* main content */}
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
            <button type="submit" className="login-button">SIGN IN</button>
          </form>

          <p className="login-footer-text">
            Don’t have an account? <a href="/signup">Click here to create one.</a>
          </p>

          {userInfo && (
            <p className="login-footer-text">
              Logged in as <strong>{userInfo.emailAddress}</strong>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
