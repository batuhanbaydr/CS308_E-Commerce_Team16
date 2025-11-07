import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Login from "./Login.jsx";
import SignUp from "./SignUp.jsx";
import Profile from "./Profile.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
