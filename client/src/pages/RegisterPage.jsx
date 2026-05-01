import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, Form, Button, Alert, Container, Row, Col } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../api";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tc-brand-gradient" style={{ minHeight: "100vh" }}>
      <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div className="text-center text-white mb-4">
            <i className="bi bi-mortarboard-fill" style={{ fontSize: 48 }}></i>
            <h1 className="tc-logo mt-2 mb-1">Join TutorConnect</h1>
            <p className="opacity-75 mb-0">Create your student account in seconds.</p>
          </div>
          <Card className="shadow-lg border-0">
            <Card.Body className="p-4">
              {error && <Alert variant="danger" className="py-2">{error}</Alert>}
              <Form onSubmit={onSubmit}>
                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>First name</Form.Label>
                      <Form.Control name="first_name" value={form.first_name} onChange={onChange} required autoFocus />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Last name</Form.Label>
                      <Form.Control name="last_name" value={form.last_name} onChange={onChange} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Kenyon email</Form.Label>
                  <Form.Control type="email" name="email" value={form.email} onChange={onChange} required placeholder="you@kenyon.edu" />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control type="password" name="password" value={form.password} onChange={onChange} required minLength={6} placeholder="At least 6 characters" />
                </Form.Group>
                <Button type="submit" disabled={loading} className="w-100">
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </Form>
              <div className="text-center mt-3 small">
                Already have an account? <Link to="/login">Sign in</Link>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
}
