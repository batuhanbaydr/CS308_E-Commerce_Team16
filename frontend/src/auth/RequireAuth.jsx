import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function getUserRole(user) {
  if (!user) return null;
  if (user.role) return user.role;
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles[0];
  return null;
}

export default function RequireAuth({ allowedRoles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        Loading...
      </div>
    );
  }

  // Not logged in -> go to login and preserve destination
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  const role = getUserRole(user);

  // Check if user has any of the allowed roles
  // Check both user.role and user.roles array
  const hasAllowedRole = allowedRoles?.length
    ? allowedRoles.some(
        (allowedRole) =>
          user.role === allowedRole ||
          (Array.isArray(user.roles) && user.roles.includes(allowedRole))
      )
    : true; // If no allowedRoles specified, allow all authenticated users

  // Logged in but role not allowed -> send to /home (or create a /403 page)
  if (allowedRoles?.length && !hasAllowedRole) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
