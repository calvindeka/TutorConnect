import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Button, Alert, Row, Col, Badge, Spinner } from "react-bootstrap";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../api";

export default function ApplyPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [bio, setBio] = useState("");
  const [gpa, setGpa] = useState("");
  const [picked, setPicked] = useState(new Set());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/api/subjects").then((r) => setSubjects(r.data.subjects)).finally(() => setLoadingSubjects(false));
  }, []);

  const toggle = (id) => {
    const next = new Set(picked);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (picked.size === 0) {
      setError("Pick at least one subject");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/tutors/apply", {
        bio,
        gpa: gpa ? parseFloat(gpa) : undefined,
        subject_ids: Array.from(picked),
      });
      await refresh();
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err, "Application failed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.tutor_profile) {
    return (
      <Layout>
        <Card className="border-0 tc-card mx-auto" style={{ maxWidth: 600 }}>
          <Card.Body className="p-4 text-center">
            <h3 className="mb-3">You've already applied</h3>
            <p className="text-muted">
              Your application is currently <span className={`tc-status-pill tc-status-${user.tutor_profile.status}`}>{user.tutor_profile.status}</span>.
            </p>
            {user.tutor_profile.status === "pending" && <p className="small text-muted">An admin will review it soon.</p>}
            {user.tutor_profile.status === "rejected" && <p className="small text-muted">Reach out to the admin if you have questions.</p>}
          </Card.Body>
        </Card>
      </Layout>
    );
  }

  if (loadingSubjects) return <Layout><div className="text-center py-5"><Spinner animation="border" /></div></Layout>;

  // Group subjects by category
  const grouped = subjects.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="mx-auto" style={{ maxWidth: 720 }}>
        <h2 className="mb-1">Become a Tutor</h2>
        <p className="text-muted mb-4">Tell us about yourself and pick the subjects you'd like to tutor. An admin will review your application.</p>
        <Card className="border-0 tc-card">
          <Card.Body className="p-4">
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>About you</Form.Label>
                <Form.Control as="textarea" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} required minLength={10} maxLength={1000} placeholder="What's your background? Why do you want to tutor?" />
                <Form.Text className="text-muted">{bio.length}/1000</Form.Text>
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Label>GPA <span className="text-muted small">(optional)</span></Form.Label>
                <Form.Control type="number" step="0.01" min="0" max="4" value={gpa} onChange={(e) => setGpa(e.target.value)} style={{ maxWidth: 160 }} placeholder="3.85" />
              </Form.Group>
              <Form.Label>Subjects you can tutor ({picked.size} selected)</Form.Label>
              <div className="border rounded p-3 mb-4" style={{ maxHeight: 320, overflow: "auto" }}>
                {Object.entries(grouped).map(([cat, subs]) => (
                  <div key={cat} className="mb-3">
                    <div className="small fw-semibold text-uppercase text-muted mb-2">{cat}</div>
                    <div className="d-flex flex-wrap gap-2">
                      {subs.map((s) => (
                        <Badge
                          key={s.id}
                          bg={picked.has(s.id) ? "primary" : "light"}
                          text={picked.has(s.id) ? "white" : "dark"}
                          className="border px-3 py-2"
                          style={{ cursor: "pointer", fontSize: ".85rem" }}
                          onClick={() => toggle(s.id)}
                        >
                          {picked.has(s.id) && <i className="bi bi-check2 me-1" />}
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button type="submit" disabled={submitting} size="lg">
                {submitting ? "Submitting…" : "Submit application"}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </Layout>
  );
}
