import { Navbar, Nav, Container, NavDropdown, Badge } from "react-bootstrap";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
    : "";

  return (
    <Navbar expand="md" className="bg-white border-bottom shadow-sm" sticky="top">
      <Container>
        <Navbar.Brand as={Link} to="/" className="tc-logo d-flex align-items-center gap-2" style={{ color: "var(--tc-brand)" }}>
          <i className="bi bi-mortarboard-fill" style={{ color: "var(--tc-brand-2)" }}></i>
          TutorConnect
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="tc-nav" />
        <Navbar.Collapse id="tc-nav">
          <Nav className="me-auto">
            {user && (
              <Nav.Link as={NavLink} to="/tutors">
                <i className="bi bi-search me-1" />Find a Tutor
              </Nav.Link>
            )}
            {user && (
              <Nav.Link as={NavLink} to="/dashboard">
                <i className="bi bi-grid me-1" />Dashboard
              </Nav.Link>
            )}
            {user?.role === "tutor" && (
              <Nav.Link as={NavLink} to="/availability">
                <i className="bi bi-calendar-week me-1" />My Availability
              </Nav.Link>
            )}
            {user?.role === "admin" && (
              <Nav.Link as={NavLink} to="/admin">
                <i className="bi bi-shield-check me-1" />Admin
              </Nav.Link>
            )}
          </Nav>
          <Nav>
            {!user ? (
              <>
                <Nav.Link as={NavLink} to="/login">Sign in</Nav.Link>
                <Nav.Link as={NavLink} to="/register" className="btn btn-primary text-white px-3 ms-2">Sign up</Nav.Link>
              </>
            ) : (
              <NavDropdown
                align="end"
                title={
                  <span className="d-inline-flex align-items-center gap-2">
                    <span className="tc-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{initials || "?"}</span>
                    <span>{user.first_name}</span>
                    <Badge bg={user.role === "admin" ? "danger" : user.role === "tutor" ? "success" : "secondary"} className="text-uppercase">
                      {user.role}
                    </Badge>
                  </span>
                }
                id="tc-user-menu"
              >
                <NavDropdown.Item as={Link} to="/dashboard">Dashboard</NavDropdown.Item>
                {user.role === "student" && (
                  <NavDropdown.Item as={Link} to="/apply">Become a Tutor</NavDropdown.Item>
                )}
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={onLogout}>Sign out</NavDropdown.Item>
              </NavDropdown>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
