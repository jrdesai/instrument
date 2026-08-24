import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StatusBar } from "./StatusBar";
import { useLastRunStore } from "../../store/lastRun";

afterEach(() => {
  cleanup();
  useLastRunStore.setState({ toolId: null, durationMs: null });
});

describe("StatusBar", () => {
  it("does not show timing on non-tool routes even if lastRun exists", () => {
    useLastRunStore.setState({ toolId: "json-formatter", durationMs: 12.3 });
    render(
      <MemoryRouter initialEntries={["/chains"]}>
        <StatusBar />
      </MemoryRouter>
    );
    expect(screen.queryByText(/ms/)).toBeNull();
    expect(screen.getByText("All processing on-device")).toBeTruthy();
  });

  it("shows timing when current route matches the last run tool", () => {
    useLastRunStore.setState({ toolId: "json-formatter", durationMs: 15.4 });
    render(
      <MemoryRouter initialEntries={["/tools/json-formatter"]}>
        <StatusBar />
      </MemoryRouter>
    );
    expect(screen.getByText(/15.4 ms/)).toBeTruthy();
  });

  it("does not show timing when current tool route differs from last run tool", () => {
    useLastRunStore.setState({ toolId: "base64", durationMs: 5.2 });
    render(
      <MemoryRouter initialEntries={["/tools/json-formatter"]}>
        <StatusBar />
      </MemoryRouter>
    );
    expect(screen.queryByText(/ms/)).toBeNull();
  });
});
