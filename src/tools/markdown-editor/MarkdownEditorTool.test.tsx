import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import MarkdownEditorTool from "./MarkdownEditorTool";

describe("MarkdownEditorTool", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("sanitizes XSS payloads from rendered Markdown preview", async () => {
    const { container } = render(<MarkdownEditorTool />);
    const textarea = container.querySelector("textarea");
    expect(textarea).not.toBeNull();

    fireEvent.change(textarea!, {
      target: {
        value:
          '# Safe Heading\n\n<script>window.__xss = true;</script>\n<img src="x" onerror="window.__xss = true" />\n\n[click](javascript:alert(1))',
      },
    });

    await waitFor(() => {
      const preview = container.querySelector(".markdown-editor-preview");
      expect(preview?.innerHTML).toContain("Safe Heading");
    });

    const preview = container.querySelector(".markdown-editor-preview")!;
    expect(preview.querySelector("script")).toBeNull();
    expect(preview.innerHTML).not.toContain("onerror");
    const link = preview.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBeNull();
  });

  it("highlights fenced code blocks with Prism", async () => {
    const { container } = render(<MarkdownEditorTool />);
    const textarea = container.querySelector("textarea");
    expect(textarea).not.toBeNull();

    fireEvent.change(textarea!, {
      target: {
        value: '```json\n{"hello": 123}\n```',
      },
    });

    await waitFor(() => {
      const code = container.querySelector(
        ".markdown-editor-preview code.language-json"
      );
      expect(code).not.toBeNull();
      expect(code?.querySelector(".token")).not.toBeNull();
    });
  });
});
