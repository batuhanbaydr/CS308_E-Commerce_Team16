import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx"; 
import "./index.css"; 
import SignUp from "./pages/SignUp.jsx";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
