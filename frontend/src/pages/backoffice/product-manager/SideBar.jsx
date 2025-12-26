import { NavLink } from "react-router-dom";

const base = "/backoffice/product-manager";

const items = [
  { label: "Products", to: `${base}/products` },
  { label: "Categories", to: `${base}/categories` },
  { label: "Stock", to: `${base}/stock` },
  { label: "Orders", to: `${base}/orders` },
  { label: "Deliveries", to: `${base}/deliveries` },
  { label: "Invoices", to: `${base}/invoice` },
  { label: "Comments", to: `${base}/comments` },
];

export default function Sidebar() {
  return (
    <aside className="pm-sidebar">
      <h2 className="pm-sidebar-title">Product Manager Dashboard</h2>

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
