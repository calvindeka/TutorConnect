import { useAuth } from "../context/AuthContext";
import StudentDashboard from "./StudentDashboard";
import TutorDashboard from "./TutorDashboard";
import AdminDashboard from "./AdminDashboard";
import Layout from "../components/Layout";
import { Spinner } from "react-bootstrap";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  if (loading) return <Layout><div className="text-center py-5"><Spinner animation="border" /></div></Layout>;
  if (!user) return null;
  if (user.role === "admin") return <AdminDashboard />;
  if (user.role === "tutor") return <TutorDashboard />;
  return <StudentDashboard />;
}
