import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../api", () => ({
  api: { get: vi.fn().mockRejectedValue({ response: { status: 401 } }), post: vi.fn() },
  errorMessage: (e, f) => f || "err",
}));

import { AuthProvider } from "../context/AuthContext";
import NavBar from "../components/NavBar";

describe("NavBar (logged-out state)", () => {
  it("shows Sign in and Sign up links when there is no user", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <NavBar />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Sign in/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign up/i)).toBeInTheDocument();
    // The user dropdown shouldn't be present
    expect(screen.queryByText(/Account settings/i)).toBeNull();
  });
});
