import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotFoundPage } from "./NotFoundPage";

afterEach(cleanup);

describe("NotFoundPage", () => {
  it("renders default 404 text and link to home", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
    expect(screen.getByText("Page not found")).toBeTruthy();
    expect(screen.getByText("This page doesn't exist — it may have moved.")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Back to home" });
    expect(link.getAttribute("href")).toBe("/");
  });

  it("renders custom title, message, and link", () => {
    render(
      <MemoryRouter>
        <NotFoundPage
          title="Tool not found"
          message="Custom message"
          linkText="Browse all tools"
          linkTo="/"
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Tool not found")).toBeTruthy();
    expect(screen.getByText("Custom message")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Browse all tools" });
    expect(link.getAttribute("href")).toBe("/");
  });
});
