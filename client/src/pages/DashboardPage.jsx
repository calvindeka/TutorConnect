import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>TutorConnect</h1>
            <p style={styles.subtitle}>
              Signed in as <strong>{user?.name}</strong>
            </p>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Sign Out
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.avatar}>
            {user?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <h2 style={styles.cardTitle}>{user?.name}</h2>
          <p style={styles.email}>{user?.email}</p>
          <div style={styles.badge}>Session Active</div>
        </div>

        <div style={styles.infoCard}>
          <h3 style={styles.infoTitle}>Session Info</h3>
          <p style={styles.infoText}>
            You are logged in with a server-side session. Your session cookie is stored in the browser
            and your login state persists across page refreshes.
          </p>
          <p style={styles.infoText}>
            Try refreshing the page — you'll stay logged in. Click "Sign Out" to destroy the session.
          </p>
        </div>

        <div style={styles.infoCard}>
          <h3 style={styles.infoTitle}>Coming Soon</h3>
          <ul style={styles.featureList}>
            <li>Search and filter tutors by subject</li>
            <li>Book tutoring sessions</li>
            <li>Rate and review tutors</li>
            <li>AI-powered tutor recommendations</li>
            <li>Tutor availability management</li>
            <li>Admin dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "32px 20px",
  },
  container: {
    maxWidth: "560px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "32px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#1e2761",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "2px",
  },
  logoutBtn: {
    padding: "8px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#1e2761",
    color: "#fff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "32px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
    marginBottom: "16px",
    textAlign: "center",
  },
  avatar: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1e2761, #408ec6)",
    color: "#fff",
    fontSize: "28px",
    fontWeight: "700",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "12px",
  },
  cardTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1e293b",
  },
  email: {
    fontSize: "14px",
    color: "#64748b",
    marginTop: "4px",
  },
  badge: {
    display: "inline-block",
    marginTop: "16px",
    padding: "4px 12px",
    borderRadius: "20px",
    background: "#ecfdf5",
    color: "#059669",
    fontSize: "12px",
    fontWeight: "600",
    border: "1px solid #a7f3d0",
  },
  infoCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
    marginBottom: "16px",
  },
  infoTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "10px",
  },
  infoText: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: "1.6",
    marginBottom: "8px",
  },
  featureList: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: "1.8",
    paddingLeft: "20px",
  },
};
