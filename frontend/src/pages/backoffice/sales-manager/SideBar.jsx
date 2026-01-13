// src/pages/backoffice/sales-manager/SideBar.jsx
import { NavLink } from "react-router-dom";

const base = "/backoffice/sales-manager";

const items = [
  { label: "Discounts", to: `${base}/discounts` },
  { label: "Manual Prices", to: `${base}/price-overrides` }, // 👈 NEW
  { label: "Invoices", to: `${base}/invoices` },
  { label: "Revenue & Profit", to: `${base}/revenue-profit` },
  { label: "Refunds", to: `${base}/refunds` },
];

export default function Sidebar() {
  return (
    <aside className="pm-sidebar">
      <h2 className="pm-sidebar-title">Sales Manager Dashboard</h2>

      <nav className="pm-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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