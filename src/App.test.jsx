import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App.jsx";

// Render and let the saved-sounds lookup settle.
async function renderApp() {
  render(<App />);
  await act(async () => {});
}

describe("App", () => {
  beforeEach(() => localStorage.clear());

  it("shows the bell and the default sound", async () => {
    await renderApp();
    expect(screen.getByRole("button", { name: "Ring the bell" })).toBeInTheDocument();
    expect(screen.getByText("Old phone")).toBeInTheDocument();
  });

  it("opens and closes settings", async () => {
    await renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Record with microphone")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("switches appearance", async () => {
    await renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("explains when the browser can't record", async () => {
    await renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByText("Record with microphone"));
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(/can't record audio/);
  });
});
