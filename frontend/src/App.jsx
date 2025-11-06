import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx"; // <-- make sure this path is correct
import "./index.css"; // or "./App.css" if that’s where your styles live

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Default route so opening "/" also shows login */}
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
