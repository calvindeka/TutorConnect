import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/Toaster";
import { Spinner } from "react-bootstrap";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AdminDashboard from "./pages/AdminDashboard";
import TutorSearchPage from "./pages/TutorSearchPage";
import TutorProfilePage from "./pages/TutorProfilePage";
import ApplyPage from "./pages/ApplyPage";
import AvailabilityPage from "./pages/AvailabilityPage";
import SessionDetailPage from "./pages/SessionDetailPage";
import AccountSettingsPage from "./pages/AccountSettingsPage";

function FullScreenSpinner() {
  return (
    <div style={{ minHeight: "100vh" }} className="d-flex align-items-center justify-content-center">
      <Spinner animation="border" />
    </div>
  );
}

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
            <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth roles={["admin"]}><AdminDashboard /></RequireAuth>} />
            <Route path="/tutors" element={<RequireAuth><TutorSearchPage /></RequireAuth>} />
            <Route path="/tutors/:id" element={<RequireAuth><TutorProfilePage /></RequireAuth>} />
            <Route path="/sessions/:id" element={<RequireAuth><SessionDetailPage /></RequireAuth>} />
            <Route path="/apply" element={<RequireAuth><ApplyPage /></RequireAuth>} />
            <Route path="/availability" element={<RequireAuth roles={["tutor", "admin"]}><AvailabilityPage /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><AccountSettingsPage /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
