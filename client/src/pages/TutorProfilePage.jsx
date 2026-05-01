import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, Row, Col, Badge, Button, Spinner, Alert, Form, Modal, Table } from "react-bootstrap";
import Layout from "../components/Layout";
import StarRating from "../components/StarRating";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../api";

const DAY_LABEL = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function TutorProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState(null);
  const [reviews, setReviews] = useState({ reviews: [], avg_rating: 0, total_reviews: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showBook, setShowBook] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/tutors/${id}`),
      api.get(`/api/reviews/${id}`),
    ])
      .then(([tRes, rRes]) => {
        setTutor(tRes.data.tutor);
        setReviews(rRes.data);
      })
      .catch((e) => setError(errorMessage(e, "Failed to load tutor")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Layout><div className="text-center py-5"><Spinner animation="border" /></div></Layout>;
  if (error) return <Layout><Alert variant="danger">{error}</Alert></Layout>;
  if (!tutor) return null;

  const avail = [...(tutor.availability || [])].sort((a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week));

  return (
    <Layout>
      <Link to="/tutors" className="small text-muted text-decoration-none mb-3 d-inline-block">
        <i className="bi bi-arrow-left me-1" />Back to search
      </Link>
      <Card className="border-0 tc-card mb-4">
        <Card.Body className="p-4">
          <div className="d-flex flex-wrap align-items-center gap-4">
            <span className="tc-avatar tc-avatar-lg">
              {(tutor.first_name?.[0] || "") + (tutor.last_name?.[0] || "")}
            </span>
            <div className="flex-grow-1">
              <h2 className="mb-1">{tutor.first_name} {tutor.last_name}</h2>
              <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
                <StarRating value={tutor.avg_rating} showNumber />
                <span className="text-muted small">{tutor.review_count} review{tutor.review_count !== 1 && "s"}</span>
                <span className="text-muted small">·</span>
                <span className="text-muted small">{tutor.total_sessions} completed session{tutor.total_sessions !== 1 && "s"}</span>
                {tutor.gpa && <><span className="text-muted small">·</span><span className="text-muted small">GPA {Number(tutor.gpa).toFixed(2)}</span></>}
              </div>
              <p className="mb-0 mt-2">{tutor.bio}</p>
            </div>
            {user?.role === "student" || user?.role === "tutor" ? (
              <div className="ms-auto">
                <Button size="lg" onClick={() => setShowBook(true)} disabled={tutor.user_id === user.id}>
                  <i className="bi bi-calendar-plus me-2" />Request session
                </Button>
                {tutor.user_id === user.id && <div className="small text-muted mt-2 text-end">That's you!</div>}
              </div>
            ) : null}
          </div>
        </Card.Body>
      </Card>

      <Row className="g-4">
        <Col md={5}>
          <Card className="border-0 tc-card mb-4">
            <Card.Body>
              <h5 className="mb-3"><i className="bi bi-mortarboard me-2" />Subjects</h5>
              <div className="d-flex flex-wrap gap-2">
                {tutor.subjects.map((s) => (
                  <Badge key={s.id} bg="light" text="dark" className="border px-2 py-2">
                    {s.name}
                    <span className="text-muted ms-2 small">{s.category}</span>
                  </Badge>
                ))}
              </div>
            </Card.Body>
          </Card>
          <Card className="border-0 tc-card">
            <Card.Body>
              <h5 className="mb-3"><i className="bi bi-clock me-2" />Weekly availability</h5>
              {avail.length === 0 ? (
                <p className="text-muted small mb-0">No availability set yet.</p>
              ) : (
                <Table size="sm" className="mb-0">
                  <tbody>
                    {avail.map((a) => (
                      <tr key={a.id}>
                        <td className="fw-semibold">{DAY_LABEL[a.day_of_week]}</td>
                        <td className="text-muted">{a.start_time.slice(0,5)} – {a.end_time.slice(0,5)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={7}>
          <Card className="border-0 tc-card">
            <Card.Body>
              <h5 className="mb-3"><i className="bi bi-chat-quote me-2" />Reviews</h5>
              {reviews.reviews.length === 0 ? (
                <p className="text-muted small mb-0">No reviews yet — be the first to book a session.</p>
              ) : (
                reviews.reviews.map((r) => (
                  <div key={r.id} className="border-bottom pb-3 mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <strong>{r.student_first_name}</strong>
                      <StarRating value={r.rating} />
                    </div>
                    <div className="small text-muted mb-1">
                      {r.subject} · {new Date(r.created_at).toLocaleDateString()}
                    </div>
                    {r.comment && <div>{r.comment}</div>}
                  </div>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <BookSessionModal
        show={showBook}
        onHide={() => setShowBook(false)}
        tutor={tutor}
        onBooked={(id) => { setShowBook(false); navigate(`/sessions/${id}`); }}
      />
    </Layout>
  );
}

function BookSessionModal({ show, onHide, tutor, onBooked }) {
  const [form, setForm] = useState({
    subject_id: tutor.subjects[0]?.id || "",
    session_date: "",
    start_time: "",
    end_time: "",
    location: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/sessions", {
        tutor_profile_id: tutor.id,
        subject_id: parseInt(form.subject_id, 10),
        session_date: form.session_date,
        start_time: form.start_time,
        end_time: form.end_time,
        location: form.location || null,
        notes: form.notes || null,
      });
      onBooked(data.id);
    } catch (err) {
      setError(errorMessage(err, "Could not book session"));
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Request session with {tutor.first_name}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={onSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Subject</Form.Label>
            <Form.Select name="subject_id" value={form.subject_id} onChange={onChange} required>
              {tutor.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Date</Form.Label>
            <Form.Control type="date" name="session_date" value={form.session_date} onChange={onChange} required min={today} />
          </Form.Group>
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Start time</Form.Label>
                <Form.Control type="time" name="start_time" value={form.start_time} onChange={onChange} required />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>End time</Form.Label>
                <Form.Control type="time" name="end_time" value={form.end_time} onChange={onChange} required />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label>Location <span className="text-muted small">(optional)</span></Form.Label>
            <Form.Control name="location" value={form.location} onChange={onChange} placeholder="e.g. Olin Library Room 204" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Notes <span className="text-muted small">(optional)</span></Form.Label>
            <Form.Control as="textarea" rows={3} name="notes" value={form.notes} onChange={onChange} placeholder="What do you need help with?" />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? "Sending…" : "Send request"}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
