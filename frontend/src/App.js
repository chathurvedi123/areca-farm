import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider }    from "./components/AuthContext";
import Home               from "./pages/Home";
import Login              from "./pages/Login";
import Register           from "./pages/Register";
import ManagerVerify      from "./pages/ManagerVerify";
import OwnerDashboard     from "./pages/OwnerDashboard";
import ManagerDashboard   from "./pages/ManagerDashboard";
import WorkerDashboard    from "./pages/WorkerDashboard";
import FarmerDashboard    from "./pages/FarmerDashboard";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"               element={<Home />} />
          <Route path="/login/:role"    element={<Login />} />
          <Route path="/register/:role" element={<Register />} />
          <Route path="/manager-verify" element={<ManagerVerify />} />
          <Route path="/owner"          element={<OwnerDashboard />} />
          <Route path="/manager"        element={<ManagerDashboard />} />
          <Route path="/worker"         element={<WorkerDashboard />} />
          <Route path="/farmer"         element={<FarmerDashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}