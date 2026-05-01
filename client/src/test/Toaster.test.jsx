import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "../components/Toaster";

function Trigger({ kind, message }) {
  const toast = useToast();
  return <button onClick={() => toast[kind](message)}>fire</button>;
}

describe("Toaster", () => {
  it("renders a success toast when toast.success is called", async () => {
    const { container } = render(
      <ToastProvider>
        <Trigger kind="success" message="It worked!" />
      </ToastProvider>
    );
    await act(async () => {
      container.querySelector("button").click();
    });
    expect(screen.getByText("It worked!")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("renders an error toast when toast.error is called", async () => {
    const { container } = render(
      <ToastProvider>
        <Trigger kind="error" message="Boom" />
      </ToastProvider>
    );
    await act(async () => {
      container.querySelector("button").click();
    });
    expect(screen.getByText("Boom")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });
});
