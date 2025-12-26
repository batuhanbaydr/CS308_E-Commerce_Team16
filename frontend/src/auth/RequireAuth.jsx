import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function getUserRole(user) {
  if (!user) return null;
  if (user.role) return user.role;
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles[0];
  return null;
}

function getRoleHome(role) {
  switch (role) {
    case "PRODUCT_MANAGER":
      return "/backoffice/product";
    case "SALES_MANAGER":
      return "/backoffice/sales";
    case "SUPPORT_AGENT":
      return "/backoffice/support";
    default:
      return "/home";
  }
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

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  const role = getUserRole(user);

  if (allowedRoles?.length && (!role || !allowedRoles.includes(role))) {
    return <Navigate to={getRoleHome(role)} replace />;
  }

  return children;
}
