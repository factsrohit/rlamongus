import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import LoginPage from "./pages/loginpage.jsx";
import TaskManagement from "./pages/taskmanagement.jsx";
import UserManagement from "./pages/UserManagement.jsx";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/LoginPage" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/loginpage" element={<LoginPage />} />
        <Route path="/taskmanagement" element={<TaskManagement />} />
        <Route path="/usermanagement" element={<UserManagement />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
