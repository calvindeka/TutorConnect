import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

// In production, the React build is served by Express on the same origin
// In dev, we proxy to localhost:4131
const baseURL = import.meta.env.DEV ? "http://localhost:4131" : "";

const API = axios.create({
  baseURL,
  withCredentials: true,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if there's an active session
  useEffect(() => {
    API.get("/api/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, name) => {
    const res = await API.post("/auth/login", { email, name });
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    await API.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
