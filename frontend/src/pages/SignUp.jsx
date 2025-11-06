import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signupRequest } from "../lib/api";

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
    <div className="login-page">
      <header className="login-topbar">
        <span
          className="login-topbar-link"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/login")}
        >
          LOG IN
        </span>
        <div className="login-menu-icon">
          <span />
          <span />
          <span />
        </div>
      </header>

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
