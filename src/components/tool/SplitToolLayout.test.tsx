import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SplitToolLayout } from "./SplitToolLayout";

afterEach(cleanup);

describe("SplitToolLayout", () => {
  it("renders left and right panes with an accessible separator", () => {
    render(
      <SplitToolLayout
        left={<div>Left pane</div>}
        right={<div>Right pane</div>}
      />
    );

    expect(screen.getByText("Left pane")).toBeTruthy();
    expect(screen.getByText("Right pane")).toBeTruthy();

    const separator = screen.getByRole("separator", { name: "Resize panels" });
    expect(separator.getAttribute("aria-valuenow")).toBe("50");
    expect(separator.getAttribute("aria-valuemin")).toBe("20");
    expect(separator.getAttribute("aria-valuemax")).toBe("80");
  });

  it("supports keyboard resizing and reset via double-click or Enter", () => {
    render(
      <SplitToolLayout
        left={<div>Left</div>}
        right={<div>Right</div>}
        defaultLeftPercent={50}
        minPercent={20}
        maxPercent={80}
      />
    );

    const separator = screen.getByRole("separator", { name: "Resize panels" });

    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(separator.getAttribute("aria-valuenow")).toBe("52");

    fireEvent.keyDown(separator, { key: "ArrowLeft", shiftKey: true });
    expect(separator.getAttribute("aria-valuenow")).toBe("42");

    fireEvent.keyDown(separator, { key: "Home" });
    expect(separator.getAttribute("aria-valuenow")).toBe("20");

    fireEvent.keyDown(separator, { key: "End" });
    expect(separator.getAttribute("aria-valuenow")).toBe("80");

    fireEvent.doubleClick(separator);
    expect(separator.getAttribute("aria-valuenow")).toBe("50");
  });
});
