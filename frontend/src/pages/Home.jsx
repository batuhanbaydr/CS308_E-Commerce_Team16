import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { meRequest, logoutRequest } from "../lib/api";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import sweatshirt1 from "../assets/sweatshirt1.jpg";
import sweatshirt2 from "../assets/sweatshirt2.jpg";
import sweatpants1 from "../assets/sweatpants1.jpg";
import shirt1 from "../assets/shirt1.jpg";
import sweatshirt3 from "../assets/sweatshirt3.jpg";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";


export default function Home() {
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { openCart } = useCartDrawer();

  useEffect(() => {
    // If Login routed here with user in state, trust it
    if (location.state?.user) {
      setUser(location.state.user);
      return;
    }
    // Otherwise, *try* session lookup; if it fails, stay on Home as guest
    (async () => {
      try {
        const { data } = await meRequest();
        setUser(data);
      } catch {
        setUser(null); // guest mode
      }
    })();
  }, [location.state]);

  const go = (path) => () => navigate(path);
  const handleLogout = async () => {
    try { await logoutRequest(); } catch {}
    setUser(null); // back to guest
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
      
      <section className="hero">
        <div className="hero-ellipse" />
        <img src={sweatshirt1} alt="sweatshirt" className="hero-img hero-left" />
        <img src={sweatshirt2} alt="sweatshirt" className="hero-img hero-center" />
        <img src={sweatpants1} alt="sweatpants" className="hero-img hero-right" />
        <div className="hero-quote">LESS, BUT BETTER.</div>
      </section>

      {/* SECOND STRIP (on scroll) */}
      <section className="hero2">
        <img src={sweatshirt3} alt="sweatshirt" className="hero2-img hero2-left" />
        <div className="hero2-quote">QUIET MOMENTS IN<br/>MOTION.</div>
        <img src={shirt1} alt="shirt" className="hero2-img hero2-right" />
      </section>

    </div>
  );
}
