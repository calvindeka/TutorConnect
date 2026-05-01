import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Row, Col, Button, Badge, Spinner, Form, Alert } from "react-bootstrap";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../api";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recSubject, setRecSubject] = useState("");
  const [recs, setRecs] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recSource, setRecSource] = useState("");
  const [recError, setRecError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/api/sessions"),
      api.get("/api/subjects"),
    ])
      .then(([s, subj]) => {
        setSessions(s.data.sessions);
        setSubjects(subj.data.subjects);
        if (subj.data.subjects.length > 0) setRecSubject(String(subj.data.subjects[0].id));
      })
      .finally(() => setLoading(false));
  }, []);

  const getRecs = async (e) => {
    e?.preventDefault();
    if (!recSubject) return;
    setRecLoading(true);
    setRecError("");
    try {
      const { data } = await api.get("/api/recommend", { params: { subject_id: recSubject } });
      setRecs(data.recommendations);
      setRecSource(data.source);
    } catch (err) {
      setRecError(errorMessage(err, "Failed to get recommendations"));
    } finally {
      setRecLoading(false);
    }
  };

  if (loading) return <Layout><div className="text-center py-5"><Spinner animation="border" /></div></Layout>;

  const upcoming = sessions.filter((s) => ["requested", "confirmed"].includes(s.status));
  const past = sessions.filter((s) => ["completed", "cancelled"].includes(s.status));

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="mb-1">Welcome back, {user.first_name}!</h2>
          <div className="text-muted">Here's what's happening with your tutoring.</div>
        </div>
        <div className="d-flex gap-2">
          <Button as={Link} to="/tutors" variant="primary">
            <i className="bi bi-search me-2" />Find a tutor
          </Button>
          {user.role === "student" && !user.tutor_profile && (
            <Button as={Link} to="/apply" variant="outline-secondary">
              Become a tutor
            </Button>
          )}
        </div>
      </div>

      <Row className="g-4 mb-4">
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
        <Col md={4}>
          <div className="tc-stat">
            <div className="num">{past.filter((s) => s.status === "completed" && !s.has_review).length}</div>
            <div className="label">Awaiting your review</div>
          </div>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 tc-card mb-4">
            <Card.Body>
              <h5 className="mb-3"><i className="bi bi-calendar-event me-2" />Upcoming sessions</h5>
              {upcoming.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-calendar2-x" style={{ fontSize: 36, color: "#9ca3af" }} />
                  <p className="mt-2 mb-1 fw-semibold">No upcoming sessions</p>
                  <p className="text-muted small mb-2">Find a tutor and book your first one.</p>
                  <Button as={Link} to="/tutors" size="sm" variant="primary">
                    <i className="bi bi-search me-1" />Browse tutors
                  </Button>
                </div>
              ) : (
                upcoming.map((s) => <SessionRow key={s.id} session={s} />)
              )}
            </Card.Body>
          </Card>

          <Card className="border-0 tc-card">
            <Card.Body>
              <h5 className="mb-3"><i className="bi bi-clock-history me-2" />Past sessions</h5>
              {past.length === 0 ? (
                <p className="text-muted small mb-0 text-center py-3">No past sessions yet.</p>
              ) : (
                past.slice(0, 8).map((s) => <SessionRow key={s.id} session={s} />)
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 tc-card">
            <Card.Body>
              <h5 className="mb-1"><i className="bi bi-stars me-2" />AI tutor matching</h5>
              <p className="text-muted small mb-3">Pick a subject and we'll recommend the best-fit tutor.</p>
              <Form onSubmit={getRecs} className="mb-3">
                <Form.Select className="mb-2" value={recSubject} onChange={(e) => setRecSubject(e.target.value)}>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Form.Select>
                <Button type="submit" className="w-100" disabled={recLoading}>
                  {recLoading ? "Thinking…" : "Recommend tutors"}
                </Button>
              </Form>
              {recError && <Alert variant="danger" className="py-2">{recError}</Alert>}
              {recs.length > 0 && (
                <div>
                  <div className="small text-muted mb-2">
                    Source: {recSource === "ai" ? <Badge bg="info">AI</Badge> : <Badge bg="secondary">Heuristic fallback</Badge>}
                  </div>
                  {recs.map((r) => (
                    <Card key={r.tutor_id} as={Link} to={`/tutors/${r.tutor_id}`} className="mb-2 border-0 text-decoration-none text-reset tc-tutor-card">
                      <Card.Body className="py-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <strong>{r.first_name} {r.last_name}</strong>
                          <small className="text-muted">★ {Number(r.avg_rating || 0).toFixed(1)}</small>
                        </div>
                        <div className="small text-muted">{r.reason}</div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Layout>
  );
}

function SessionRow({ session }) {
  return (
    <div className="d-flex justify-content-between align-items-center border-bottom py-2">
      <div>
        <Link to={`/sessions/${session.id}`} className="text-decoration-none text-reset fw-semibold">
          {session.subject} with {session.tutor_first_name} {session.tutor_last_name}
        </Link>
        <div className="small text-muted">
          {new Date(session.session_date).toLocaleDateString()} · {session.start_time.slice(0,5)}–{session.end_time.slice(0,5)}
          {session.location && <> · {session.location}</>}
        </div>
      </div>
      <span className={`tc-status-pill tc-status-${session.status}`}>{session.status}</span>
    </div>
  );
}
