// src/pages/Profile.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CategoryTopbar from "../components/CategoryTopbar.jsx";
import {
    logoutRequest,
    meRequest,
    getAccountDetails,
    updateAccount,
    changePassword,
    getOrders,
    getRefundsMe,
    createRefundRequest,
    getOrderDetail,
    updateProfile,
    cancelOrder,
} from "../lib/api";

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

const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === "") return "$0.00";

    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (Number.isNaN(num)) return "$0.00";

    return num.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};
// Safely read item fields from different backend shapes
function normalizeOrderItems(itemsRaw) {
    if (!Array.isArray(itemsRaw)) return [];

    return itemsRaw
        .map((it) => {
            if (!it || typeof it !== "object") return null;

            const productId = it.productId || it.product?.id || it.product?._id || it.product?._id?.toString?.();
            const sku = it.sku || it.variantSku || it.variant?.sku;
            const quantity = Number(it.quantity ?? it.qty ?? 1) || 1;
            const name = it.productName || it.name || it.product?.name || "Item";

            if (!productId || !sku) return null;

            return { productId, sku, quantity, name };
        })
        .filter(Boolean);
}

export default function Profile() {
    const navigate = useNavigate();

    // User and account states
    const [user, setUser] = useState(null);
    const [taxId, setTaxId] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // profile states
    const [accountDetails, setAccountDetails] = useState({
        email: "",
        phoneNumber: "",
        password: "••••••••",
    });

    const [orders, setOrders] = useState([]);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState(null); // ✅ ekle

    // Cancel loading state per order
    const [cancellingIds, setCancellingIds] = useState({});

    // Addresses
    const [addresses, setAddresses] = useState([]);
    const [newAddress, setNewAddress] = useState({
        label: "",
        line1: "",
        city: "",
        district: "",
        zipCode: "",
    });
    const [editingAddressId, setEditingAddressId] = useState(null);

    // ✅ Refunds (Customer)
    const [refunds, setRefunds] = useState([]);
    const [newRefund, setNewRefund] = useState({
        orderId: "",
        productKey: "", // "productId::sku"
        quantity: 1,
        reason: "",
    });

    const [passwordChange, setPasswordChange] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // Eligible orders: DELIVERED + within 30 days
    const refundableOrders = useMemo(() => {
        return orders.filter((o) => {
            const st = (o.status || "").toUpperCase();
            if (st !== "DELIVERED") return false;

            // UI filter for 30 days (backend already enforces too)
            const created = o.createdAtRaw ? new Date(o.createdAtRaw) : null;
            if (!created || Number.isNaN(created.getTime())) return true;

            const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays <= 30;
        });
    }, [orders]);

    const selectedOrderItems = useMemo(() => {
        return normalizeOrderItems(selectedOrderDetail?.items || []);
    }, [selectedOrderDetail]);

    useEffect(() => {
        const loadDetail = async () => {
            if (!newRefund.orderId) {
                setSelectedOrderDetail(null);
                return;
            }
            try {
                const res = await getOrderDetail(newRefund.orderId);
                setSelectedOrderDetail(res.data);
            } catch (e) {
                console.error("getOrderDetail failed:", e);
                setSelectedOrderDetail(null);
            }
        };

        loadDetail();
    }, [newRefund.orderId]);

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
                // ⭐ Generate a MOCK TAX ID for demo purposes
                const mockTaxId = userData.id
                    ? `TAX-${String(userData.id).slice(0, 3).toUpperCase()}-${String(userData.id)
                        .slice(-3)
                        .toUpperCase()}`
                    : "TAX-000-000";

                setTaxId(mockTaxId);

                // Fetch account details
                try {
                    const accountRes = await getAccountDetails();
                    const accountData = accountRes.data || {};
                    setAccountDetails({
                        email: accountData.emailAddress || userData.emailAddress || "",
                        phoneNumber: accountData.phoneNumber || "",
                        password: "••••••••",
                    });
                } catch (err) {
                    console.error("Error fetching account details:", err);
                    setAccountDetails({
                        email: userData.emailAddress || "",
                        phoneNumber: "",
                        password: "••••••••",
                    });
                }

                // Fetch orders
                try {
                    const ordersRes = await getOrders(0, 100);
                    const raw = ordersRes.data;

                    let ordersData = [];
                    if (Array.isArray(raw)) ordersData = raw;
                    else if (Array.isArray(raw?.content)) ordersData = raw.content;
                    else if (Array.isArray(raw?.data)) ordersData = raw.data;

                    setOrders(
                        ordersData.map((order) => ({
                            id: order.id || order._id || "UNKNOWN",
                            createdAtRaw: order.createdAt || order.createdDate || order.date, // ✅ important for 30-day rule
                            date: formatDate(order.createdAt || order.createdDate || order.date),
                            status: order.status || "UNKNOWN",
                            total: formatCurrency(
                                order.grandTotal || order.totals?.grandTotal || order.total || 0
                            ),
                            // keep raw items for refund selection
                            itemsRaw: order.items || order.orderItems || [],
                            // pretty display
                            itemsDisplay: order.items || order.orderItems || [],
                        }))
                    );
                } catch (err) {
                    console.error("Error fetching orders:", err);
                    setOrders([]);
                }

                // ✅ Fetch refunds (customer)
                try {
                    const refundsRes = await getRefundsMe();
                    const list = Array.isArray(refundsRes.data) ? refundsRes.data : [];
                    setRefunds(
                        list.map((r) => ({
                            id: r.id,
                            orderId: r.orderId,
                            date: formatDate(r.createdAt),
                            status: r.status || "REQUESTED",
                            refundAmount: r.refundAmount,
                            customerNote: r.customerNote,
                            managerNote: r.managerNote,
                            items: r.items || [],
                        }))
                    );
                } catch (err) {
                    console.error("Error fetching refunds:", err);
                    setRefunds([]);
                }

                // Addresses
                const addressesFromBackend = (userData.addresses || []).map((addr) => ({
                    id: addr.id,
                    label: addr.label || "",
                    line1: addr.line1 || "",
                    city: addr.city || "",
                    district: addr.state || "",
                    zipCode: addr.zipCode || "",
                }));

                setAddresses(addressesFromBackend);

                if (userId) {
                    try {
                        localStorage.setItem(`addresses_${userId}`, JSON.stringify(addressesFromBackend));
                    } catch (err) {
                        console.error("Error saving addresses to localStorage:", err);
                    }
                }
            } catch (err) {
                console.error("Error fetching user data:", err);
                if (err?.response?.status === 401 || err?.response?.status === 403) {
                    setError("Please log in to view your profile.");
                    setTimeout(() => navigate("/login"), 2000);
                } else {
                    setError(null);
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
            console.warn("Logout failed (ignored):", err);
        } finally {
            navigate("/login", { replace: true });
        }
    };

    // Cancel order handler
    const handleCancelOrder = async (e, orderId) => {
        e.preventDefault();
        e.stopPropagation();

        const confirm = window.confirm("Are you sure you want to cancel this order?");
        if (!confirm) return;

        try {
            setCancellingIds((p) => ({ ...p, [orderId]: true }));
            await cancelOrder(orderId);

            setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "CANCELLED" } : o)));
            alert("Order cancelled successfully!");
        } catch (err) {
            console.error("cancelOrder error:", err);
            alert(err?.response?.data?.message || "Failed to cancel order. Please try again.");
        } finally {
            setCancellingIds((p) => {
                const next = { ...p };
                delete next[orderId];
                return next;
            });
        }
    };

    // Account
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

    // Addresses sync
    const syncAddressesWithBackend = async (updatedAddresses) => {
        try {
            const meRes = await meRequest();
            const userData = meRes.data;

            await updateProfile({
                name: userData.name,
                emailAddress: userData.emailAddress,
                homeAddress: userData.homeAddress,
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
                    localStorage.setItem(`addresses_${userData.id}`, JSON.stringify(updatedAddresses));
                } catch (err) {
                    console.error("Error saving addresses to localStorage:", err);
                }
            }
        } catch (err) {
            console.error("Error syncing addresses with backend:", err);
            alert(err.response?.data?.message || "Failed to save address. Please try again.");
        }
    };

    const handleEditAddress = (address) => {
        if (!address || !address.id) return;
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
        setNewAddress({ label: "", line1: "", city: "", district: "", zipCode: "" });
    };

    const handleDeleteAddress = async (id) => {
        const updated = addresses.filter((a) => a.id !== id);
        await syncAddressesWithBackend(updated);
        alert("Address deleted successfully!");
    };

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
            updated = addresses.map((a) => (a.id === editingAddressId ? { ...a, ...trimmed } : a));
        } else {
            updated = [...addresses, { id: Date.now().toString(), ...trimmed }];
        }

        await syncAddressesWithBackend(updated);

        alert(editingAddressId ? "Address updated successfully!" : "Address saved successfully!");
        setNewAddress({ label: "", line1: "", city: "", district: "", zipCode: "" });
        setEditingAddressId(null);
    };

    // ✅ Refund submit
    const handleNewRefundSubmit = async (event) => {
        event.preventDefault();

        if (!newRefund.orderId || !newRefund.productKey || !newRefund.reason.trim()) {
            alert("Please select an order, an item, and enter a reason!");
            return;
        }

        const [productId, sku] = newRefund.productKey.split("::");
        const qty = Number(newRefund.quantity) || 1;
        if (!productId || !sku) {
            alert("Invalid item selection.");
            return;
        }
        if (qty <= 0) {
            alert("Quantity must be > 0");
            return;
        }

        try {
            await createRefundRequest(newRefund.orderId, [
                { productId, sku, quantity: qty, reason: newRefund.reason.trim() },
            ]);

            alert("Refund request submitted successfully!");

            // refresh list
            const refundsRes = await getRefundsMe();
            const list = Array.isArray(refundsRes.data) ? refundsRes.data : [];
            setRefunds(
                list.map((r) => ({
                    id: r.id,
                    orderId: r.orderId,
                    date: formatDate(r.createdAt),
                    status: r.status || "REQUESTED",
                    refundAmount: r.refundAmount,
                    customerNote: r.customerNote,
                    managerNote: r.managerNote,
                    items: r.items || [],
                }))
            );

            setNewRefund({ orderId: "", productKey: "", quantity: 1, reason: "" });
        } catch (err) {
            console.error("Error creating refund:", err);
            alert(err?.response?.data?.message || "Failed to submit refund request.");
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
                <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>{error}</div>
            </div>
        );
    }
    const primaryAddress = addresses[0];
    return (
        <div className="category-page">
            <CategoryTopbar />

            <main className="profile-wrapper">
                <section className="profile-hero">
                    <h1 className="profile-heading">Hi, {user ? user.name : "there"}!</h1>
                    <p className="profile-subheading">
                        Manage your orders, account information, and saved preferences all in one place.
                    </p>

                    {/* ⭐ Identity summary block for demo (ID, Tax ID, Email, Home Address) */}
                    {user && (
                        <div
                            style={{
                                marginTop: "1rem",
                                padding: "0.75rem 1rem",
                                borderRadius: "8px",
                                background: "#f8f5f4",
                                fontSize: "0.9rem",
                                lineHeight: 1.5,
                            }}
                        >
                            <div>
                                <strong>Customer ID:</strong> {user.id}
                            </div>
                            <div>
                                <strong>Tax ID (mock):</strong> {taxId}
                            </div>
                            <div>
                                <strong>Email:</strong> {user.email}
                            </div>
                            {primaryAddress && (
                                <div>
                                    <strong>Home address:</strong>{" "}
                                    {primaryAddress.line1}
                                    {primaryAddress.city && `, ${primaryAddress.city}`}
                                    {primaryAddress.district && `, ${primaryAddress.district}`}
                                    {primaryAddress.zipCode && `, ${primaryAddress.zipCode}`}
                                </div>
                            )}
                        </div>
                    )}

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
                                {orders.map((order) => {
                                    const isProcessing = (order.status || "").toUpperCase() === "PROCESSING";
                                    const isCancelling = !!cancellingIds[order.id];

                                    return (
                                        <li
                                            key={order.id}
                                            className="profile-list-item"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => navigate(`/invoice/${order.id}`)}
                                        >
                                            <div
                                                className="profile-list-item-header"
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    gap: "0.75rem",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                                    <span className="profile-pill">{order.status}</span>
                                                    <strong>Order #{order.id}</strong>
                                                </div>

                                                {isProcessing && (
                                                    <button
                                                        type="button"
                                                        className="profile-link-button secondary"
                                                        onClick={(e) => handleCancelOrder(e, order.id)}
                                                        disabled={isCancelling}
                                                        style={{
                                                            border: "1px solid #e5e5e5",
                                                            borderRadius: 6,
                                                            background: "#fff",
                                                            padding: "0.35rem 0.75rem",
                                                            cursor: isCancelling ? "not-allowed" : "pointer",
                                                            opacity: isCancelling ? 0.7 : 1,
                                                            whiteSpace: "nowrap",
                                                        }}
                                                        title="Cancel (only while processing)"
                                                    >
                                                        {isCancelling ? "Cancelling..." : "Cancel"}
                                                    </button>
                                                )}
                                            </div>

                                            <div className="profile-list-item-meta">
                                                <span>{order.date}</span>
                                                <span>{order.total}</span>
                                            </div>

                                            {order.itemsDisplay && order.itemsDisplay.length > 0 && (
                                                <p className="profile-list-item-description">
                                                    {Array.isArray(order.itemsDisplay)
                                                        ? order.itemsDisplay
                                                            .map((item) =>
                                                                typeof item === "string"
                                                                    ? item
                                                                    : item.name || item.productName || `Item (${item.quantity || 1}x)`
                                                            )
                                                            .join(", ")
                                                        : String(order.itemsDisplay)}
                                                </p>
                                            )}
                                        </li>
                                    );
                                })}
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
                                        setPasswordChange((prev) => ({ ...prev, currentPassword: e.target.value }))
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
                                        setPasswordChange((prev) => ({ ...prev, newPassword: e.target.value }))
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
                                        setPasswordChange((prev) => ({ ...prev, confirmPassword: e.target.value }))
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
                                    <span>Address Line 1</span>
                                    <input
                                        type="text"
                                        value={newAddress.line1}
                                        onChange={(e) => setNewAddress((p) => ({ ...p, line1: e.target.value }))}
                                        placeholder="Street and number"
                                        required
                                    />
                                </label>

                                <div className="profile-field" style={{ display: "flex", gap: "0.75rem" }}>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ display: "block", marginBottom: 4 }}>City</span>
                                        <input
                                            type="text"
                                            value={newAddress.city}
                                            onChange={(e) => setNewAddress((p) => ({ ...p, city: e.target.value }))}
                                            placeholder="City"
                                            required
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ display: "block", marginBottom: 4 }}>District</span>
                                        <input
                                            type="text"
                                            value={newAddress.district}
                                            onChange={(e) => setNewAddress((p) => ({ ...p, district: e.target.value }))}
                                            placeholder="District"
                                        />
                                    </div>
                                    <div style={{ flexBasis: "140px" }}>
                                        <span style={{ display: "block", marginBottom: 4 }}>ZIP Code</span>
                                        <input
                                            type="text"
                                            value={newAddress.zipCode}
                                            onChange={(e) => setNewAddress((p) => ({ ...p, zipCode: e.target.value }))}
                                            placeholder="ZIP"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="profile-form-actions" style={{ display: "flex", gap: "0.75rem" }}>
                                    <button type="submit" className="profile-button" style={{ padding: "0.5rem 1.25rem" }}>
                                        {editingAddressId ? "Update Address" : "Save Address"}
                                    </button>

                                    {editingAddressId && (
                                        <button
                                            type="button"
                                            className="profile-link-button secondary"
                                            onClick={handleCancelEditAddress}
                                            style={{
                                                padding: "0.5rem 1rem",
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

                {/* ✅ Refunds */}
                <section className="profile-card profile-card-grid">
                    <div>
                        <header className="profile-card-header">
                            <h2>Refunds</h2>
                            <p>Track previous requests</p>
                        </header>
                        <div className="profile-card-body">
                            {refunds.length === 0 ? (
                                <p style={{ color: "#666" }}>No refund requests found.</p>
                            ) : (
                                <ul className="profile-list">
                                    {refunds.map((r) => (
                                        <li key={r.id} className="profile-list-item">
                                            <div className="profile-list-item-header">
                                                <strong>{r.orderId}</strong>
                                                <span className="profile-pill muted">{r.status}</span>
                                            </div>
                                            <div className="profile-list-item-meta">
                                                <span>{r.id}</span>
                                                <span>{r.date}</span>
                                            </div>
                                            {r.refundAmount !== null && r.refundAmount !== undefined && (
                                                <p className="profile-list-item-description">
                                                    Amount: {formatCurrency(r.refundAmount)}
                                                </p>
                                            )}
                                            {r.managerNote && (
                                                <p className="profile-list-item-description">Manager note: {r.managerNote}</p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* new refund */}
                    <div>
                        <header className="profile-card-header">
                            <h3>New Refund Request</h3>
                            <p>Only DELIVERED orders within 30 days are eligible.</p>
                        </header>
                        <div className="profile-card-body">
                            <form className="profile-form" onSubmit={handleNewRefundSubmit}>
                                <label className="profile-field">
                                    <span>Order Number</span>
                                    <select
                                        value={newRefund.orderId}
                                        onChange={(e) =>
                                            setNewRefund((p) => ({
                                                ...p,
                                                orderId: e.target.value,
                                                productKey: "",
                                                quantity: 1,
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
                                        <option value="">Select an eligible (DELIVERED, ≤30 days) order...</option>
                                        {refundableOrders.map((order) => (
                                            <option key={order.id} value={order.id}>
                                                {order.id} - {order.date} - {order.total}
                                            </option>
                                        ))}
                                    </select>

                                    {refundableOrders.length === 0 && (
                                        <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
                                            No eligible orders found (must be DELIVERED and within 30 days).
                                        </p>
                                    )}
                                </label>

                                {newRefund.orderId && (
                                    <label className="profile-field">
                                        <span>Item</span>
                                        <select
                                            value={newRefund.productKey}
                                            onChange={(e) => setNewRefund((p) => ({ ...p, productKey: e.target.value }))}
                                            required
                                            style={{
                                                width: "100%",
                                                padding: "0.5rem",
                                                fontSize: "1rem",
                                                border: "1px solid #ccc",
                                                borderRadius: "4px",
                                            }}
                                        >
                                            <option value="">Select a product...</option>
                                            {selectedOrderItems.map((it, idx) => (
                                                <option key={idx} value={`${it.productId}::${it.sku}`}>
                                                    {it.name} ({it.sku}) - purchased qty:{it.quantity}
                                                </option>
                                            ))}
                                        </select>

                                        {selectedOrderItems.length === 0 && (
                                            <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
                                                This order items could not be parsed (missing productId/sku).
                                            </p>
                                        )}
                                    </label>
                                )}

                                {newRefund.orderId && (
                                    <label className="profile-field">
                                        <span>Quantity</span>
                                        <input
                                            type="number"
                                            min={1}
                                            value={newRefund.quantity}
                                            onChange={(e) => setNewRefund((p) => ({ ...p, quantity: e.target.value }))}
                                            required
                                        />
                                    </label>
                                )}

                                <label className="profile-field">
                                    <span>Reason</span>
                                    <textarea
                                        rows={3}
                                        value={newRefund.reason}
                                        onChange={(e) => setNewRefund((p) => ({ ...p, reason: e.target.value }))}
                                        placeholder="Describe the issue"
                                        required
                                    />
                                </label>

                                <button
                                    type="submit"
                                    className="profile-button"
                                    disabled={refundableOrders.length === 0}
                                >
                                    Submit Request
                                </button>
                            </form>
                        </div>
                    </div>
                </section>

                {/* bottom logout */}
                <section className="profile-card profile-logout-card">
                    <button className="profile-button secondary logout-button" type="button" onClick={handleLogout}>
                        Log Out
                    </button>
                </section>
            </main>
        </div>
    );
}