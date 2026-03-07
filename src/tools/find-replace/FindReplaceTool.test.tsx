import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FindReplaceTool from "./FindReplaceTool";

const DEBOUNCE_MS = 150;
const CALL_TOOL_DELAY_MS = 20;

const mockCallTool = vi.fn();
const mockAddHistoryEntry = vi.fn();

vi.mock("../../bridge/index.ts", () => ({
  callTool: (toolId: string, input: unknown) => mockCallTool(toolId, input),
}));

vi.mock("../../store/index.ts", () => ({
  useHistoryStore: (selector: (s: { addHistoryEntry: () => void }) => unknown) =>
    selector({ addHistoryEntry: mockAddHistoryEntry }),
}));

const waitForProcess = () =>
  new Promise<void>((resolve) =>
    setTimeout(resolve, DEBOUNCE_MS + CALL_TOOL_DELAY_MS + 10)
  );

/** In-mock find/replace: build match ranges (char offsets) and result. */
function doFindReplace(
  text: string,
  find: string,
  replace: string,
  caseSensitive: boolean,
  _wholeWord: boolean,
  regexMode: boolean,
  replaceAll: boolean
): {
  result: string;
  matchCount: number;
  replacedCount: number;
  matchRanges: number[][];
  error?: string;
} {
  if (find === "") {
    return {
      result: text,
      matchCount: 0,
      replacedCount: 0,
      matchRanges: [],
    };
  }

  let regex: RegExp;
  if (regexMode) {
    try {
      regex = new RegExp(find, caseSensitive ? "g" : "gi");
    } catch {
      return {
        result: text,
        matchCount: 0,
        replacedCount: 0,
        matchRanges: [],
        error: "Invalid regex",
      };
    }
  } else {
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = escaped;
    regex = new RegExp(pattern, caseSensitive ? "g" : "gi");
  }

  const matchRanges: number[][] = [];
  const globalFlags = regex.flags.includes("g") ? regex.flags : regex.flags + "g";
  const globalRegex = new RegExp(regex.source, globalFlags);
  let m: RegExpExecArray | null;
  while ((m = globalRegex.exec(text)) !== null) {
    matchRanges.push([m.index, m.index + m[0].length]);
  }
  const matchCount = matchRanges.length;

  const replaceRegex = new RegExp(regex.source, globalFlags);
  const oneMatchFlags = regex.flags.replace("g", "");
  const result = replaceAll
    ? text.replace(replaceRegex, replace)
    : text.replace(new RegExp(regex.source, oneMatchFlags || undefined), replace);

  const replacedCount = replaceAll ? matchCount : Math.min(1, matchCount);

  return {
    result,
    matchCount,
    replacedCount,
    matchRanges,
  };
}

describe("FindReplaceTool", () => {
  beforeEach(() => {
    mockCallTool.mockImplementation(
      (
        _toolId: string,
        input: {
          text: string;
          find: string;
          replace: string;
          caseSensitive: boolean;
          wholeWord: boolean;
          regexMode: boolean;
          replaceAll: boolean;
        }
      ) => {
        const out = doFindReplace(
          input.text,
          input.find,
          input.replace,
          input.caseSensitive,
          input.wholeWord,
          input.regexMode,
          input.replaceAll
        );
        return new Promise<typeof out>((resolve) => {
          setTimeout(() => resolve(out), CALL_TOOL_DELAY_MS);
        });
      }
    );
    mockAddHistoryEntry.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders without crashing — inputs, footer controls, empty output state", () => {
    render(<FindReplaceTool />);
    expect(screen.getByRole("textbox", { name: /text to search in/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^find$/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /replace with/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /case sensitive/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /whole word/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /regex mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /replace all/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/find replace output/i)).toHaveTextContent(
      "Output will appear here"
    );
  });

  it("basic find and replace — output shows replaced text and replaced count", async () => {
    const user = userEvent.setup();
    render(<FindReplaceTool />);
    const textarea = screen.getByRole("textbox", { name: /text to search in/i });
    const findInput = screen.getByRole("textbox", { name: /^find$/i });
    const replaceInput = screen.getByRole("textbox", { name: /replace with/i });

    await user.type(textarea, "the cat sat on the mat");
    await user.type(findInput, "cat");
    await user.type(replaceInput, "dog");
    await waitForProcess();

    await waitFor(() => {
      expect(mockCallTool).toHaveBeenCalledWith(
        "find_replace_process",
        expect.objectContaining({
          text: "the cat sat on the mat",
          find: "cat",
          replace: "dog",
        })
      );
    });
    const output = screen.getByLabelText(/find replace output/i);
    await waitFor(() => expect(output).toHaveTextContent("the dog sat on the mat"), {
      timeout: 2000,
    });
    expect(screen.getByText(/1 replacement made/)).toBeInTheDocument();
  });

  it("match count badge shows number of matches", async () => {
    const user = userEvent.setup();
    render(<FindReplaceTool />);
    const textarea = screen.getByRole("textbox", { name: /text to search in/i });
    const findInput = screen.getByRole("textbox", { name: /^find$/i });

    await user.type(textarea, "cat and cat and cat");
    await user.type(findInput, "cat");
    await waitForProcess();

    await waitFor(() => {
      expect(screen.getByText("3 matches")).toBeInTheDocument();
    });
  });

  it("no matches — badge shows No matches, output shows original or no replacements", async () => {
    const user = userEvent.setup();
    render(<FindReplaceTool />);
    const textarea = screen.getByRole("textbox", { name: /text to search in/i });
    const findInput = screen.getByRole("textbox", { name: /^find$/i });

    await user.type(textarea, "hello world");
    await user.type(findInput, "xyz");
    await waitForProcess();

    await waitFor(() => {
      expect(screen.getByText("No matches")).toBeInTheDocument();
    });
    const output = screen.getByLabelText(/find replace output/i);
    await waitFor(() => {
      expect(output).toHaveTextContent(/hello world|No replacements|Output will appear/);
    });
  });

  it("replace all vs replace first — toggle Replace all off shows only first replaced", async () => {
    const user = userEvent.setup();
    render(<FindReplaceTool />);
    const textarea = screen.getByRole("textbox", { name: /text to search in/i });
    const findInput = screen.getByRole("textbox", { name: /^find$/i });
    const replaceInput = screen.getByRole("textbox", { name: /replace with/i });

    await user.type(textarea, "cat and cat");
    await user.type(findInput, "cat");
    await user.type(replaceInput, "dog");
    await waitForProcess();

    await waitFor(() => {
      expect(screen.getByLabelText(/find replace output/i)).toHaveTextContent("dog and dog");
    });

    await user.click(screen.getByRole("button", { name: /replace all/i }));
    await waitForProcess();

    await waitFor(() => {
      expect(screen.getByLabelText(/find replace output/i)).toHaveTextContent("dog and cat");
    });
  });

  it("case sensitive toggle — off matches both, on matches only lowercase", async () => {
    const user = userEvent.setup();
    render(<FindReplaceTool />);
    const textarea = screen.getByRole("textbox", { name: /text to search in/i });
    const findInput = screen.getByRole("textbox", { name: /^find$/i });

    await user.type(textarea, "Cat and cat");
    await user.type(findInput, "cat");
    await waitForProcess();

    await waitFor(() => {
      expect(screen.getByText("2 matches")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /case sensitive/i }));
    await waitForProcess();

    await waitFor(() => {
      expect(screen.getByText("1 match")).toBeInTheDocument();
    });
  });

  it("regex mode — digits replaced with NUM", async () => {
    const user = userEvent.setup();
    render(<FindReplaceTool />);
    const textarea = screen.getByRole("textbox", { name: /text to search in/i });
    const findInput = screen.getByRole("textbox", { name: /^find$/i });
    const replaceInput = screen.getByRole("textbox", { name: /replace with/i });

    await user.type(textarea, "price 100 qty 50");
    await user.click(screen.getByRole("button", { name: /regex mode/i }));
    await user.type(findInput, "\\d+");
    await user.type(replaceInput, "NUM");
    await waitForProcess();

    await waitFor(() => {
      expect(screen.getByLabelText(/find replace output/i)).toHaveTextContent(
        "price NUM qty NUM"
      );
    });
  });

  it("invalid regex shows error in output panel and no crash", async () => {
    const user = userEvent.setup();
    render(<FindReplaceTool />);
    await user.click(screen.getByRole("button", { name: /regex mode/i }));
    const findInput = screen.getByRole("textbox", { name: /^find$/i });
    fireEvent.change(findInput, { target: { value: "[invalid" } });
    await waitForProcess();

    const output = screen.getByLabelText(/find replace output/i);
    await waitFor(() => {
      expect(output).toHaveTextContent(/Invalid regex|error/i);
    });
    expect(output).toHaveClass("text-red-400");
  });

  it("whole word toggle disabled when regex is on", async () => {
    const user = userEvent.setup();
    render(<FindReplaceTool />);
    const wholeWordBtn = screen.getByRole("button", { name: /whole word/i });
    expect(wholeWordBtn).not.toBeDisabled();

    await user.click(screen.getByRole("button", { name: /regex mode/i }));

    expect(wholeWordBtn).toBeDisabled();
    await user.click(wholeWordBtn);
    expect(wholeWordBtn).not.toHaveClass(/bg-primary/);
  });

  it("clear button empties all inputs and output", async () => {
    const user = userEvent.setup();
    render(<FindReplaceTool />);
    const textarea = screen.getByRole("textbox", { name: /text to search in/i });
    const findInput = screen.getByRole("textbox", { name: /^find$/i });
    const replaceInput = screen.getByRole("textbox", { name: /replace with/i });

    await user.type(textarea, "hello");
    await user.type(findInput, "x");
    await user.type(replaceInput, "y");
    await waitForProcess();

    await waitFor(() => {
      expect(screen.getByLabelText(/find replace output/i)).not.toHaveTextContent(
        "Output will appear here"
      );
    });
    await user.click(screen.getByRole("button", { name: /clear all/i }));

    expect(textarea).toHaveValue("");
    expect(findInput).toHaveValue("");
    expect(replaceInput).toHaveValue("");
    expect(screen.getByLabelText(/find replace output/i)).toHaveTextContent(
      "Output will appear here"
    );
    expect(screen.queryByText(/\d+ match/)).not.toBeInTheDocument();
  });

  it("highlights appear for matches — highlight layer contains span with match", async () => {
    const user = userEvent.setup();
    render(<FindReplaceTool />);
    const textarea = screen.getByRole("textbox", { name: /text to search in/i });
    const findInput = screen.getByRole("textbox", { name: /^find$/i });

    await user.type(textarea, "the cat sat");
    await user.type(findInput, "cat");
    await waitForProcess();

    await waitFor(() => {
      const highlightLayer = document.querySelector('[aria-hidden="true"]');
      expect(highlightLayer).toBeInTheDocument();
      const highlightSpan = highlightLayer?.querySelector('span[class*="bg-yellow-400"]');
      expect(highlightSpan).toBeInTheDocument();
      expect(highlightSpan).toHaveTextContent("cat");
    });
  });

  it("highlights cleared when find is empty", async () => {
    const user = userEvent.setup();
    render(<FindReplaceTool />);
    const textarea = screen.getByRole("textbox", { name: /text to search in/i });
    const findInput = screen.getByRole("textbox", { name: /^find$/i });

    await user.type(textarea, "the cat sat");
    await user.type(findInput, "cat");
    await waitForProcess();
    await waitFor(() => {
      const layer = document.querySelector('[aria-hidden="true"]');
      expect(layer?.querySelectorAll('span[class*="bg-yellow-400"]').length).toBeGreaterThan(0);
    });

    await user.clear(findInput);
    await waitForProcess();

    await waitFor(() => {
      const highlightLayer = document.querySelector('[aria-hidden="true"]');
      const spans = highlightLayer?.querySelectorAll('span[class*="bg-yellow-400"]');
      expect(spans?.length ?? 0).toBe(0);
    });
  });

  it("highlights cleared on regex error — no highlight spans, error shown", async () => {
    const user = userEvent.setup();
    render(<FindReplaceTool />);
    const textarea = screen.getByRole("textbox", { name: /text to search in/i });
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /regex mode/i }));
    const findInput = screen.getByRole("textbox", { name: /^find$/i });
    fireEvent.change(findInput, { target: { value: "[invalid" } });
    await waitForProcess();

    await waitFor(() => {
      expect(screen.getByLabelText(/find replace output/i)).toHaveClass("text-red-400");
    });
    const highlightLayer = document.querySelector('[aria-hidden="true"]');
    const spans = highlightLayer?.querySelectorAll('span[class*="bg-yellow-400"]');
    expect(spans?.length ?? 0).toBe(0);
  });
});
