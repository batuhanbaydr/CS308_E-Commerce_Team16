// src/pages/SignUp.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signupRequest } from "../lib/api";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";

export default function SignUp() {
  const [form, setForm] = useState({
    name: "",
    emailAddress: "",
    password: "",
    confirmPassword: "",
    homeAddress: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  // 🔧 Added for the unified top bar (no signup logic changes):
  const [user, setUser] = useState(null);          // for greeting if you later wire /me
  const { openCart } = useCartDrawer();
  const [showMenu, setShowMenu] = useState(false); // dropdown toggle
  const go = (path) => () => navigate(path);
  const handleLogout = () => {
    setUser(null);
    navigate("/login");
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    

    if (form.password !== form.confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      await signupRequest({
        name: form.name,
        emailAddress: form.emailAddress,
        password: form.password,
        homeAddress: form.homeAddress,
      });

      setSuccessMsg("Account created successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Signup failed. Please try again.";
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
            className="category-nav-item category-nav-item--active"
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

      {/* main content (unchanged logic) */}
      <main className="login-wrapper">
        <div className="login-card">
          <h1 className="login-title">SIGN UP</h1>
          <p className="login-subtitle">
            Please fill in your information to create an account:
          </p>

          {errorMsg && <p className="login-error">{errorMsg}</p>}
          {successMsg && (
            <p style={{ color: "#065f46", fontSize: 13 }}>{successMsg}</p>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <input
              className="login-input"
              type="text"
              name="name"
              placeholder="Your Name"
              value={form.name}
              onChange={handleChange}
              required
            />

            <input
              className="login-input"
              type="email"
              name="emailAddress"
              placeholder="E-mail"
              value={form.emailAddress}
              onChange={handleChange}
              required
            />

            <input
              className="login-input"
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />

            <input
              className="login-input"
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />

            <input
              className="login-input"
              type="text"
              name="homeAddress"
              placeholder="Home Address"
              value={form.homeAddress}
              onChange={handleChange}
              required
            />

            <button type="submit" className="login-button">
              SIGN UP
            </button>
          </form>

          <p className="login-footer-text">
            Already have an account?{" "}
            <a href="/login" style={{ textDecoration: "underline" }}>
              Log in here.
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
