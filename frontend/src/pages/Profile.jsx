// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";
import {
  logoutRequest,
  meRequest,
  getAccountDetails,
  updateAccount,
  changePassword,
  getOrders,
  getReturns,
  createReturn,
  updateProfile
} from "../lib/api";

const hasAdminAccess = (user) =>
  user?.roles?.includes("SALES_MANAGER") ||
  user?.roles?.includes("PRODUCT_MANAGER") ||
  user?.roles?.includes("SUPPORT_AGENT") ||
  user?.role === "SALES_MANAGER" ||
  user?.role === "PRODUCT_MANAGER" ||
  user?.role === "SUPPORT_AGENT";

const getAdminRoute = (user) => {
  if (user?.roles?.includes("SALES_MANAGER") || user?.role === "SALES_MANAGER") {
    return "/backoffice/sales-manager";
  }
  if (user?.roles?.includes("PRODUCT_MANAGER") || user?.role === "PRODUCT_MANAGER") {
    return "/backoffice/product-manager";
  }
  if (user?.roles?.includes("SUPPORT_AGENT") || user?.role === "SUPPORT_AGENT") {
    return "/backoffice/support-manager";
  }
  return "/admin"; // fallback
};

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

// Helper function to format currency
const formatCurrency = (amount) => {
  if (!amount) return "₺0,00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `₺${num.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function Profile() {
  const navigate = useNavigate();

  // topbar menu (the 3-line icon)
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const go = (path) => () => navigate(path);

  // User and account states
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // profile states
  const [accountDetails, setAccountDetails] = useState({
    email: "",
    phoneNumber: "",
    password: "••••••••",
  });
  const [orders, setOrders] = useState([]);

  // ⭐ address state: label + line1 + city + district + zipCode
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState({
    label: "",
    line1: "",
    city: "",
    district: "",
    zipCode: "",
  });
  const [editingAddressId, setEditingAddressId] = useState(null);

  const [returns, setReturns] = useState([]);
  const [newReturn, setNewReturn] = useState({ orderId: "", reason: "" });
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const { openCart } = useCartDrawer();

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user info
        const userRes = await meRequest();
        const userData = userRes.data;
        const userId = userData.id;
        setUser({
          id: userData.id,
          name: userData.name || "User",
          email: userData.emailAddress,
        });

        // Fetch account details (with error handling)
        let accountData = {};
        try {
          const accountRes = await getAccountDetails();
          accountData = accountRes.data || {};
          setAccountDetails({
            email: accountData.emailAddress || userData.emailAddress || "",
            phoneNumber: accountData.phoneNumber || "",
            password: "••••••••",
          });
        } catch (err) {
          console.error("Error fetching account details:", err);
          // Use user data as fallback
          setAccountDetails({
            email: userData.emailAddress || "",
            phoneNumber: "",
            password: "••••••••",
          });
        }

        // Fetch orders (with error handling)
        try {
          const ordersRes = await getOrders(0, 100);
          console.log("Orders API response:", ordersRes.data); // Debug log
          
          // Handle different response formats: content array or direct array
          let ordersData = [];
          if (Array.isArray(ordersRes.data)) {
            ordersData = ordersRes.data;
          } else if (Array.isArray(ordersRes.data?.content)) {
            ordersData = ordersRes.data.content;
          } else if (ordersRes.data?.data && Array.isArray(ordersRes.data.data)) {
            ordersData = ordersRes.data.data;
          }
          
          console.log("Parsed orders data:", ordersData); // Debug log
          
          setOrders(
              ordersData.map((order) => ({
                id: order.id || order._id || "UNKNOWN",
                date: formatDate(order.createdAt || order.createdDate || order.date),
                status: order.status || "UNKNOWN",
                total: formatCurrency(
                  order.grandTotal || 
                  order.totals?.grandTotal || 
                  order.total || 
                  0
                ),
                items: order.items || order.orderItems || [],
              }))
          );
          
          console.log("Final orders state:", ordersData.length, "orders"); // Debug log
        } catch (err) {
          console.error("Error fetching orders:", err);
          console.error("Error details:", {
            message: err.message,
            status: err.response?.status,
            data: err.response?.data,
          });
          setOrders([]);
          // Show user-friendly error message
          if (err.response?.status === 401 || err.response?.status === 403) {
            console.warn("Authentication error while fetching orders");
          } else {
            console.warn("Failed to load orders. Please try refreshing the page.");
          }
        }

        // Fetch returns (with error handling)
        try {
          const returnsRes = await getReturns(0, 100);
          const returnsData = returnsRes.data?.content || [];
          setReturns(
              returnsData.map((ret) => ({
                id: ret.id,
                orderId: ret.orderId,
                date: formatDate(ret.createdAt),
                status: ret.status || "REQUESTED",
                reason: ret.reason || "",
              }))
          );
        } catch (err) {
          console.error("Error fetching returns:", err);
          setReturns([]);
        }

        // ⭐ Adresleri backend'ten gelen userData.addresses alanından oku
        const addressesFromBackend = (userData.addresses || []).map((addr) => ({
          id: addr.id,
          label: addr.label || "",
          line1: addr.line1 || "",
          city: addr.city || "",
          district: addr.state || "",
          zipCode: addr.zipCode || "",
        }));

        setAddresses(addressesFromBackend);

        // checkout için cache
        if (userId) {
          try {
            localStorage.setItem(
                `addresses_${userId}`,
                JSON.stringify(addressesFromBackend)
            );
          } catch (err) {
            console.error("Error saving addresses to localStorage:", err);
          }
        }

      } catch (err) {
        console.error("Error fetching user data:", err);
        // Only show error if it's a critical error (like user not found)
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          setError("Please log in to view your profile.");
          setTimeout(() => navigate("/login"), 2000);
        } else {
          // For other errors, still show the page but with a warning
          setError(null);
          console.warn(
              "Some data could not be loaded, but showing profile page anyway."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch (err) {
      console.log("logout error (ignored):", err);
    }
    navigate("/login");
  };

  // forms / list handlers
  const handleAccountChange = (event) => {
    const { name, value } = event.target;
    setAccountDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleAccountSubmit = async (event) => {
    event.preventDefault();
    try {
      await updateAccount(accountDetails.email, accountDetails.phoneNumber);
      alert("Account updated successfully!");
    } catch (err) {
      console.error("Error updating account:", err);
      alert(
          err.response?.data?.message ||
          "Failed to update account. Please try again."
      );
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    if (passwordChange.newPassword.length < 6) {
      alert("New password must be at least 6 characters!");
      return;
    }
    try {
      await changePassword(
          passwordChange.currentPassword,
          passwordChange.newPassword
      );
      alert("Password changed successfully!");
      setPasswordChange({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error("Error changing password:", err);
      alert(
          err.response?.data?.message ||
          "Failed to change password. Please try again."
      );
    }
  };

  // ⭐ Backend ile adres listesini senkronize eden helper
  const syncAddressesWithBackend = async (updatedAddresses) => {
    try {
      const meRes = await meRequest();
      const userData = meRes.data;

      await updateProfile({
        name: userData.name,
        emailAddress: userData.emailAddress,
        homeAddress: userData.homeAddress, // kullanmıyorsan backend ignore eder
        addresses: updatedAddresses.map((a) => ({
          id: a.id,
          label: a.label,
          fullName: "",
          line1: a.line1,
          line2: "",
          city: a.city,
          state: a.district,
          country: "Turkey",
          zipCode: a.zipCode,
          isDefault: false,
          phoneNumber: "",
        })),
      });

      setAddresses(updatedAddresses);

      if (userData.id) {
        try {
          localStorage.setItem(
              `addresses_${userData.id}`,
              JSON.stringify(updatedAddresses)
          );
        } catch (err) {
          console.error("Error saving addresses to localStorage:", err);
        }
      }
    } catch (err) {
      console.error("Error syncing addresses with backend:", err);
      alert(
          err.response?.data?.message ||
          "Failed to save address. Please try again."
      );
    }
  };

  const handleEditAddress = (address) => {
    if (!address || !address.id) {
      console.error("Invalid address object:", address);
      return;
    }
    setEditingAddressId(address.id);
    setNewAddress({
      label: address.label || "",
      line1: address.line1 || "",
      city: address.city || "",
      district: address.district || "",
      zipCode: address.zipCode || "",
    });
  };

  const handleCancelEditAddress = () => {
    setEditingAddressId(null);
    setNewAddress({
      label: "",
      line1: "",
      city: "",
      district: "",
      zipCode: "",
    });
  };

  // ⭐ Silme: sadece listeyi filtrele + backend'e gönder
  const handleDeleteAddress = async (id) => {
    const updated = addresses.filter((a) => a.id !== id);
    await syncAddressesWithBackend(updated);
    alert("Address deleted successfully!");
  };

  // ⭐ Ekle / güncelle: backend tabanlı
  const handleNewAddressSubmit = async (event) => {
    event.preventDefault();

    const trimmed = {
      label: newAddress.label.trim(),
      line1: newAddress.line1.trim(),
      city: newAddress.city.trim(),
      district: newAddress.district.trim(),
      zipCode: newAddress.zipCode.trim(),
    };

    if (!trimmed.label || !trimmed.line1 || !trimmed.city || !trimmed.zipCode) {
      alert("Please fill in all required fields!");
      return;
    }

    let updated;

    if (editingAddressId) {
      // mevcut adresi güncelle
      updated = addresses.map((a) =>
          a.id === editingAddressId ? { ...a, ...trimmed } : a
      );
    } else {
      // yeni adres
      const newAddr = {
        id: Date.now().toString(), // basit unique id
        ...trimmed,
      };
      updated = [...addresses, newAddr];
    }

    await syncAddressesWithBackend(updated);

    alert(
        editingAddressId ? "Address updated successfully!" : "Address saved successfully!"
    );

    setNewAddress({
      label: "",
      line1: "",
      city: "",
      district: "",
      zipCode: "",
    });
    setEditingAddressId(null);
  };

  const handleNewReturnSubmit = async (event) => {
    event.preventDefault();
    if (!newReturn.orderId.trim() || !newReturn.reason.trim()) {
      alert("Please fill in all fields!");
      return;
    }
    try {
      // For now, we'll send empty orderItemIds array - backend may require specific item IDs
      const response = await createReturn(
          newReturn.orderId.trim(),
          [],
          newReturn.reason.trim()
      );
      console.log("Return request response:", response);
      alert("Return request submitted successfully!");

      // Refresh returns list
      const returnsRes = await getReturns(0, 100);
      const returnsData = returnsRes.data.content || [];
      setReturns(
          returnsData.map((ret) => ({
            id: ret.id,
            orderId: ret.orderId,
            date: formatDate(ret.createdAt),
            status: ret.status || "REQUESTED",
            reason: ret.reason || "",
          }))
      );

      setNewReturn({ orderId: "", reason: "" });
    } catch (err) {
      console.error("Error creating return:", err);
      console.error("Error response:", err.response);
      const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to submit return request. Please try again.";
      alert(errorMessage);
    }
  };


  if (loading) {
    return (
        <div className="home-page">
          <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="home-page">
          <div
              style={{ padding: "2rem", textAlign: "center", color: "red" }}
          >
            {error}
          </div>
        </div>
    );
  }

  return (
      <div className="category-page">
        <header className="category-topbar">
          <button className="category-brand" onClick={() => navigate("/home")}>
            TIDL
          </button>
          <nav className="category-nav">
            <button
                onClick={() => navigate("/category/sweatshirts")}
                className="category-nav-item"
            >
              SWEATSHIRTS
            </button>
            <button
                onClick={() => navigate("/category/shirts")}
                className="category-nav-item"
            >
              SHIRTS
            </button>
            <button
                onClick={() => navigate("/category/pants")}
                className="category-nav-item"
            >
              PANTS
            </button>

          </nav>

          <div className="category-actions">
            <img
                src={searchIcon}
                alt="Search"
                className="category-icon"
                onClick={() => navigate("/search")}
            />
            {user ? (
                <span
                    className="login-topbar-link"
                    style={{ cursor: "default", marginRight: "0.5rem" }}
                >
              {`HEY! ${user.name}`}
            </span>
            ) : (
                <span
                    className="home-signin"
                    onClick={() => navigate("/login")}
                    style={{ marginRight: "0.5rem", cursor: "pointer" }}
                >
              SIGN IN
            </span>
            )}

            {user && (
                <div
                    className="home-menu"
                    onClick={() => setShowProfileMenu((p) => !p)}
                    style={{ marginRight: "0.5rem" }}
                >
                  <span />
                  <span />
                  <span />
                  {showProfileMenu && (
                      <div className="details-menu">
                        <button
                            className="details-menu-item"
                            onClick={go("/profile")}
                        >
                          Details
                        </button>
                        <button
                            className="details-menu-item"
                            onClick={go("/wishlist")}
                        >
                          Wishlist
                        </button>
                        <button
                            className="details-menu-item"
                            onClick={handleLogout}
                        >
                          Log-out
                        </button>
                      </div>
                  )}
                </div>
            )}

            <img
                src={bagIcon}
                alt="Cart"
                className="category-icon"
                onClick={openCart}
            />
          </div>
        </header>

        {/* profile content */}
        <main className="profile-wrapper">
          <section className="profile-hero">
            <h1 className="profile-heading">
              Hi, {user ? user.name : "there"}!
            </h1>
            <p className="profile-subheading">
              Manage your orders, account information, and saved preferences all
              in one place.
            </p>
          </section>

          {/* Orders */}
          <section className="profile-card">
            <header className="profile-card-header">
              <h2>Orders</h2>
              <p>Orders with details</p>
            </header>
            <div className="profile-card-body">
              {orders.length === 0 ? (
                  <p style={{ color: "#666" }}>No orders found.</p>
              ) : (
                  <ul className="profile-list">
                    {orders.map((order) => (
                        <li 
                          key={order.id} 
                          className="profile-list-item"
                          style={{ cursor: "pointer" }}
                          onClick={() => navigate(`/invoice/${order.id}`)}
                        >
                          <div className="profile-list-item-header">
                            <span className="profile-pill">{order.status}</span>
                            <strong>Order #{order.id}</strong>
                          </div>
                          <div className="profile-list-item-meta">
                            <span>{order.date}</span>
                            <span>{order.total}</span>
                          </div>
                          {order.items && order.items.length > 0 && (
                              <p className="profile-list-item-description">
                                {Array.isArray(order.items) 
                                  ? order.items.map(item => 
                                      typeof item === 'string' 
                                        ? item 
                                        : item.name || item.productName || `Item (${item.quantity || 1}x)`
                                    ).join(", ")
                                  : String(order.items)
                                }
                              </p>
                          )}
                        </li>
                    ))}
                  </ul>
              )}
            </div>
          </section>

          {/* Account details */}
          <section className="profile-card">
            <header className="profile-card-header">
              <h2>Account Details</h2>
            </header>
            <div className="profile-card-body">
              <form className="profile-form" onSubmit={handleAccountSubmit}>
                <label className="profile-field">
                  <span>Email</span>
                  <input
                      type="email"
                      name="email"
                      value={accountDetails.email}
                      onChange={handleAccountChange}
                      required
                  />
                </label>
                <label className="profile-field">
                  <span>Phone Number</span>
                  <input
                      type="tel"
                      name="phoneNumber"
                      value={accountDetails.phoneNumber}
                      onChange={handleAccountChange}
                      required
                  />
                </label>
                <button type="submit" className="profile-button">
                  Save Changes
                </button>
              </form>
            </div>
          </section>

          {/* Change Password */}
          <section className="profile-card">
            <header className="profile-card-header">
              <h2>Change Password</h2>
            </header>
            <div className="profile-card-body">
              <form className="profile-form" onSubmit={handlePasswordChange}>
                <label className="profile-field">
                  <span>Current Password</span>
                  <input
                      type="password"
                      value={passwordChange.currentPassword}
                      onChange={(e) =>
                          setPasswordChange((prev) => ({
                            ...prev,
                            currentPassword: e.target.value,
                          }))
                      }
                      required
                  />
                </label>
                <label className="profile-field">
                  <span>New Password</span>
                  <input
                      type="password"
                      value={passwordChange.newPassword}
                      onChange={(e) =>
                          setPasswordChange((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                      }
                      required
                  />
                </label>
                <label className="profile-field">
                  <span>Confirm New Password</span>
                  <input
                      type="password"
                      value={passwordChange.confirmPassword}
                      onChange={(e) =>
                          setPasswordChange((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                      }
                      required
                  />
                </label>
                <button type="submit" className="profile-button">
                  Change Password
                </button>
              </form>
            </div>
          </section>

          {/* Addresses */}
          <section className="profile-card profile-card-grid">
            <div>
              <header className="profile-card-header">
                <h2>Addresses</h2>
              </header>
              <div className="profile-card-body">
                <ul className="profile-list">
                  {addresses.map((address) => (
                      <li key={address.id} className="profile-list-item">
                        <div className="profile-list-item-header">
                          <strong>{address.label}</strong>
                        </div>
                        <p className="profile-list-item-description">
                          {address.line1}
                          <br />
                          {(address.zipCode || address.city) && (
                              <>
                                {address.zipCode && `${address.zipCode} `}
                                {address.city}
                              </>
                          )}
                          {address.district && (
                              <>
                                <br />
                                {address.district}
                              </>
                          )}
                        </p>
                        <div className="profile-list-item-actions">
                          <button
                              className="profile-link-button"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEditAddress(address);
                              }}
                          >
                            Edit Address
                          </button>
                          <button
                              type="button"
                              className="profile-icon-button"
                              aria-label="Delete address"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteAddress(address.id);
                              }}
                          >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                  d="M5 7h14M9 7v10m6-10v10M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                              />
                              <path
                                  d="M8 7h8l-.7 11a1 1 0 0 1-1 .9h-4.6a1 1 0 0 1-1-.9L8 7Z"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.4"
                                  strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* add new address / edit address */}
            <div>
              <header className="profile-card-header">
                <h3>{editingAddressId ? "Edit Address" : "Add New Address"}</h3>
                <p>
                  {editingAddressId
                      ? "Update the selected address"
                      : "Store another delivery location"}
                </p>
              </header>
              <div className="profile-card-body">
                <form className="profile-form" onSubmit={handleNewAddressSubmit}>
                  <label className="profile-field">
                    <span>Label</span>
                    <input
                        type="text"
                        value={newAddress.label}
                        onChange={(e) =>
                            setNewAddress((p) => ({ ...p, label: e.target.value }))
                        }
                        placeholder="Home, Work..."
                        required
                    />
                  </label>

                  <label className="profile-field">
                    <span>Address Line 1</span>
                    <input
                        type="text"
                        value={newAddress.line1}
                        onChange={(e) =>
                            setNewAddress((p) => ({ ...p, line1: e.target.value }))
                        }
                        placeholder="Street and number"
                        required
                    />
                  </label>

                  <div
                      className="profile-field"
                      style={{ display: "flex", gap: "0.75rem" }}
                  >
                    <div style={{ flex: 1 }}>
                      <span style={{ display: "block", marginBottom: 4 }}>City</span>
                      <input
                          type="text"
                          value={newAddress.city}
                          onChange={(e) =>
                              setNewAddress((p) => ({ ...p, city: e.target.value }))
                          }
                          placeholder="City"
                          required
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                    <span style={{ display: "block", marginBottom: 4 }}>
                      District
                    </span>
                      <input
                          type="text"
                          value={newAddress.district}
                          onChange={(e) =>
                              setNewAddress((p) => ({
                                ...p,
                                district: e.target.value,
                              }))
                          }
                          placeholder="District"
                      />
                    </div>
                    <div style={{ flexBasis: "140px" }}>
                    <span style={{ display: "block", marginBottom: 4 }}>
                      ZIP Code
                    </span>
                      <input
                          type="text"
                          value={newAddress.zipCode}
                          onChange={(e) =>
                              setNewAddress((p) => ({
                                ...p,
                                zipCode: e.target.value,
                              }))
                          }
                          placeholder="ZIP"
                          required
                      />
                    </div>
                  </div>

                  <div
                      className="profile-form-actions"
                      style={{
                        display: "flex",
                        gap: "0.75rem",
                        alignItems: "center",
                      }}
                  >
                    <button
                        type="submit"
                        className="profile-button"
                        style={{
                          padding: "0.5rem 1.25rem",
                          fontSize: "0.875rem",
                          flex: editingAddressId ? "1" : "none",
                        }}
                    >
                      {editingAddressId ? "Update Address" : "Save Address"}
                    </button>
                    {editingAddressId && (
                        <button
                            type="button"
                            className="profile-link-button secondary"
                            onClick={handleCancelEditAddress}
                            style={{
                              padding: "0.5rem 1rem",
                              fontSize: "0.875rem",
                              border: "1px solid #e5e5e5",
                              borderRadius: "4px",
                              backgroundColor: "#fff",
                              color: "#301813",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                        >
                          Cancel
                        </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </section>

          {/* Returns */}
          <section className="profile-card profile-card-grid">
            <div>
              <header className="profile-card-header">
                <h2>Returns</h2>
                <p>Track previous requests</p>
              </header>
              <div className="profile-card-body">
                {returns.length === 0 ? (
                    <p style={{ color: "#666" }}>No return requests found.</p>
                ) : (
                    <ul className="profile-list">
                      {returns.map((item) => (
                          <li key={item.id} className="profile-list-item">
                            <div className="profile-list-item-header">
                              <strong>{item.orderId}</strong>
                              <span className="profile-pill muted">
                          {item.status}
                        </span>
                            </div>
                            <div className="profile-list-item-meta">
                              <span>{item.id}</span>
                              <span>{item.date}</span>
                            </div>
                            <p className="profile-list-item-description">
                              Reason: {item.reason}
                            </p>
                          </li>
                      ))}
                    </ul>
                )}
              </div>
            </div>

            {/* new return */}
            <div>
              <header className="profile-card-header">
                <h3>New Return Request</h3>
              </header>
              <div className="profile-card-body">
                <form className="profile-form" onSubmit={handleNewReturnSubmit}>
                  <label className="profile-field">
                    <span>Order Number</span>
                    {orders.length > 0 ? (
                        <select
                            value={newReturn.orderId}
                            onChange={(e) =>
                                setNewReturn((p) => ({
                                  ...p,
                                  orderId: e.target.value,
                                }))
                            }
                            required
                            style={{
                              width: "100%",
                              padding: "0.5rem",
                              fontSize: "1rem",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                            }}
                        >
                          <option value="">Select an order...</option>
                          {orders.map((order) => (
                              <option key={order.id} value={order.id}>
                                {order.id} - {order.date} - {order.total}
                              </option>
                          ))}
                        </select>
                    ) : (
                        <input
                            type="text"
                            value={newReturn.orderId}
                            onChange={(e) =>
                                setNewReturn((p) => ({
                                  ...p,
                                  orderId: e.target.value,
                                }))
                            }
                            placeholder="Enter order ID (e.g., ORD-XXXX)"
                            required
                        />
                    )}
                    {orders.length === 0 && (
                        <p
                            style={{
                              fontSize: "0.875rem",
                              color: "#666",
                              marginTop: "0.25rem",
                            }}
                        >
                          No orders available. Please make an order first.
                        </p>
                    )}
                  </label>
                  <label className="profile-field">
                    <span>Reason</span>
                    <textarea
                        rows={3}
                        value={newReturn.reason}
                        onChange={(e) =>
                            setNewReturn((p) => ({ ...p, reason: e.target.value }))
                        }
                        placeholder="Describe the issue"
                        required
                    />
                  </label>
                  <button
                      type="submit"
                      className="profile-button"
                      disabled={orders.length === 0}
                  >
                    Submit Request
                  </button>
                </form>
              </div>
            </div>
          </section>

          {/* bottom logout */}
          <section className="profile-card profile-logout-card">
            <button
                className="profile-button secondary logout-button"
                type="button"
                onClick={() => navigate("/login")}
            >
              Log Out
            </button>
          </section>
        </main>
      </div>
  );
}