// src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export function loginRequest(emailAddress, password) {
  // IMPORTANT: backend expects emailAddress
  return api.post("/auth/login", { emailAddress, password });
}

export function signupRequest(data) {
  return api.post("/auth/signup", data);
}

export function meRequest() {
  return api.get("/users/me");
}


export function logoutRequest() {
  return api.post("/auth/logout");
}

export default api;
