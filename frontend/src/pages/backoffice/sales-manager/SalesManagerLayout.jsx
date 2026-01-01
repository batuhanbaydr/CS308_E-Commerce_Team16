import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./SideBar";
import TopBar from "./TopBar";

import DiscountsTab from "./tabs/DiscountsTab";
import InvoicesTab from "./tabs/InvoicesTab";
import RevenueProfitTab from "./tabs/RevenueProfitTab";
import "../product-manager/productManager.css";

export default function SalesManagerLayout() {
  return (
    <div className="pm-layout" lang="en">
      <TopBar />

      <div className="pm-body">
        <Sidebar />

        <main className="pm-content">
          <Routes>
            <Route index element={<Navigate to="/backoffice/sales-manager/discounts" replace />} />
            <Route path="discounts" element={<DiscountsTab />} />
            <Route path="invoices" element={<InvoicesTab />} />
            <Route path="revenue-profit" element={<RevenueProfitTab />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

