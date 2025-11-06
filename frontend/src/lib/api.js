// src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/api",   // your Spring Boot base
  withCredentials: true,                  // because backend uses session
  headers: {
    "Content-Type": "application/json",
  },
});

export function loginRequest(emailAddress, password) {
  // backend wants { emailAddress, password }
  return api.post("/auth/login", { emailAddress, password });
}

export function signupRequest(data) {
  // data must have: name, emailAddress, password, homeAddress
  return api.post("/auth/signup", data);
}

export function meRequest() {
  return api.get("/users/me");
}

export default api;
