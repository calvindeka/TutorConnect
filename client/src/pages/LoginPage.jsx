import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, Form, Button, Alert, Container } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../api";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tc-brand-gradient" style={{ minHeight: "100vh" }}>
      <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div className="text-center text-white mb-4">
            <i className="bi bi-mortarboard-fill" style={{ fontSize: 48 }}></i>
            <h1 className="tc-logo mt-2 mb-1">TutorConnect</h1>
            <p className="opacity-75 mb-0">Peer tutoring at Kenyon, simplified.</p>
          </div>
          <Card className="shadow-lg border-0">
            <Card.Body className="p-4">
              <h4 className="mb-1">Sign in</h4>
              <p className="text-muted small mb-3">Welcome back. Use your email and password.</p>
              {error && <Alert variant="danger" className="py-2">{error}</Alert>}
              <Form onSubmit={onSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@kenyon.edu"
                    autoFocus
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </Form.Group>
                <Button type="submit" disabled={loading} className="w-100">
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </Form>
              <div className="text-center mt-3 small">
                Don't have an account? <Link to="/register">Sign up</Link>
              </div>
              <details className="mt-3">
                <summary className="small text-muted">Demo accounts (click to view)</summary>
                <div className="small text-muted mt-2">
                  <div><strong>Admin:</strong> admin@kenyon.edu / admin123</div>
                  <div><strong>Student:</strong> alex.smith@kenyon.edu / student123</div>
                  <div><strong>Tutor:</strong> jane.doe@kenyon.edu / tutor123</div>
                </div>
              </details>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
}
