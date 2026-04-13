import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, name);
      navigate("/dashboard");
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.errors?.[0]?.msg ||
        "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Brand */}
        <div style={styles.brand}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>TC</span>
          </div>
          <h1 style={styles.title}>TutorConnect</h1>
          <p style={styles.subtitle}>Peer tutoring, simplified.</p>
        </div>

        {/* Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Sign in to continue</h2>
          <p style={styles.cardDesc}>
            Enter your name and email. If you're new, we'll create your account automatically.
          </p>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={styles.input}
                placeholder="Calvin Deka"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
                placeholder="you@kenyon.edu"
              />
            </div>

            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p style={styles.footer}>
          SCMP 318 — Software Engineering Project
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1e2761 0%, #408ec6 50%, #7a2048 100%)",
    padding: "20px",
  },
  container: {
    width: "100%",
    maxWidth: "420px",
  },
  brand: {
    textAlign: "center",
    marginBottom: "32px",
  },
  logo: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "56px",
    height: "56px",
    background: "rgba(255,255,255,0.15)",
    borderRadius: "16px",
    marginBottom: "16px",
    backdropFilter: "blur(10px)",
  },
  logoIcon: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#fff",
    letterSpacing: "-1px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#fff",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "15px",
    color: "rgba(255,255,255,0.7)",
    marginTop: "4px",
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "32px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  cardTitle: {
    fontSize: "20px",
    fontWeight: "700",
    marginBottom: "6px",
    color: "#1e293b",
  },
  cardDesc: {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "24px",
    lineHeight: "1.5",
  },
  error: {
    background: "#fef2f2",
    color: "#dc2626",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "16px",
    border: "1px solid #fecaca",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
  },
  input: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1.5px solid #e2e8f0",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
    fontFamily: "inherit",
  },
  submitBtn: {
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "#1e2761",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: "4px",
  },
  footer: {
    textAlign: "center",
    fontSize: "12px",
    color: "rgba(255,255,255,0.5)",
    marginTop: "24px",
  },
};
