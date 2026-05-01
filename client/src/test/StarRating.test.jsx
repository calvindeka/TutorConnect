import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StarRating from "../components/StarRating";

describe("StarRating", () => {
  it("renders 5 star icons by default", () => {
    const { container } = render(<StarRating value={3} />);
    const stars = container.querySelectorAll("i.bi-star-fill");
    expect(stars).toHaveLength(5);
  });

  it("highlights the right number of stars based on value", () => {
    const { container } = render(<StarRating value={4} />);
    const filled = container.querySelectorAll("i.tc-star");
    const empty = container.querySelectorAll("i.tc-star-empty");
    expect(filled).toHaveLength(4);
    expect(empty).toHaveLength(1);
  });

  it("shows the numeric rating when showNumber is true", () => {
    render(<StarRating value={4.7} showNumber />);
    expect(screen.getByText("4.7")).toBeInTheDocument();
  });

  it("rounds the value when computing how many stars are filled", () => {
    const { container } = render(<StarRating value={3.4} />);
    const filled = container.querySelectorAll("i.tc-star");
    expect(filled).toHaveLength(3);
  });
});
