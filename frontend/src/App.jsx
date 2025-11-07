import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx"; 
import "./index.css"; 
import SignUp from "./pages/SignUp.jsx";
import Home from "./pages/Home.jsx";



function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="*" element={<Login />} />
        <Route path="/home" element={<Home />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
