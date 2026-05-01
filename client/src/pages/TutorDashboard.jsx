import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Row, Col, Button, Spinner, Alert } from "react-bootstrap";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toaster";
import { api, errorMessage } from "../api";

export default function TutorDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api.get("/api/sessions").then((r) => setSessions(r.data.sessions)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const STATUS_LABEL = { confirmed: "confirmed", completed: "marked completed", cancelled: "cancelled" };
  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/api/sessions/${id}/status`, { status });
      toast.success(`Session ${STATUS_LABEL[status] || "updated"}`);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update session"));
    }
  };

  if (loading) return <Layout><div className="text-center py-5"><Spinner animation="border" /></div></Layout>;

  // For tutors, sessions list contains both their tutor sessions and any sessions where they're the student
  const myTutorSessions = sessions.filter((s) => s.tutor_first_name === user.first_name && s.tutor_last_name === user.last_name);
  const requested = myTutorSessions.filter((s) => s.status === "requested");
  const upcoming = myTutorSessions.filter((s) => s.status === "confirmed");
  const past = myTutorSessions.filter((s) => ["completed", "cancelled"].includes(s.status));

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="mb-1">Tutor Dashboard</h2>
          <div className="text-muted">Manage your incoming requests and upcoming sessions.</div>
        </div>
        <div className="d-flex gap-2">
          <Button as={Link} to="/availability" variant="primary">
            <i className="bi bi-calendar-week me-2" />Set availability
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-4 mb-4">
        <Col md={4}>
          <div className="tc-stat">
            <div className="num">{requested.length}</div>
            <div className="label">Pending requests</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="tc-stat">
            <div className="num">{upcoming.length}</div>
            <div className="label">Upcoming sessions</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="tc-stat">
            <div className="num">{past.filter((s) => s.status === "completed").length}</div>
            <div className="label">Completed sessions</div>
          </div>
        </Col>
      </Row>

      <Card className="border-0 tc-card mb-4">
        <Card.Body>
          <h5 className="mb-3"><i className="bi bi-bell me-2" />New requests</h5>
          {requested.length === 0 ? (
            <p className="text-muted small mb-0">No pending requests right now.</p>
          ) : requested.map((s) => (
            <div key={s.id} className="border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <Link to={`/sessions/${s.id}`} className="fw-semibold text-decoration-none text-reset">
                  {s.subject} with {s.student_first_name} {s.student_last_name}
                </Link>
                <div className="small text-muted">
                  {new Date(s.session_date).toLocaleDateString()} · {s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}
                  {s.location && <> · {s.location}</>}
                </div>
                {s.notes && <div className="small mt-1 text-muted fst-italic">"{s.notes}"</div>}
              </div>
              <div className="d-flex gap-2">
                <Button size="sm" variant="success" onClick={() => updateStatus(s.id, "confirmed")}>
                  <i className="bi bi-check-lg me-1" />Confirm
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => updateStatus(s.id, "cancelled")}>
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </Card.Body>
      </Card>

      <Card className="border-0 tc-card mb-4">
        <Card.Body>
          <h5 className="mb-3"><i className="bi bi-calendar-event me-2" />Upcoming confirmed sessions</h5>
          {upcoming.length === 0 ? (
            <p className="text-muted small mb-0">No confirmed sessions yet.</p>
          ) : upcoming.map((s) => (
            <div key={s.id} className="border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <Link to={`/sessions/${s.id}`} className="fw-semibold text-decoration-none text-reset">
                  {s.subject} with {s.student_first_name} {s.student_last_name}
                </Link>
                <div className="small text-muted">
                  {new Date(s.session_date).toLocaleDateString()} · {s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}
                  {s.location && <> · {s.location}</>}
                </div>
              </div>
              <div className="d-flex gap-2">
                <Button size="sm" variant="primary" onClick={() => updateStatus(s.id, "completed")}>
                  Mark completed
                </Button>
                <Button size="sm" variant="outline-secondary" onClick={() => updateStatus(s.id, "cancelled")}>
                  Cancel
                </Button>
              </div>
            </div>
          ))}
        </Card.Body>
      </Card>

      <Card className="border-0 tc-card">
        <Card.Body>
          <h5 className="mb-3"><i className="bi bi-clock-history me-2" />Past sessions</h5>
          {past.length === 0 ? (
            <p className="text-muted small mb-0">No past sessions yet.</p>
          ) : past.map((s) => (
            <div key={s.id} className="border-bottom py-2 d-flex justify-content-between align-items-center">
              <div>
                <Link to={`/sessions/${s.id}`} className="text-decoration-none text-reset fw-semibold">
                  {s.subject} with {s.student_first_name} {s.student_last_name}
                </Link>
                <div className="small text-muted">{new Date(s.session_date).toLocaleDateString()}</div>
              </div>
              <span className={`tc-status-pill tc-status-${s.status}`}>{s.status}</span>
            </div>
          ))}
        </Card.Body>
      </Card>
    </Layout>
  );
}
