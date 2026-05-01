import { Link } from "react-router-dom";
import { Container, Row, Col, Button, Card } from "react-bootstrap";
import Layout from "../components/Layout";

export default function HomePage() {
  return (
    <Layout>
      <div className="tc-hero mb-5" style={{ marginLeft: -12, marginRight: -12, marginTop: -16, padding: "5rem 1rem" }}>
        <Container className="text-center">
          <h1 className="display-4 fw-bold mb-3">Find the right tutor.<br />Book in seconds.</h1>
          <p className="lead opacity-90 mb-4">
            TutorConnect is the peer tutoring platform built for Kenyon students.<br />
            Browse verified tutors by subject, see real reviews, and book a session that works for you.
          </p>
          <div className="d-flex gap-2 justify-content-center">
            <Button as={Link} to="/register" variant="light" size="lg">
              <i className="bi bi-person-plus me-2" />Get started
            </Button>
            <Button as={Link} to="/login" variant="outline-light" size="lg">
              Sign in
            </Button>
          </div>
        </Container>
      </div>
      <Container className="mb-5">
        <Row className="g-4">
          <Col md={4}>
            <Card className="border-0 tc-card h-100">
              <Card.Body>
                <i className="bi bi-search fs-2" style={{ color: "var(--tc-brand-2)" }} />
                <h5 className="mt-3">Search & filter</h5>
                <p className="text-muted small mb-0">Find tutors by subject, rating, and availability — only approved tutors show up.</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="border-0 tc-card h-100">
              <Card.Body>
                <i className="bi bi-calendar-check fs-2" style={{ color: "var(--tc-brand-2)" }} />
                <h5 className="mt-3">Book sessions</h5>
                <p className="text-muted small mb-0">Request a session, the tutor confirms, you both meet up. Status tracked end-to-end.</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="border-0 tc-card h-100">
              <Card.Body>
                <i className="bi bi-stars fs-2" style={{ color: "var(--tc-brand-2)" }} />
                <h5 className="mt-3">AI recommendations</h5>
                <p className="text-muted small mb-0">Not sure who to pick? Our AI ranks the best-fit tutor for your subject and explains why.</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
}
