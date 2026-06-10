import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/react";
import { CodeInput } from "./CodeInput";

afterEach(cleanup);

describe("CodeInput", () => {
  it('renders "1" for empty value', () => {
    render(<CodeInput value="" onChange={() => {}} ariaLabel="Test input" />);
    const gutter = document.querySelector("[aria-hidden]");
    expect(gutter?.textContent).toBe("1");
  });

  it("renders line numbers for a multiline value", () => {
    render(<CodeInput value={"a\nb\nc"} onChange={() => {}} ariaLabel="Test input" />);
    const gutter = document.querySelector("[aria-hidden]");
    expect(gutter?.textContent).toBe("1\n2\n3");
  });

  it("typing fires onChange with the new value", async () => {
    let latest = "";
    function Harness() {
      const [value, setValue] = useState("");
      return (
        <CodeInput
          value={value}
          onChange={(e) => {
            latest = e.target.value;
            setValue(e.target.value);
          }}
          ariaLabel="Test input"
        />
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Test input"), "hello");
    expect(latest).toBe("hello");
    expect(screen.getByLabelText("Test input")).toHaveValue("hello");
  });

  it("gutter has aria-hidden and textarea has the given aria-label", () => {
    render(<CodeInput value="" onChange={() => {}} ariaLabel="JSON input" />);
    expect(document.querySelector("[aria-hidden]")).toBeTruthy();
    expect(screen.getByLabelText("JSON input")).toBeTruthy();
  });
});
