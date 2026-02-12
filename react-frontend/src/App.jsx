import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import LoginPage from "./pages/loginpage.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/LoginPage" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/loginpage" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
