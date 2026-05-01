import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, Button, Form, Alert, Spinner, Row, Col, Badge } from "react-bootstrap";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../api";
import { StarPicker } from "../components/StarRating";

export default function SessionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/api/sessions/${id}`)
      .then((r) => setSession(r.data.session))
      .catch((e) => setError(errorMessage(e, "Could not load session")))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  if (loading) return <Layout><div className="text-center py-5"><Spinner animation="border" /></div></Layout>;
  if (error) return <Layout><Alert variant="danger">{error}</Alert></Layout>;
  if (!session) return null;

  const isStudent = session.student_id === user.id;
  const isTutor = session.tutor_user_id === user.id;

  const updateStatus = async (status) => {
    try {
      await api.patch(`/api/sessions/${id}/status`, { status });
      load();
    } catch (err) {
      setError(errorMessage(err, "Failed to update session"));
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/reviews", { session_id: session.id, rating, comment: comment || null });
      setReviewSubmitted(true);
    } catch (err) {
      setError(errorMessage(err, "Failed to submit review"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto" style={{ maxWidth: 720 }}>
        <Link to="/dashboard" className="small text-muted text-decoration-none mb-3 d-inline-block">
          <i className="bi bi-arrow-left me-1" />Back to dashboard
        </Link>
        <Card className="border-0 tc-card mb-4">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
              <div>
                <h3 className="mb-1">{session.subject}</h3>
                <p className="text-muted mb-0">
                  {session.tutor_first_name} {session.tutor_last_name} · {session.student_first_name} {session.student_last_name}
                </p>
              </div>
              <span className={`tc-status-pill tc-status-${session.status}`}>{session.status}</span>
            </div>
            <Row className="g-3 mt-2">
              <Col md={6}>
                <div className="text-muted small">Date</div>
                <div className="fw-semibold">{new Date(session.session_date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
              </Col>
              <Col md={6}>
                <div className="text-muted small">Time</div>
                <div className="fw-semibold">{session.start_time.slice(0,5)} – {session.end_time.slice(0,5)}</div>
              </Col>
              {session.location && (
                <Col md={12}>
                  <div className="text-muted small">Location</div>
                  <div className="fw-semibold">{session.location}</div>
                </Col>
              )}
              {session.notes && (
                <Col md={12}>
                  <div className="text-muted small">Notes from student</div>
                  <div className="fst-italic">"{session.notes}"</div>
                </Col>
              )}
            </Row>

            <div className="d-flex gap-2 mt-4 flex-wrap">
              {isTutor && session.status === "requested" && (
                <>
                  <Button variant="success" onClick={() => updateStatus("confirmed")}>
                    <i className="bi bi-check-lg me-1" />Confirm session
                  </Button>
                  <Button variant="outline-danger" onClick={() => updateStatus("cancelled")}>Decline</Button>
                </>
              )}
              {isTutor && session.status === "confirmed" && (
                <>
                  <Button onClick={() => updateStatus("completed")}>Mark completed</Button>
                  <Button variant="outline-danger" onClick={() => updateStatus("cancelled")}>Cancel</Button>
                </>
              )}
              {isStudent && session.status === "requested" && (
                <Button variant="outline-danger" onClick={() => updateStatus("cancelled")}>Cancel request</Button>
              )}
              {isStudent && session.status === "confirmed" && (
                <Button variant="outline-danger" onClick={() => updateStatus("cancelled")}>Cancel session</Button>
              )}
            </div>
          </Card.Body>
        </Card>

        {isStudent && session.status === "completed" && (
          <Card className="border-0 tc-card">
            <Card.Body className="p-4">
              <h5 className="mb-3">Leave a review</h5>
              {reviewSubmitted ? (
                <Alert variant="success" className="mb-0">Thanks for your review!</Alert>
              ) : (
                <Form onSubmit={submitReview}>
                  <Form.Group className="mb-3">
                    <Form.Label>Rating</Form.Label>
                    <div><StarPicker value={rating} onChange={setRating} /></div>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Comment <span className="text-muted small">(optional)</span></Form.Label>
                    <Form.Control as="textarea" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} placeholder="How was the session?" />
                  </Form.Group>
                  <Button type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit review"}</Button>
                </Form>
              )}
            </Card.Body>
          </Card>
        )}
      </div>
    </Layout>
  );
}
