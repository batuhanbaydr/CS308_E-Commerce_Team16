import { useState } from "react";
import { useNavigate } from "react-router-dom";

const INITIAL_ACCOUNT_DETAILS = {
  email: "bahar@example.com",
  phoneNumber: "+90 555 999 88 77",
  password: "••••••••",
};

const INITIAL_ADDRESSES = [
  {
    id: 1,
    label: "Primary",
    details: "Caddebostan Mah. Gulistan Sk. Hanımeli Apt. No:12 Kadıköy/Istanbul",
  },
];

const INITIAL_ORDERS = [
  {
    id: "ORD-1045",
    date: "Oct 12, 2025",
    status: "Delivered",
    total: "₺1.250,00",
    items: ["Wool Coat x1", "Leather Boots x1"],
  },
  {
    id: "ORD-1039",
    date: "Sep 28, 2025",
    status: "Processing Return",
    total: "₺740,00",
    items: ["Suede Jacket x1"],
  },
];

const INITIAL_RETURNS = [
  {
    id: "RET-202",
    orderId: "ORD-1011",
    date: "Aug 02, 2025",
    status: "Approved",
    reason: "Size too small",
  },
];

const INITIAL_CARDS = [
  {
    id: 1,
    label: "Mastercard •• 1123",
    holder: "Bahar Turkmen",
    expiry: "04 / 27",
  },
];

export default function Profile() {
  const navigate = useNavigate();

  const [accountDetails, setAccountDetails] = useState(
    INITIAL_ACCOUNT_DETAILS
  );
  const [orders] = useState(INITIAL_ORDERS);
  const [addresses, setAddresses] = useState(INITIAL_ADDRESSES);
  const [newAddress, setNewAddress] = useState({ label: "", details: "" });
  const [returns, setReturns] = useState(INITIAL_RETURNS);
  const [newReturn, setNewReturn] = useState({
    orderId: "",
    reason: "",
  });
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [newCard, setNewCard] = useState({
    label: "",
    holder: "",
    expiry: "",
  });
  const [editingCardId, setEditingCardId] = useState(null);

  const handleDeleteAddress = (id) => {
    setAddresses((prev) => prev.filter((address) => address.id !== id));
  };

  const handleDeleteReturn = (id) => {
    setReturns((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAccountChange = (event) => {
    const { name, value } = event.target;
    setAccountDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAccountSubmit = (event) => {
    event.preventDefault();
  };

  const handleNewAddressSubmit = (event) => {
    event.preventDefault();
    if (!newAddress.label.trim() || !newAddress.details.trim()) return;

    setAddresses((prev) => [
      ...prev,
      {
        id: Date.now(),
        label: newAddress.label.trim(),
        details: newAddress.details.trim(),
      },
    ]);
    setNewAddress({ label: "", details: "" });
  };

  const handleNewReturnSubmit = (event) => {
    event.preventDefault();
    if (!newReturn.orderId.trim() || !newReturn.reason.trim()) return;

    setReturns((prev) => [
      ...prev,
      {
        id: `RET-${Date.now().toString().slice(-3)}`,
        orderId: newReturn.orderId.trim(),
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }),
        status: "Pending Review",
        reason: newReturn.reason.trim(),
      },
    ]);
    setNewReturn({ orderId: "", reason: "" });
  };

  const handleEditCard = (card) => {
    setEditingCardId(card.id);
    setNewCard({
      label: card.label,
      holder: card.holder,
      expiry: card.expiry,
    });
  };

  const handleCancelEditCard = () => {
    setEditingCardId(null);
    setNewCard({
      label: "",
      holder: "",
      expiry: "",
    });
  };

  const handleNewCardSubmit = (event) => {
    event.preventDefault();
    if (!newCard.label.trim() || !newCard.holder.trim() || !newCard.expiry.trim())
      return;

    const normalizedCard = {
      label: newCard.label.trim(),
      holder: newCard.holder.trim(),
      expiry: newCard.expiry.trim(),
    };

    if (editingCardId !== null) {
      setCards((prev) =>
        prev.map((card) =>
          card.id === editingCardId ? { ...card, ...normalizedCard } : card
        )
      );
      setEditingCardId(null);
    } else {
      setCards((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...normalizedCard,
        },
      ]);
    }

    setNewCard({ label: "", holder: "", expiry: "" });
  };

  const handleDeleteCard = (id) => {
    setCards((prev) => prev.filter((card) => card.id !== id));
    if (editingCardId === id) {
      handleCancelEditCard();
    }
  };

  const isEditingCard = editingCardId !== null;

  return (
    <div className="profile-page">
      <header className="profile-topbar">
        <span className="profile-brand" onClick={() => navigate("/profile")}>
          TIDL
        </span>
        <div className="profile-topbar-actions">
          <span
            className="profile-topbar-link"
            onClick={() => navigate("/login")}
          >
            LOG IN
          </span>
          <button type="button" className="profile-cart-button">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="9" cy="19" r="1.5" fill="currentColor" />
              <circle cx="17" cy="19" r="1.5" fill="currentColor" />
              <path
                d="M4 5.5h2.2l2.1 9.3c.1.5.6.9 1.1.9h7.6c.5 0 .9-.3 1.1-.8l2-6.1H8.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <main className="profile-wrapper">
        <section className="profile-hero">
          <h1 className="profile-heading">Hi Bahar!</h1>
          <p className="profile-subheading">
            Manage your orders, account information, and saved preferences all in
            one place.
          </p>
        </section>

        <section className="profile-card">
          <header className="profile-card-header">
            <h2>Orders</h2>
            <p>Orders with details</p>
          </header>
          <div className="profile-card-body">
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
                  <p className="profile-list-item-description">
                    {order.items.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

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
              <label className="profile-field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  value={accountDetails.password}
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
                      {address.details}
                    </p>
                    <div className="profile-list-item-actions">
                      <button className="profile-link-button" type="button">
                        Edit Address
                      </button>
                      <button
                        type="button"
                        className="profile-icon-button"
                        aria-label="Delete address"
                        onClick={() => handleDeleteAddress(address.id)}
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
              <h3>Add New Address</h3>
              <p>Store another delivery location</p>
            </header>
            <div className="profile-card-body">
              <form className="profile-form" onSubmit={handleNewAddressSubmit}>
                <label className="profile-field">
                  <span>Label</span>
                  <input
                    type="text"
                    value={newAddress.label}
                    onChange={(event) =>
                      setNewAddress((prev) => ({
                        ...prev,
                        label: event.target.value,
                      }))
                    }
                    placeholder="Home, Work..."
                    required
                  />
                </label>
                <label className="profile-field">
                  <span>Address</span>
                  <textarea
                    rows={3}
                    value={newAddress.details}
                    onChange={(event) =>
                      setNewAddress((prev) => ({
                        ...prev,
                        details: event.target.value,
                      }))
                    }
                    placeholder="Street, City, ZIP"
                    required
                  />
                </label>
                <button type="submit" className="profile-button">
                  Save Address
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="profile-card profile-card-grid">
          <div>
            <header className="profile-card-header">
              <h2>Returns</h2>
              <p>Track previous requests</p>
            </header>
            <div className="profile-card-body">
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
                    <p className="profile-list-item-description">
                      Reason: {item.reason}
                    </p>
                    <div className="profile-list-item-actions">
                      <button
                        type="button"
                        className="profile-icon-button"
                        aria-label="Delete return request"
                        onClick={() => handleDeleteReturn(item.id)}
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
              <h3>New Return Request</h3>
              <p>Submit a new request</p>
            </header>
            <div className="profile-card-body">
              <form className="profile-form" onSubmit={handleNewReturnSubmit}>
                <label className="profile-field">
                  <span>Order Number</span>
                  <input
                    type="text"
                    value={newReturn.orderId}
                    onChange={(event) =>
                      setNewReturn((prev) => ({
                        ...prev,
                        orderId: event.target.value,
                      }))
                    }
                    placeholder="ORD-XXXX"
                    required
                  />
                </label>
                <label className="profile-field">
                  <span>Reason</span>
                  <textarea
                    rows={3}
                    value={newReturn.reason}
                    onChange={(event) =>
                      setNewReturn((prev) => ({
                        ...prev,
                        reason: event.target.value,
                      }))
                    }
                    placeholder="Describe the issue"
                    required
                  />
                </label>
                <button type="submit" className="profile-button">
                  Submit Request
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="profile-card profile-card-grid">
          <div>
            <header className="profile-card-header">
              <h2>Payment Methods</h2>
            </header>
            <div className="profile-card-body">
              <ul className="profile-list">
                {cards.map((card) => (
                  <li key={card.id} className="profile-list-item">
                    <div className="profile-list-item-header">
                      <strong>{card.label}</strong>
                      <span>{card.expiry}</span>
                    </div>
                    <p className="profile-list-item-description">
                      Cardholder: {card.holder}
                    </p>
                    <div className="profile-list-item-actions">
                      <button
                        className="profile-link-button"
                        type="button"
                        onClick={() => handleEditCard(card)}
                      >
                        Edit Card
                      </button>
                      <button
                        type="button"
                        className="profile-icon-button"
                        aria-label="Delete card"
                        onClick={() => handleDeleteCard(card.id)}
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
              <h3>{isEditingCard ? "Edit Card" : "Add New Card"}</h3>
              <p>
                {isEditingCard
                  ? "Update the selected payment method."
                  : "Securely store a new payment method"}
              </p>
            </header>
            <div className="profile-card-body">
              <form className="profile-form" onSubmit={handleNewCardSubmit}>
                <label className="profile-field">
                  <span>Card Label</span>
                  <input
                    type="text"
                    value={newCard.label}
                    onChange={(event) =>
                      setNewCard((prev) => ({
                        ...prev,
                        label: event.target.value,
                      }))
                    }
                    placeholder="Visa •• 1234"
                    required
                  />
                </label>
                <label className="profile-field">
                  <span>Cardholder Name</span>
                  <input
                    type="text"
                    value={newCard.holder}
                    onChange={(event) =>
                      setNewCard((prev) => ({
                        ...prev,
                        holder: event.target.value,
                      }))
                    }
                    placeholder="Name on card"
                    required
                  />
                </label>
                <label className="profile-field">
                  <span>Expiry Date</span>
                  <input
                    type="text"
                    value={newCard.expiry}
                    onChange={(event) =>
                      setNewCard((prev) => ({
                        ...prev,
                        expiry: event.target.value,
                      }))
                    }
                    placeholder="MM / YY"
                    required
                  />
                </label>
                <div className="profile-form-actions">
                  <button type="submit" className="profile-button">
                    {isEditingCard ? "Update Card" : "Save Card"}
                  </button>
                  {isEditingCard && (
                    <button
                      type="button"
                      className="profile-link-button secondary"
                      onClick={handleCancelEditCard}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>

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

