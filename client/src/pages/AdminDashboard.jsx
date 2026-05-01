import { useEffect, useState } from "react";
import { Card, Row, Col, Button, Badge, Spinner, Alert, Tabs, Tab, Table, Form, InputGroup } from "react-bootstrap";
import Layout from "../components/Layout";
import { useToast } from "../components/Toaster";
import { api, errorMessage } from "../api";

export default function AdminDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newSubject, setNewSubject] = useState({ name: "", category: "" });
  const [addingSubject, setAddingSubject] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/api/dashboard/stats"),
      api.get("/api/tutors/admin/pending"),
      api.get("/api/reviews/admin/all"),
      api.get("/api/subjects"),
    ])
      .then(([s, p, r, su]) => {
        setStats(s.data);
        setPending(p.data.applications);
        setReviews(r.data.reviews);
        setSubjects(su.data.subjects);
      })
      .catch((e) => setError(errorMessage(e, "Failed to load admin data")))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const decide = async (id, status) => {
    try {
      await api.patch(`/api/tutors/${id}/status`, { status });
      toast.success(`Application ${status}`);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update application"));
    }
  };

  const toggleFlag = async (id, flagged) => {
    try {
      await api.patch(`/api/reviews/${id}/flag`, { flagged });
      toast.success(flagged ? "Review flagged" : "Review unflagged");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update review"));
    }
  };

  const addSubject = async (e) => {
    e.preventDefault();
    setAddingSubject(true);
    try {
      await api.post("/api/subjects", newSubject);
      toast.success(`Added "${newSubject.name}"`);
      setNewSubject({ name: "", category: "" });
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to add subject"));
    } finally {
      setAddingSubject(false);
    }
  };

  const filteredReviews = reviews.filter((r) =>
    !reviewFilter ||
    `${r.student_first_name} ${r.student_last_name} ${r.tutor_first_name} ${r.tutor_last_name} ${r.comment || ""}`
      .toLowerCase()
      .includes(reviewFilter.toLowerCase())
  );

  // Group subjects by category for the manage tab
  const groupedSubjects = subjects.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  if (loading) return <Layout><div className="text-center py-5"><Spinner animation="border" /></div></Layout>;

  return (
    <Layout>
      <h2 className="mb-1">Admin Dashboard</h2>
      <p className="text-muted">Platform overview and moderation tools.</p>
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-3 mb-4">
        <Col md={3}><StatBox label="Users" value={stats.total_users} icon="people" /></Col>
        <Col md={3}><StatBox label="Approved tutors" value={stats.total_tutors} icon="mortarboard" /></Col>
        <Col md={3}><StatBox label="Pending tutors" value={stats.pending_applications} icon="hourglass-split" warn={stats.pending_applications > 0} /></Col>
        <Col md={3}><StatBox label="Total sessions" value={stats.total_sessions} icon="calendar-check" /></Col>
        <Col md={3}><StatBox label="Sessions this week" value={stats.sessions_this_week} icon="lightning" /></Col>
        <Col md={3}><StatBox label="Completed sessions" value={stats.completed_sessions} icon="check2-circle" /></Col>
        <Col md={3}><StatBox label="Avg rating" value={(stats.avg_rating || 0).toFixed(2)} icon="star" /></Col>
        <Col md={3}><StatBox label="Flagged reviews" value={stats.flagged_reviews} icon="flag" warn={stats.flagged_reviews > 0} /></Col>
      </Row>

      <Tabs defaultActiveKey="pending" className="mb-3">
        <Tab eventKey="pending" title={<>Pending applications {pending.length > 0 && <Badge bg="warning" text="dark">{pending.length}</Badge>}</>}>
          <Card className="border-0 tc-card">
            <Card.Body>
              {pending.length === 0 ? (
                <EmptyState icon="check-circle" title="All caught up!" subtitle="No pending tutor applications right now." />
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

        <Tab eventKey="reviews" title={<>Review moderation {reviews.filter((r) => r.flagged).length > 0 && <Badge bg="danger">{reviews.filter((r) => r.flagged).length}</Badge>}</>}>
          <Card className="border-0 tc-card">
            <Card.Body>
              <InputGroup className="mb-3" style={{ maxWidth: 360 }}>
                <InputGroup.Text><i className="bi bi-search" /></InputGroup.Text>
                <Form.Control placeholder="Filter reviews…" value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)} />
              </InputGroup>
              {filteredReviews.length === 0 ? (
                <EmptyState icon="chat-square-text" title="No reviews to moderate" subtitle={reviews.length === 0 ? "No reviews have been submitted yet." : "No reviews match your filter."} />
              ) : (
                <Table hover responsive>
                  <thead>
                    <tr>
                      <th>Student</th><th>Tutor</th><th>Rating</th><th>Comment</th><th>Status</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReviews.map((r) => (
                      <tr key={r.id}>
                        <td>{r.student_first_name} {r.student_last_name}</td>
                        <td>{r.tutor_first_name} {r.tutor_last_name}</td>
                        <td className="tc-star">{"★".repeat(r.rating)}<span className="tc-star-empty">{"★".repeat(5 - r.rating)}</span></td>
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
                <EmptyState icon="bar-chart" title="No session data yet" subtitle="Once students start booking, their most-requested subjects will show up here." />
              ) : (
                <SubjectBarChart data={stats.popular_subjects} />
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="subjects" title={`Subjects (${subjects.length})`}>
          <Row className="g-3">
            <Col md={5}>
              <Card className="border-0 tc-card">
                <Card.Body>
                  <h6 className="mb-3"><i className="bi bi-plus-circle me-2" />Add a subject</h6>
                  <Form onSubmit={addSubject}>
                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted">Name</Form.Label>
                      <Form.Control
                        value={newSubject.name}
                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                        required
                        placeholder="e.g. Differential Equations"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted">Category</Form.Label>
                      <Form.Control
                        list="subject-categories"
                        value={newSubject.category}
                        onChange={(e) => setNewSubject({ ...newSubject, category: e.target.value })}
                        required
                        placeholder="e.g. Mathematics"
                      />
                      <datalist id="subject-categories">
                        {[...new Set(subjects.map((s) => s.category))].map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </Form.Group>
                    <Button type="submit" disabled={addingSubject} className="w-100">
                      {addingSubject ? "Adding…" : "Add subject"}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={7}>
              <Card className="border-0 tc-card">
                <Card.Body>
                  <h6 className="mb-3"><i className="bi bi-collection me-2" />Existing subjects</h6>
                  {Object.entries(groupedSubjects).map(([cat, subs]) => (
                    <div key={cat} className="mb-3">
                      <div className="small fw-semibold text-uppercase text-muted mb-2">{cat}</div>
                      <div className="d-flex flex-wrap gap-1">
                        {subs.map((s) => (
                          <Badge key={s.id} bg="light" text="dark" className="border px-2 py-2">
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </Layout>
  );
}

function StatBox({ label, value, icon, warn = false }) {
  return (
    <div className={`tc-stat d-flex align-items-center ${warn ? "border-warning" : ""}`} style={warn ? { borderLeft: "4px solid #f59e0b" } : undefined}>
      <div className="me-3">
        <i className={`bi bi-${icon}`} style={{ fontSize: 28, color: warn ? "#f59e0b" : "var(--tc-brand-2)" }} />
      </div>
      <div>
        <div className="num" style={{ fontSize: "1.6rem" }}>{value}</div>
        <div className="label">{label}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="text-center py-4">
      <i className={`bi bi-${icon}`} style={{ fontSize: 36, color: "#9ca3af" }} />
      <p className="mt-2 mb-1 fw-semibold">{title}</p>
      <p className="text-muted small mb-0">{subtitle}</p>
    </div>
  );
}

function SubjectBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.session_count));
  return (
    <div>
      {data.map((d) => {
        const pct = max ? (d.session_count / max) * 100 : 0;
        return (
          <div key={d.name} className="mb-3">
            <div className="d-flex justify-content-between align-items-center small mb-1">
              <span className="fw-semibold">{d.name}</span>
              <span className="text-muted">{d.session_count} session{d.session_count !== 1 && "s"}</span>
            </div>
            <div style={{ background: "#e5e7eb", borderRadius: 6, height: 12, overflow: "hidden" }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, var(--tc-brand) 0%, var(--tc-brand-2) 100%)",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
