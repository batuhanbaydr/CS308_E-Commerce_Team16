// src/pages/backoffice/support-manager/Sidebar.jsx
import { NavLink } from "react-router-dom";

const base = "/backoffice/support-manager";

const items = [
  { label: "Live Chat", to: base }, // single tab for now
];

export default function SupportSidebar() {
  return (
    <aside className="pm-sidebar">
      <h2 className="pm-sidebar-title">Support Agent Dashboard</h2>

      <nav className="pm-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `pm-nav-item ${isActive ? "active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}