import { useEffect, useState } from "react";
import { Card, Row, Col, Button, Badge, Spinner, Alert, Tabs, Tab, Table } from "react-bootstrap";
import Layout from "../components/Layout";
import { api, errorMessage } from "../api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/api/dashboard/stats"),
      api.get("/api/tutors/admin/pending"),
      api.get("/api/reviews/admin/all"),
    ])
      .then(([s, p, r]) => {
        setStats(s.data);
        setPending(p.data.applications);
        setReviews(r.data.reviews);
      })
      .catch((e) => setError(errorMessage(e, "Failed to load admin data")))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const decide = async (id, status) => {
    try {
      await api.patch(`/api/tutors/${id}/status`, { status });
      load();
    } catch (err) {
      setError(errorMessage(err, "Failed to update application"));
    }
  };

  const toggleFlag = async (id, flagged) => {
    try {
      await api.patch(`/api/reviews/${id}/flag`, { flagged });
      load();
    } catch (err) {
      setError(errorMessage(err, "Failed to update review"));
    }
  };

  if (loading) return <Layout><div className="text-center py-5"><Spinner animation="border" /></div></Layout>;

  return (
    <Layout>
      <h2 className="mb-1">Admin Dashboard</h2>
      <p className="text-muted">Platform overview and moderation tools.</p>
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-3 mb-4">
        <Col md={3}><StatBox label="Users" value={stats.total_users} icon="people" /></Col>
        <Col md={3}><StatBox label="Approved tutors" value={stats.total_tutors} icon="mortarboard" /></Col>
        <Col md={3}><StatBox label="Pending tutors" value={stats.pending_applications} icon="hourglass-split" /></Col>
        <Col md={3}><StatBox label="Total sessions" value={stats.total_sessions} icon="calendar-check" /></Col>
        <Col md={3}><StatBox label="Sessions this week" value={stats.sessions_this_week} icon="lightning" /></Col>
        <Col md={3}><StatBox label="Completed sessions" value={stats.completed_sessions} icon="check2-circle" /></Col>
        <Col md={3}><StatBox label="Avg rating" value={(stats.avg_rating || 0).toFixed(2)} icon="star" /></Col>
        <Col md={3}><StatBox label="Flagged reviews" value={stats.flagged_reviews} icon="flag" /></Col>
      </Row>

      <Tabs defaultActiveKey="pending" className="mb-3">
        <Tab eventKey="pending" title={`Pending applications (${pending.length})`}>
          <Card className="border-0 tc-card">
            <Card.Body>
              {pending.length === 0 ? (
                <p className="text-muted small mb-0">No pending applications.</p>
              ) : (
                pending.map((a) => (
                  <div key={a.id} className="border-bottom py-3">
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                      <div className="flex-grow-1">
                        <div className="fw-semibold mb-1">
                          {a.first_name} {a.last_name}
                          <span className="text-muted small ms-2">{a.email}</span>
                          {a.gpa && <span className="text-muted small ms-2">GPA {Number(a.gpa).toFixed(2)}</span>}
                        </div>
                        <div className="text-muted mb-2">{a.bio}</div>
                        <div className="d-flex flex-wrap gap-1">
                          {a.subjects.map((s) => (
                            <Badge key={s.id} bg="light" text="dark" className="border">{s.name}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="d-flex gap-2 align-self-start">
                        <Button size="sm" variant="success" onClick={() => decide(a.id, "approved")}>
                          <i className="bi bi-check2 me-1" />Approve
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => decide(a.id, "rejected")}>
                          <i className="bi bi-x me-1" />Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="reviews" title={`Review moderation (${reviews.length})`}>
          <Card className="border-0 tc-card">
            <Card.Body>
              {reviews.length === 0 ? (
                <p className="text-muted small mb-0">No reviews yet.</p>
              ) : (
                <Table hover responsive>
                  <thead>
                    <tr>
                      <th>Student</th><th>Tutor</th><th>Rating</th><th>Comment</th><th>Status</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((r) => (
                      <tr key={r.id}>
                        <td>{r.student_first_name} {r.student_last_name}</td>
                        <td>{r.tutor_first_name} {r.tutor_last_name}</td>
                        <td>{"★".repeat(r.rating)}</td>
                        <td className="small">{r.comment || <em className="text-muted">(no comment)</em>}</td>
                        <td>{r.flagged ? <Badge bg="danger">Flagged</Badge> : <Badge bg="success">Visible</Badge>}</td>
                        <td>
                          <Button size="sm" variant={r.flagged ? "outline-secondary" : "outline-warning"} onClick={() => toggleFlag(r.id, !r.flagged)}>
                            {r.flagged ? "Unflag" : "Flag"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="popular" title="Popular subjects">
          <Card className="border-0 tc-card">
            <Card.Body>
              {stats.popular_subjects.length === 0 ? (
                <p className="text-muted small mb-0">No session data yet.</p>
              ) : (
                <Table>
                  <thead><tr><th>Subject</th><th className="text-end">Sessions</th></tr></thead>
                  <tbody>
                    {stats.popular_subjects.map((p) => (
                      <tr key={p.name}><td>{p.name}</td><td className="text-end">{p.session_count}</td></tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Layout>
  );
}

function StatBox({ label, value, icon }) {
  return (
    <div className="tc-stat d-flex align-items-center">
      <div className="me-3">
        <i className={`bi bi-${icon}`} style={{ fontSize: 28, color: "var(--tc-brand-2)" }} />
      </div>
      <div>
        <div className="num" style={{ fontSize: "1.6rem" }}>{value}</div>
        <div className="label">{label}</div>
      </div>
    </div>
  );
}
