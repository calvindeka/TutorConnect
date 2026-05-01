import { describe, it, expect } from "vitest";
import { errorMessage } from "../api";

describe("errorMessage", () => {
  it("prefers the API error string", () => {
    const err = { response: { data: { error: "Email already registered" } } };
    expect(errorMessage(err)).toBe("Email already registered");
  });

  it("falls back to express-validator messages", () => {
    const err = { response: { data: { errors: [{ msg: "Password too short" }] } } };
    expect(errorMessage(err)).toBe("Password too short");
  });

  it("falls back to a generic message when nothing is set", () => {
    expect(errorMessage({}, "Custom default")).toBe("Custom default");
  });

  it("uses err.message if no axios response is present", () => {
    expect(errorMessage({ message: "Network Error" })).toBe("Network Error");
  });
});
