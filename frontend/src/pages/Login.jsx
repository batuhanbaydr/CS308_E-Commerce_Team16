import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequest, meRequest } from "../lib/api";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";

export default function Login() {
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [userInfo, setUserInfo] = useState(null);

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

      navigate("/home", { state: { user: meData } });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Login failed. Check e-mail or password.";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="home-page">
      <header className="home-topbar">
        <div className="home-left">
          <span className="home-brand" onClick={() => navigate("/home")}>TIDL</span>
        </div>

        <nav className="home-nav">
          <button className="home-nav-item" onClick={go("/category/sweatshirts")}>SWEATSHIRTS</button>
          <button className="home-nav-item" onClick={go("/category/shirts")}>SHIRTS</button>
          <button className="home-nav-item" onClick={go("/category/pants")}>PANTS</button>
          <button className="home-nav-item" onClick={go("/shop-the-look")}>SHOP THE LOOK</button>
        </nav>

        <div className="home-right">
          <img src={searchIcon} alt="search" className="home-icon" onClick={go("/search")} />

          {/* TOP-RIGHT: show greeting if logged in, otherwise SIGN IN */}
          {user ? (
            <span className="login-topbar-link" style={{ cursor: "default" }}>
              {`HEY! ${user.name}`}
            </span>
          ) : (
            <span className="home-signin" onClick={go("/login")}>SIGN IN</span>
          )}

          {/* Show menu only when logged in */}
          {user && (
            <div className="home-menu" onClick={() => setShowMenu((p) => !p)}>
              <span /><span /><span />
              {showMenu && (
                <div className="details-menu">
                  <button className="details-menu-item" onClick={go("/profile")}>Details</button>
                  <button className="details-menu-item" onClick={handleLogout}>Log-out</button>
                </div>
              )}
            </div>
          )}

          <img src={bagIcon} alt="bag" className="home-icon" onClick={go("/cart")} />
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
