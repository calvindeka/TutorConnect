import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import HomePage from "../pages/HomePage";

// Stub axios so AuthProvider doesn't try to hit a real backend
import { vi } from "vitest";
vi.mock("../api", async () => {
  return {
    api: {
      get: vi.fn().mockRejectedValue({ response: { status: 401 } }),
      post: vi.fn(),
    },
    errorMessage: (err, fallback) => err?.message || fallback || "err",
  };
});

describe("HomePage", () => {
  it("shows the marketing hero and CTA buttons", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <HomePage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Hero copy
    expect(screen.getByText(/Find the right tutor/i)).toBeInTheDocument();
    expect(screen.getByText(/Book in seconds/i)).toBeInTheDocument();
    // The three feature cards
    expect(screen.getByText(/Search & filter/i)).toBeInTheDocument();
    expect(screen.getByText(/Book sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/AI recommendations/i)).toBeInTheDocument();
    // CTA buttons
    expect(screen.getByText(/Get started/i)).toBeInTheDocument();
  });
});
