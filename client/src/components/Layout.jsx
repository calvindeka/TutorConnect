import { Container } from "react-bootstrap";
import NavBar from "./NavBar";

export default function Layout({ children, fluid = false }) {
  return (
    <div className="min-vh-100 d-flex flex-column">
      <NavBar />
      <main className="flex-grow-1 py-4">
        <Container fluid={fluid}>{children}</Container>
      </main>
      <footer className="border-top py-3 text-center text-muted small bg-white mt-4">
        TutorConnect · SCMP 318 Final Project · Built with React, Express, MariaDB, Bootstrap
      </footer>
    </div>
  );
}
