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
      <span className="pm-brand">TIDL</span>

      <div className="pm-user">
        <span>{user?.name}</span>
        <button onClick={handleLogout}>Log out</button>
      </div>
    </header>
  );
}
