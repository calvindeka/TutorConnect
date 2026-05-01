import axios from "axios";

// Single-port architecture: in production the React build is served by Express
// at the same origin. In dev we hit the Express server directly.
const baseURL = import.meta.env.DEV ? "http://localhost:4131" : "";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Helper to extract a useful error message
export function errorMessage(err, fallback = "Something went wrong") {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.errors?.[0]?.msg ||
    err?.message ||
    fallback
  );
}
