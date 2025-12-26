import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";

import ProductsTab from "./tabs/ProductsTab";
import CategoriesTab from "./tabs/CategoriesTab";
import StockTab from "./tabs/StockTab";
import OrdersTab from "./tabs/OrdersTab";
import DeliveriesTab from "./tabs/DeliveriesTab";
import CommentsTab from "./tabs/CommentsTab";
import "./productManager.css";




export default function ProductManagerLayout() {
  return (
    <div className="pm-layout">
      <TopBar />

      <div className="pm-body">
        <Sidebar />

        <main className="pm-content">
          <Routes>
            <Route index element={<Navigate to="/backoffice/product-manager/products" replace />} />
            <Route index element={<Navigate to="products" replace />} />
            <Route path="products" element={<ProductsTab />} />
            <Route path="categories" element={<CategoriesTab />} />
            <Route path="stock" element={<StockTab />} />
            <Route path="orders" element={<OrdersTab />} />
            <Route path="deliveries" element={<DeliveriesTab />} />
            <Route path="comments" element={<CommentsTab />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
