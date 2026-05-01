import { createContext, useContext, useState, useCallback } from "react";
import { Toast, ToastContainer } from "react-bootstrap";

const ToastCtx = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, variant = "primary") => {
    const id = nextId++;
    setToasts((cur) => [...cur, { id, message, variant }]);
    setTimeout(() => remove(id), 4500);
  }, [remove]);

  const api = {
    success: (m) => show(m, "success"),
    error: (m) => show(m, "danger"),
    info: (m) => show(m, "info"),
    warn: (m) => show(m, "warning"),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1100 }}>
        {toasts.map((t) => (
          <Toast key={t.id} bg={t.variant} onClose={() => remove(t.id)}>
            <Toast.Header closeButton>
              <strong className="me-auto text-capitalize">{t.variant === "danger" ? "Error" : t.variant === "warning" ? "Warning" : t.variant === "success" ? "Success" : "Heads up"}</strong>
            </Toast.Header>
            <Toast.Body className={t.variant === "danger" || t.variant === "success" ? "text-white" : ""}>
              {t.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
