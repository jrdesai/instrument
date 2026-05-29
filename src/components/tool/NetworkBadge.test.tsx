import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Tool } from "../../registry";
import { NetworkBadge } from "./NetworkBadge";

// NetworkBadge only reads `tool.network`; a partial fixture is sufficient.
const toolWith = (network?: boolean) => ({ id: "x", network } as unknown as Tool);

afterEach(cleanup);

describe("NetworkBadge", () => {
  it("renders the badge for tools that use the network", () => {
    render(<NetworkBadge tool={toolWith(true)} />);
    expect(screen.getByText("Uses network")).toBeTruthy();
  });

  it("renders nothing for fully-local tools", () => {
    const { container } = render(<NetworkBadge tool={toolWith(false)} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the network flag is absent", () => {
    const { container } = render(<NetworkBadge tool={toolWith(undefined)} />);
    expect(container.firstChild).toBeNull();
  });
});
