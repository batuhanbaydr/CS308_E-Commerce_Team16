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
    label: "Home",
    details: "Cankaya, Ankara 06680 Turkey",
  },
  {
    id: 2,
    label: "Work",
    details: "Teknokent Mah. No:15, Ankara 06800 Turkey",
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

  const handleNewCardSubmit = (event) => {
    event.preventDefault();
    if (!newCard.label.trim() || !newCard.holder.trim() || !newCard.expiry.trim())
      return;

    setCards((prev) => [
      ...prev,
      {
        id: Date.now(),
        label: newCard.label.trim(),
        holder: newCard.holder.trim(),
        expiry: newCard.expiry.trim(),
      },
    ]);
    setNewCard({ label: "", holder: "", expiry: "" });
  };

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
          <div className="profile-menu-icon">
            <span />
            <span />
            <span />
          </div>
        </div>
      </header>

      <main className="profile-wrapper">
        <section className="profile-hero">
          <p className="profile-eyebrow">CS308 Profile</p>
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
            <p>All sections are editable</p>
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
                  type="text"
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
              <p>Saved addresses can be edited</p>
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
                    <button className="profile-link-button" type="button">
                      Edit Address
                    </button>
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
              <p>Saved cards can be edited</p>
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
                    <button className="profile-link-button" type="button">
                      Edit Card
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <header className="profile-card-header">
              <h3>Add New Card</h3>
              <p>Securely store a new payment method</p>
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
                <button type="submit" className="profile-button">
                  Save Card
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="profile-card profile-logout-card">
          <div className="profile-card-body logout">
            <button
              className="profile-button secondary"
              type="button"
              onClick={() => navigate("/login")}
            >
              Log Out
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

