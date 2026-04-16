import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/react";
import Base64Tool from "./Base64Tool";

const DEBOUNCE_MS = 150;
const COPIED_DURATION_MS = 1500;

// callTool must resolve after a delay (never synchronously) so we can test isLoading states
const CALL_TOOL_DELAY_MS = 20;

const mockCallTool = vi.fn();
const mockAddHistoryEntry = vi.fn();

vi.mock("../../bridge/index.ts", () => ({
  callTool: (toolId: string, input: unknown) => mockCallTool(toolId, input),
}));

vi.mock("../../store/index.ts", () => ({
  useHistoryStore: (selector: (s: { addHistoryEntry: () => void }) => unknown) =>
    selector({ addHistoryEntry: mockAddHistoryEntry }),
  useToolStore: Object.assign(
    (selector: (s: { setDraftInput: () => void; draftInputs: Record<string, unknown> }) => unknown) =>
      selector({ setDraftInput: () => {}, draftInputs: {} }),
    {
      getState: () => ({ draftInputs: {} }),
      persist: { hasHydrated: () => true, onFinishHydration: () => () => {} },
    }
  ),
}));

// Helper: wait for debounce + async callTool to complete (callTool resolves after delay)
const waitForProcess = () =>
  new Promise<void>((resolve) =>
    setTimeout(resolve, DEBOUNCE_MS + CALL_TOOL_DELAY_MS + 10)
  );

describe("Base64Tool", () => {
  beforeEach(() => {
    mockCallTool.mockImplementation(
      (_toolId: string, input: { text: string; mode: string; urlSafe?: boolean }) =>
        new Promise((resolve) => {
          setTimeout(() => {
            const text = (input as { text: string }).text;
            const mode = (input as { mode: string }).mode;
            if (mode === "encode") {
              resolve({
                result: btoa(text),
                byteCount: new TextEncoder().encode(text).length,
                charCount: text.length,
              });
            } else {
              try {
                const decoded = atob(text.replace(/\s/g, ""));
                resolve({
                  result: decoded,
                  byteCount: new TextEncoder().encode(decoded).length,
                  charCount: decoded.length,
                });
              } catch {
                resolve({
                  result: "",
                  byteCount: 0,
                  charCount: 0,
                  error: "Invalid base64",
                });
              }
            }
          }, CALL_TOOL_DELAY_MS);
        })
    );
    mockAddHistoryEntry.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders without crashing with default props", () => {
    render(<Base64Tool />);
    expect(screen.getByRole("textbox", { name: /base64 input text/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/base64 output/i)).toHaveTextContent("Output will appear here");
    expect(screen.getByRole("button", { name: /encode mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decode mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /swap input and output/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear input and output/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy output to clipboard/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Use URL-safe Base64 alphabet" })).toBeInTheDocument();
  });

  it("user types in the input textarea — output updates correctly after debounce", async () => {
    const user = userEvent.setup();
    render(<Base64Tool />);
    const textarea = screen.getByRole("textbox", { name: /base64 input text/i });
    await user.type(textarea, "Hello");
    expect(screen.getByLabelText(/base64 output/i)).toHaveTextContent("Output will appear here");
    await waitForProcess();
    expect(screen.getByLabelText(/base64 output/i)).toHaveTextContent(btoa("Hello"));
  });

  it("copy button shows Copied! then reverts after 1.5s", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<Base64Tool />);
    const textarea = screen.getByRole("textbox", { name: /base64 input text/i });
    await user.type(textarea, "Hi");
    await waitForProcess();
    const copyBtn = screen.getByRole("button", { name: /copy output to clipboard/i });
    await user.click(copyBtn);
    expect(copyBtn).toHaveTextContent("Copied!");
    expect(writeText).toHaveBeenCalledWith(btoa("Hi"));
    await new Promise((r) => setTimeout(r, COPIED_DURATION_MS + 50));
    expect(copyBtn).toHaveTextContent("Copy");
  });

  it("swap button swaps input and output AND flips the mode — output is decoded not re-encoded", async () => {
    const user = userEvent.setup();
    render(<Base64Tool />);
    const textarea = screen.getByRole("textbox", { name: /base64 input text/i });
    await user.type(textarea, "Hello");
    await waitForProcess();
    const encoded = btoa("Hello");
    expect(screen.getByLabelText(/base64 output/i)).toHaveTextContent(encoded);
    const swapBtn = screen.getByRole("button", { name: /swap input and output/i });
    await user.click(swapBtn);
    expect(screen.getByRole("textbox", { name: /base64 input text/i })).toHaveValue(encoded);
    expect(screen.getByRole("button", { name: /decode mode/i })).toHaveClass("bg-primary");
    await waitForProcess();
    expect(screen.getByLabelText(/base64 output/i)).toHaveTextContent("Hello");
  });

  it("clear button empties both panels", async () => {
    const user = userEvent.setup();
    render(<Base64Tool />);
    const textarea = screen.getByRole("textbox", { name: /base64 input text/i });
    await user.type(textarea, "foo");
    await waitForProcess();
    expect(screen.getByLabelText(/base64 output/i)).toHaveTextContent(btoa("foo"));
    await user.click(screen.getByRole("button", { name: /clear input and output/i }));
    expect(textarea).toHaveValue("");
    expect(screen.getByLabelText(/base64 output/i)).toHaveTextContent("Output will appear here");
  });

  it("mode switcher (Encode/Decode buttons) changes processing mode", async () => {
    const user = userEvent.setup();
    render(<Base64Tool />);
    await user.click(screen.getByRole("button", { name: /decode mode/i }));
    expect(screen.getByRole("button", { name: /decode mode/i })).toHaveClass("bg-primary");
    const textarea = screen.getByRole("textbox", { name: /base64 input text/i });
    await user.type(textarea, btoa("x"));
    await waitForProcess();
    expect(screen.getByLabelText(/base64 output/i)).toHaveTextContent("x");
  });

  it("URL Safe toggle changes the encoding output", async () => {
    const user = userEvent.setup();
    mockCallTool.mockImplementation(
      (_toolId: string, input: { text: string; mode: string; urlSafe?: boolean }) =>
        new Promise((resolve) => {
          setTimeout(() => {
            const text = (input as { text: string }).text;
            const urlSafe = (input as { urlSafe?: boolean }).urlSafe;
            resolve({
              result: urlSafe ? btoa(text).replace(/\+/g, "-").replace(/\//g, "_") : btoa(text),
              byteCount: text.length,
              charCount: text.length,
            });
          }, CALL_TOOL_DELAY_MS);
        })
    );
    render(<Base64Tool />);
    const textarea = screen.getByRole("textbox", { name: /base64 input text/i });
    await user.type(textarea, "a");
    await waitForProcess();
    expect(mockCallTool).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ urlSafe: false })
    );
    await user.click(screen.getByRole("checkbox", { name: "Use URL-safe Base64 alphabet" }));
    await waitForProcess();
    expect(mockCallTool).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ urlSafe: true })
    );
  });

  it("error state — invalid base64 in Decode mode shows error in red", async () => {
    const user = userEvent.setup();
    render(<Base64Tool />);
    await user.click(screen.getByRole("button", { name: /decode mode/i }));
    const textarea = screen.getByRole("textbox", { name: /base64 input text/i });
    await user.type(textarea, "not-valid-base64!!!");
    await waitForProcess();
    const outputPanel = screen.getByLabelText(/base64 output/i);
    expect(outputPanel).toHaveTextContent("Invalid base64");
    expect(outputPanel).toHaveClass("text-red-400");
  });
});
