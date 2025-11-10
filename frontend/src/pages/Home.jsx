import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { meRequest, logoutRequest } from "../lib/api";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";

export default function Home() {
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1) if login sent the user, use it
    if (location.state?.user) {
      setUser(location.state.user);
      return;
    }

    // 2) otherwise fetch from backend
    async function fetchUser() {
      try {
        const { data } = await meRequest();
        setUser(data);
      } catch (err) {
        console.error("Not logged in:", err);
        navigate("/login");
      }
    }
    fetchUser();
  }, [location.state, navigate]);

  const goToDetails = () => {
    navigate("/profile");
  };


  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch (e) {
      // ignore
    }
    navigate("/login");
  };

  return (
    <div className="login-page">
      <header className="login-topbar">
        <img src={searchIcon} alt="search" style={{ width: 22, height: 22 }} />

        <span className="login-topbar-link" style={{ cursor: "default" }}>
          {user ? `HEY! ${user.name}` : "HEY!"}
        </span>

        <div
          className="login-menu-icon"
          onClick={() => setShowMenu((p) => !p)}
          style={{ cursor: "pointer" }}
        >
          <span />
          <span />
          <span />
        </div>

        {showMenu && (
          <div className="details-menu">
            <button className="details-menu-item" onClick={goToDetails}>
              Details
            </button>
            <button className="details-menu-item" onClick={handleLogout}>
              Log-out
            </button>
          </div>
        )}

        <img src={bagIcon} alt="bag" style={{ width: 24, height: 24 }} />
      </header>

      <main className="login-wrapper">
        <h1 className="login-title">Welcome!</h1>
        <p className="login-subtitle">
          {user ? `Nice to see you, ${user.name}!` : "Loading your account..."}
        </p>
      </main>
    </div>
  );
}
