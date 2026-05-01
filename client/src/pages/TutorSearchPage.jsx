import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, Form, Row, Col, Badge, InputGroup, Button, Spinner, Alert } from "react-bootstrap";
import Layout from "../components/Layout";
import StarRating from "../components/StarRating";
import { api, errorMessage } from "../api";

const DAYS = [
  { v: "", l: "Any day" },
  { v: "mon", l: "Monday" }, { v: "tue", l: "Tuesday" }, { v: "wed", l: "Wednesday" },
  { v: "thu", l: "Thursday" }, { v: "fri", l: "Friday" }, { v: "sat", l: "Saturday" }, { v: "sun", l: "Sunday" },
];

export default function TutorSearchPage() {
  const [tutors, setTutors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({ subject: "", min_rating: "", day: "", q: "", sort_by: "rating" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/subjects").then((r) => setSubjects(r.data.subjects)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    api
      .get("/api/tutors", { params })
      .then((r) => setTutors(r.data.tutors))
      .catch((e) => setError(errorMessage(e, "Failed to load tutors")))
      .finally(() => setLoading(false));
  }, [filters]);

  const grouped = useMemo(() => {
    const map = {};
    subjects.forEach((s) => {
      if (!map[s.category]) map[s.category] = [];
      map[s.category].push(s);
    });
    return map;
  }, [subjects]);

  return (
    <Layout>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h2 className="mb-1">Find a Tutor</h2>
          <div className="text-muted">Browse approved peer tutors at Kenyon.</div>
        </div>
      </div>

      <Card className="mb-4 border-0 tc-card">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Label className="small text-muted">Search</Form.Label>
              <InputGroup>
                <InputGroup.Text><i className="bi bi-search" /></InputGroup.Text>
                <Form.Control
                  placeholder="Search by name or bio…"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Label className="small text-muted">Subject</Form.Label>
              <Form.Select value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })}>
                <option value="">All subjects</option>
                {Object.entries(grouped).map(([cat, subs]) => (
                  <optgroup key={cat} label={cat}>
                    {subs.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </optgroup>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="small text-muted">Day available</Form.Label>
              <Form.Select value={filters.day} onChange={(e) => setFilters({ ...filters, day: e.target.value })}>
                {DAYS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="small text-muted">Min rating</Form.Label>
              <Form.Select value={filters.min_rating} onChange={(e) => setFilters({ ...filters, min_rating: e.target.value })}>
                <option value="">Any</option>
                <option value="3">3+ stars</option>
                <option value="4">4+ stars</option>
                <option value="4.5">4.5+ stars</option>
              </Form.Select>
            </Col>
            <Col md={1}>
              <Form.Label className="small text-muted">Sort</Form.Label>
              <Form.Select value={filters.sort_by} onChange={(e) => setFilters({ ...filters, sort_by: e.target.value })}>
                <option value="rating">Rating</option>
                <option value="sessions">Sessions</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : tutors.length === 0 ? (
        <Card className="text-center py-5 tc-card border-0"><Card.Body>
          <i className="bi bi-search" style={{ fontSize: 36, color: "#9ca3af" }} />
          <p className="mt-3 mb-1 fw-semibold">No tutors match those filters.</p>
          <p className="text-muted small">Try clearing some filters or picking a different subject.</p>
          <Button variant="outline-secondary" onClick={() => setFilters({ subject: "", min_rating: "", day: "", q: "", sort_by: "rating" })}>Reset filters</Button>
        </Card.Body></Card>
      ) : (
        <Row className="g-4">
          {tutors.map((t) => (
            <Col md={6} lg={4} key={t.id}>
              <Card as={Link} to={`/tutors/${t.id}`} className="text-decoration-none text-reset border-0 tc-card tc-tutor-card h-100">
                <Card.Body>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <span className="tc-avatar">{(t.first_name?.[0] || "") + (t.last_name?.[0] || "")}</span>
                    <div>
                      <div className="fw-semibold">{t.first_name} {t.last_name}</div>
                      <div className="small text-muted">
                        {t.gpa && <>GPA {Number(t.gpa).toFixed(2)} · </>}
                        {t.total_sessions} session{t.total_sessions !== 1 && "s"}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted small mb-3" style={{ minHeight: 40 }}>
                    {t.bio?.length > 110 ? t.bio.slice(0, 110) + "…" : t.bio}
                  </p>
                  <div className="d-flex flex-wrap gap-1 mb-3">
                    {t.subjects?.slice(0, 3).map((s) => (
                      <Badge key={s.id} bg="light" text="dark" className="border">{s.name}</Badge>
                    ))}
                    {t.subjects?.length > 3 && <Badge bg="light" text="dark" className="border">+{t.subjects.length - 3}</Badge>}
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <StarRating value={t.avg_rating} showNumber />
                    <small className="text-muted">{t.review_count} review{t.review_count !== 1 && "s"}</small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Layout>
  );
}
