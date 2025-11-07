
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import { logoutRequest } from "../lib/api";

export default function Home() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch (err) {
      // even if logout fails, we can still push to login
      console.log("logout error (ignored):", err);
    }
    navigate("/login");
  };

  return (
    <div className="login-page">
      {/* top bar */}
      <header className="login-topbar">
        {/* LEFT: search icon */}
        <img
          src={searchIcon}
          alt="search"
          style={{ width: 22, height: 22, objectFit: "contain", cursor: "pointer" }}
        />

        {/* CENTER: PROFILE (instead of SIGN IN) */}
        <div className="profile-wrapper">
          <button
            type="button"
            className="profile-button"
            onClick={() => setShowProfileMenu((p) => !p)}
          >
            PROFILE
          </button>

          {showProfileMenu && (
            <div className="profile-menu">
              <button className="profile-menu-item" onClick={handleLogout}>
                Log out
              </button>
            </div>
          )}
        </div>

        {/* little menu icon, same as login */}
        <div className="login-menu-icon">
          <span />
          <span />
          <span />
        </div>

        {/* RIGHT: bag icon */}
        <img
          src={bagIcon}
          alt="bag"
          style={{ width: 24, height: 24, objectFit: "contain", cursor: "pointer" }}
        />
      </header>

      {/* main content */}
      <main className="login-wrapper">
        <div className="login-card">
          <h1 className="login-title">Welcome!</h1>
          <p className="login-subtitle">You are now logged in. This is your home page.</p>
        </div>
      </main>
    </div>
  );

}
