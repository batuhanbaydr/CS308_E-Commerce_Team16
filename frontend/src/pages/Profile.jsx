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

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  } catch {
    return dateString;
  }
};

// Helper function to format currency
const formatCurrency = (amount) => {
  if (!amount) return "₺0,00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `₺${num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const [accountDetails, setAccountDetails] = useState({ email: "", phoneNumber: "", password: "••••••••" });
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState({ label: "", details: "" });
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [returns, setReturns] = useState([]);
  const [newReturn, setNewReturn] = useState({ orderId: "", reason: "" });
  const [cards, setCards] = useState([]);
  const [newCard, setNewCard] = useState({ label: "", holder: "", expiry: "" });
  const [editingCardId, setEditingCardId] = useState(null);
  const [passwordChange, setPasswordChange] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const { openCart } = useCartDrawer();
  const isEditingCard = editingCardId !== null;

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
        setUser({ id: userData.id, name: userData.name || "User", email: userData.emailAddress });

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
          const ordersData = ordersRes.data?.content || [];
          setOrders(ordersData.map(order => ({
            id: order.id,
            date: formatDate(order.createdAt),
            status: order.status || "UNKNOWN",
            total: formatCurrency(order.grandTotal),
            items: [],
          })));
        } catch (err) {
          console.error("Error fetching orders:", err);
          setOrders([]);
        }

        // Fetch returns (with error handling)
        try {
          const returnsRes = await getReturns(0, 100);
          const returnsData = returnsRes.data?.content || [];
          setReturns(returnsData.map(ret => ({
            id: ret.id,
            orderId: ret.orderId,
            date: formatDate(ret.createdAt),
            status: ret.status || "REQUESTED",
            reason: ret.reason || "",
          })));
        } catch (err) {
          console.error("Error fetching returns:", err);
          setReturns([]);
        }

        // Parse home address if available
        const addressesList = [];
        if (accountData.homeAddress) {
          addressesList.push({ id: 1, label: "Home", details: accountData.homeAddress });
        }
        
        // Also load additional addresses from localStorage
        if (userId) {
          try {
            const savedAddresses = localStorage.getItem(`addresses_${userId}`);
            if (savedAddresses) {
              const parsed = JSON.parse(savedAddresses);
              // Add addresses that are not Home (id !== 1)
              addressesList.push(...parsed.filter(addr => addr.id !== 1));
            }
          } catch (err) {
            console.error("Error loading addresses from localStorage:", err);
          }
        }
        
        setAddresses(addressesList);
        
        // Save addresses to localStorage for checkout page
        if (userId) {
          try {
            localStorage.setItem(`addresses_${userId}`, JSON.stringify(addressesList));
          } catch (err) {
            console.error("Error saving addresses to localStorage:", err);
          }
        }

        // Load payment methods from localStorage (using user ID as key)
        if (userId) {
          try {
            const savedCards = localStorage.getItem(`paymentMethods_${userId}`);
            if (savedCards) {
              setCards(JSON.parse(savedCards));
            }
          } catch (err) {
            console.error("Error loading payment methods from localStorage:", err);
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
          console.warn("Some data could not be loaded, but showing profile page anyway.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try { await logoutRequest(); } catch (err) { console.log("logout error (ignored):", err); }
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
      alert(err.response?.data?.message || "Failed to update account. Please try again.");
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
      await changePassword(passwordChange.currentPassword, passwordChange.newPassword);
      alert("Password changed successfully!");
      setPasswordChange({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error("Error changing password:", err);
      alert(err.response?.data?.message || "Failed to change password. Please try again.");
    }
  };
  const handleEditAddress = (address) => {
    if (!address || !address.id) {
      console.error("Invalid address object:", address);
      return;
    }
    console.log("Editing address:", address);
    setEditingAddressId(address.id);
    setNewAddress({ 
      label: address.label || "", 
      details: address.details || "" 
    });
  };

  const handleCancelEditAddress = () => {
    setEditingAddressId(null);
    setNewAddress({ label: "", details: "" });
  };

  const handleDeleteAddress = async (id) => {
    const address = addresses.find(a => a.id === id);
    if (!address) return;
    
    // If it's the home address, clear it
    if (address.label === "Home") {
      try {
        const userRes = await meRequest();
        const userData = userRes.data;
        await updateProfile(userData.name, "", userData.emailAddress);
        const updatedAddresses = addresses.filter((a) => a.id !== id);
        setAddresses(updatedAddresses);
        
        // Update localStorage
        if (userData.id) {
          try {
            localStorage.setItem(`addresses_${userData.id}`, JSON.stringify(updatedAddresses));
          } catch (err) {
            console.error("Error updating localStorage:", err);
          }
        }
        
        alert("Address deleted successfully!");
      } catch (err) {
        console.error("Error deleting address:", err);
        alert("Failed to delete address. Please try again.");
      }
    } else {
      setAddresses((prev) => {
        const updated = prev.filter((a) => a.id !== id);
        // Update localStorage
        if (user && user.id) {
          try {
            localStorage.setItem(`addresses_${user.id}`, JSON.stringify(updated));
          } catch (err) {
            console.error("Error updating localStorage:", err);
          }
        }
        return updated;
      });
      
      alert("Address deleted successfully!");
    }
  };

  const handleNewAddressSubmit = async (event) => {
    event.preventDefault();
    if (!newAddress.label.trim() || !newAddress.details.trim()) {
      alert("Please fill in all fields!");
      return;
    }

    try {
      const userRes = await meRequest();
      const userData = userRes.data;
      
      if (editingAddressId) {
        // Update existing address
        if (newAddress.label === "Home") {
          // Update homeAddress in backend
          await updateProfile(userData.name, newAddress.details.trim(), userData.emailAddress);
          setAddresses((prev) => {
            const updated = prev.map((a) => 
              a.id === editingAddressId 
                ? { ...a, label: newAddress.label.trim(), details: newAddress.details.trim() }
                : a
            );
            // Update localStorage
            if (userData.id) {
              try {
                localStorage.setItem(`addresses_${userData.id}`, JSON.stringify(updated));
              } catch (err) {
                console.error("Error updating localStorage:", err);
              }
            }
            return updated;
          });
        } else {
          // For other addresses, just update locally (since backend only supports homeAddress)
          setAddresses((prev) => {
            const updated = prev.map((a) => 
              a.id === editingAddressId 
                ? { ...a, label: newAddress.label.trim(), details: newAddress.details.trim() }
                : a
            );
            // Update localStorage
            if (userData.id) {
              try {
                localStorage.setItem(`addresses_${userData.id}`, JSON.stringify(updated));
              } catch (err) {
                console.error("Error updating address in localStorage:", err);
              }
            }
            return updated;
          });
        }
        alert("Address updated successfully!");
      } else {
        // Add new address
        if (newAddress.label === "Home") {
          // Update homeAddress in backend
          await updateProfile(userData.name, newAddress.details.trim(), userData.emailAddress);
          const homeAddr = { id: 1, label: "Home", details: newAddress.details.trim() };
          setAddresses([homeAddr]);
          
          // Update localStorage
          if (userData.id) {
            try {
              // Get other addresses from localStorage
              const savedAddresses = localStorage.getItem(`addresses_${userData.id}`);
              let allAddresses = [homeAddr];
              if (savedAddresses) {
                const parsed = JSON.parse(savedAddresses);
                allAddresses.push(...parsed.filter(addr => addr.id !== 1));
              }
              localStorage.setItem(`addresses_${userData.id}`, JSON.stringify(allAddresses));
            } catch (err) {
              console.error("Error updating localStorage:", err);
            }
          }
        } else {
          // For other addresses, add locally
          const newAddr = { id: Date.now(), label: newAddress.label.trim(), details: newAddress.details.trim() };
          setAddresses((prev) => {
            const updated = [...prev, newAddr];
            // Save to localStorage
            if (userData.id) {
              try {
                localStorage.setItem(`addresses_${userData.id}`, JSON.stringify(updated));
              } catch (err) {
                console.error("Error saving address to localStorage:", err);
              }
            }
            return updated;
          });
        }
        alert("Address saved successfully!");
      }
      
      setNewAddress({ label: "", details: "" });
      setEditingAddressId(null);
    } catch (err) {
      console.error("Error saving address:", err);
      alert(err.response?.data?.message || "Failed to save address. Please try again.");
    }
  };
  const handleNewReturnSubmit = async (event) => {
    event.preventDefault();
    if (!newReturn.orderId.trim() || !newReturn.reason.trim()) {
      alert("Please fill in all fields!");
      return;
    }
    try {
      // For now, we'll send empty orderItemIds array - backend may require specific item IDs
      const response = await createReturn(newReturn.orderId.trim(), [], newReturn.reason.trim());
      console.log("Return request response:", response);
      alert("Return request submitted successfully!");
      
      // Refresh returns list
      const returnsRes = await getReturns(0, 100);
      const returnsData = returnsRes.data.content || [];
      setReturns(returnsData.map(ret => ({
        id: ret.id,
        orderId: ret.orderId,
        date: formatDate(ret.createdAt),
        status: ret.status || "REQUESTED",
        reason: ret.reason || "",
      })));
      
      setNewReturn({ orderId: "", reason: "" });
    } catch (err) {
      console.error("Error creating return:", err);
      console.error("Error response:", err.response);
      const errorMessage = err.response?.data?.message || err.message || "Failed to submit return request. Please try again.";
      alert(errorMessage);
    }
  };
  const handleEditCard = (card) => {
    setEditingCardId(card.id);
    setNewCard({ label: card.label, holder: card.holder, expiry: card.expiry });
  };
  const handleCancelEditCard = () => { setEditingCardId(null); setNewCard({ label: "", holder: "", expiry: "" }); };
  
  // Save cards to localStorage whenever cards change
  const saveCardsToLocalStorage = (cardsToSave) => {
    if (user && user.id) {
      try {
        localStorage.setItem(`paymentMethods_${user.id}`, JSON.stringify(cardsToSave));
      } catch (err) {
        console.error("Error saving payment methods to localStorage:", err);
      }
    }
  };

  const handleNewCardSubmit = (event) => {
    event.preventDefault();
    if (!newCard.label.trim() || !newCard.holder.trim() || !newCard.expiry.trim()) {
      alert("Please fill in all fields!");
      return;
    }
    const normalized = { label: newCard.label.trim(), holder: newCard.holder.trim(), expiry: newCard.expiry.trim() };
    let updatedCards;
    if (editingCardId) {
      updatedCards = cards.map((c) => (c.id === editingCardId ? { ...c, ...normalized } : c));
      setCards(updatedCards);
      setEditingCardId(null);
    } else {
      updatedCards = [...cards, { id: Date.now(), ...normalized }];
      setCards(updatedCards);
    }
    saveCardsToLocalStorage(updatedCards);
    setNewCard({ label: "", holder: "", expiry: "" });
    alert("Card saved successfully!");
  };
  
  const handleDeleteCard = (id) => {
    const updatedCards = cards.filter((c) => c.id !== id);
    setCards(updatedCards);
    saveCardsToLocalStorage(updatedCards);
    if (editingCardId === id) handleCancelEditCard();
    alert("Card deleted successfully!");
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
        <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>{error}</div>
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
          className="category-nav-item category-nav-item--active"
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
        <button
          onClick={() => navigate("/shop-the-look")}
          className="category-nav-item"
        >
          SHOP THE LOOK
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
                <button className="details-menu-item" onClick={go("/profile")}>
                  Details
                </button>
                <button className="details-menu-item" onClick={go("/wishlist")}>
                    Wishlist  
                </button>
                <button className="details-menu-item" onClick={handleLogout}>
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
          <h1 className="profile-heading">Hi, {user ? user.name : "there"}!</h1>
          <p className="profile-subheading">
            Manage your orders, account information, and saved preferences all in one place.
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
                  <li key={order.id} className="profile-list-item">
                    <div className="profile-list-item-header">
                      <span className="profile-pill">{order.status}</span>
                      <strong>{order.id}</strong>
                    </div>
                    <div className="profile-list-item-meta">
                      <span>{order.date}</span>
                      <span>{order.total}</span>
                    </div>
                    {order.items && order.items.length > 0 && (
                      <p className="profile-list-item-description">{order.items.join(", ")}</p>
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
                <input type="email" name="email" value={accountDetails.email} onChange={handleAccountChange} required />
              </label>
              <label className="profile-field">
                <span>Phone Number</span>
                <input type="tel" name="phoneNumber" value={accountDetails.phoneNumber} onChange={handleAccountChange} required />
              </label>
              <button type="submit" className="profile-button">Save Changes</button>
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
                  onChange={(e) => setPasswordChange(prev => ({ ...prev, currentPassword: e.target.value }))} 
                  required 
                />
              </label>
              <label className="profile-field">
                <span>New Password</span>
                <input 
                  type="password" 
                  value={passwordChange.newPassword} 
                  onChange={(e) => setPasswordChange(prev => ({ ...prev, newPassword: e.target.value }))} 
                  required 
                />
              </label>
              <label className="profile-field">
                <span>Confirm New Password</span>
                <input 
                  type="password" 
                  value={passwordChange.confirmPassword} 
                  onChange={(e) => setPasswordChange(prev => ({ ...prev, confirmPassword: e.target.value }))} 
                  required 
                />
              </label>
              <button type="submit" className="profile-button">Change Password</button>
            </form>
          </div>
        </section>

        {/* Addresses */}
        <section className="profile-card profile-card-grid">
          <div>
            <header className="profile-card-header"><h2>Addresses</h2></header>
            <div className="profile-card-body">
              <ul className="profile-list">
                {addresses.map((address) => (
                  <li key={address.id} className="profile-list-item">
                    <div className="profile-list-item-header"><strong>{address.label}</strong></div>
                    <p className="profile-list-item-description">{address.details}</p>
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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 7h14M9 7v10m6-10v10M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M8 7h8l-.7 11a1 1 0 0 1-1 .9h-4.6a1 1 0 0 1-1-.9L8 7Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
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
              <p>{editingAddressId ? "Update the selected address" : "Store another delivery location"}</p>
            </header>
            <div className="profile-card-body">
              <form className="profile-form" onSubmit={handleNewAddressSubmit}>
                <label className="profile-field">
                  <span>Label</span>
                  <input 
                    type="text" 
                    value={newAddress.label} 
                    onChange={(e) => setNewAddress((p) => ({ ...p, label: e.target.value }))} 
                    placeholder="Home, Work..." 
                    required 
                  />
                </label>
                <label className="profile-field">
                  <span>Address</span>
                  <textarea 
                    rows={3} 
                    value={newAddress.details} 
                    onChange={(e) => setNewAddress((p) => ({ ...p, details: e.target.value }))} 
                    placeholder="Street, City, ZIP" 
                    required 
                  />
                </label>
                <div className="profile-form-actions" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <button 
                    type="submit" 
                    className="profile-button"
                    style={{ 
                      padding: "0.5rem 1.25rem",
                      fontSize: "0.875rem",
                      flex: editingAddressId ? "1" : "none"
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
                        whiteSpace: "nowrap"
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
                        <span className="profile-pill muted">{item.status}</span>
                      </div>
                      <div className="profile-list-item-meta">
                        <span>{item.id}</span>
                        <span>{item.date}</span>
                      </div>
                      <p className="profile-list-item-description">Reason: {item.reason}</p>
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
                      onChange={(e) => setNewReturn((p) => ({ ...p, orderId: e.target.value }))}
                      required
                      style={{ width: "100%", padding: "0.5rem", fontSize: "1rem", border: "1px solid #ccc", borderRadius: "4px" }}
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
                      onChange={(e) => setNewReturn((p) => ({ ...p, orderId: e.target.value }))} 
                      placeholder="Enter order ID (e.g., ORD-XXXX)" 
                      required 
                    />
                  )}
                  {orders.length === 0 && (
                    <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
                      No orders available. Please make an order first.
                    </p>
                  )}
                </label>
                <label className="profile-field">
                  <span>Reason</span>
                  <textarea 
                    rows={3} 
                    value={newReturn.reason} 
                    onChange={(e) => setNewReturn((p) => ({ ...p, reason: e.target.value }))} 
                    placeholder="Describe the issue" 
                    required 
                  />
                </label>
                <button type="submit" className="profile-button" disabled={orders.length === 0}>
                  Submit Request
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Payment methods */}
        <section className="profile-card profile-card-grid">
          <div>
            <header className="profile-card-header"><h2>Payment Methods</h2></header>
            <div className="profile-card-body">
              <ul className="profile-list">
                {cards.map((card) => (
                  <li key={card.id} className="profile-list-item">
                    <div className="profile-list-item-header">
                      <strong>{card.label}</strong>
                      <span>{card.expiry}</span>
                    </div>
                    <p className="profile-list-item-description">Cardholder: {card.holder}</p>
                    <div className="profile-list-item-actions">
                      <button className="profile-link-button" type="button" onClick={() => handleEditCard(card)}>Edit Card</button>
                      <button type="button" className="profile-icon-button" aria-label="Delete card" onClick={() => handleDeleteCard(card.id)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 7h14M9 7v10m6-10v10M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M8 7h8l-.7 11a1 1 0 0 1-1 .9h-4.6a1 1 0 0 1-1-.9L8 7Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* add / edit card */}
          <div>
            <header className="profile-card-header">
              <h3>{isEditingCard ? "Edit Card" : "Add Credit/Debit Card"}</h3>
            </header>
            <div className="profile-card-body">
              <form className="profile-form" onSubmit={handleNewCardSubmit}>
                <label className="profile-field">
                  <span>Card Number</span>
                  <input 
                    type="text" 
                    value={newCard.label} 
                    onChange={(e) => {
                      // Only allow digits, max 16 characters
                      let value = e.target.value.replace(/\D/g, '').slice(0, 16);
                      
                      // Add space after every 4 digits
                      value = value.replace(/(.{4})/g, '$1 ').trim();
                      
                      setNewCard((p) => ({ ...p, label: value }));
                    }} 
                    placeholder="1234 5678 9012 3456" 
                    required 
                  />
                </label>
                <label className="profile-field">
                  <span>Cardholder Name</span>
                  <input type="text" value={newCard.holder} onChange={(e) => setNewCard((p) => ({ ...p, holder: e.target.value }))} placeholder="Name on card" required />
                </label>
                <label className="profile-field">
                  <span>Expiry Date</span>
                  <input 
                    type="text" 
                    value={newCard.expiry} 
                    onChange={(e) => {
                      // Only allow digits
                      let value = e.target.value.replace(/\D/g, '');
                      
                      // Format as MM/YY (max 4 digits)
                      if (value.length > 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2, 4);
                      }
                      
                      setNewCard((p) => ({ ...p, expiry: value }));
                    }} 
                    placeholder="MM/YY" 
                    maxLength={5}
                    required 
                  />
                </label>
                <div className="profile-form-actions" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <button 
                    type="submit" 
                    className="profile-button"
                    style={{ 
                      padding: "0.5rem 1.25rem",
                      fontSize: "0.875rem",
                      flex: isEditingCard ? "1" : "none"
                    }}
                  >
                    {isEditingCard ? "Update Card" : "Save Card"}
                  </button>
                  {isEditingCard && (
                    <button 
                      type="button" 
                      className="profile-link-button secondary" 
                      onClick={handleCancelEditCard}
                      style={{
                        padding: "0.5rem 1rem",
                        fontSize: "0.875rem",
                        border: "1px solid #e5e5e5",
                        borderRadius: "4px",
                        backgroundColor: "#fff",
                        color: "#301813",
                        cursor: "pointer",
                        whiteSpace: "nowrap"
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

        {/* bottom logout */}
        <section className="profile-card profile-logout-card">
          <button className="profile-button secondary logout-button" type="button" onClick={() => navigate("/login")}>
            Log Out
          </button>
        </section>
      </main>
    </div>
  );
}
