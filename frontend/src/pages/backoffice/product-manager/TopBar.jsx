import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="pm-topbar">
      <span className="category-brand">TIDL</span>

      <div className="home-signin">
        <span>{user?.name}</span>
      </div>
    <span className="home-signin" onClick={handleLogout}>
      LOG OUT
    </span>


    </header>
  );
}
