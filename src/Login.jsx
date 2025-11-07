import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequest, meRequest } from "../lib/api";

export default function Login() {
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [userInfo, setUserInfo] = useState(null);

  const navigate = useNavigate(); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      
      await loginRequest(emailAddress, password);
      
      const { data } = await meRequest();
      setUserInfo(data);
      navigate("/profile");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Login failed. Check e-mail or password.";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="login-page">
      
      <header className="login-topbar">
        <span
          className="login-topbar-link"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/signup")}
        >
          SIGN IN
        </span>
        <div className="login-menu-icon">
          <span />
          <span />
          <span />
        </div>
      </header>

      
      <main className="login-wrapper">
        <div className="login-card">
          <h1 className="login-title">LOGIN</h1>
          <p className="login-subtitle">
            Please enter your e-mail and password:
          </p>

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
            <a href="/signup">Click here to create one.</a>
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
