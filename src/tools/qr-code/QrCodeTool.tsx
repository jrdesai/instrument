import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { callTool } from "../../bridge";
import { PillButton, ToolbarFooter } from "../../components/tool";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { QrCodeInput } from "../../bindings/QrCodeInput";
import type { QrCodeOutput } from "../../bindings/QrCodeOutput";
import type { QrEcLevel } from "../../bindings/QrEcLevel";

const TOOL_ID = "qr-code";
const RUST_COMMAND = "tool_qr_generate";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;
const DEFAULT_EC_LEVEL: QrEcLevel = "medium";
const DEFAULT_MODULE_SIZE = 10;

function QrCodeTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [text, setText] = useState("");
  const [ecLevel, setEcLevel] = useState<QrEcLevel>(DEFAULT_EC_LEVEL);
  const [moduleSize, setModuleSize] = useState(DEFAULT_MODULE_SIZE);
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [margin, setMargin] = useState(4);
  const [output, setOutput] = useState<QrCodeOutput | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);
  useRestoreStringDraft(TOOL_ID, setText);

  const run = useCallback(
    async (
      currentText: string,
      currentEcLevel: QrEcLevel,
      currentModuleSize: number,
      currentFgColor: string,
      currentBgColor: string,
      currentMargin: number
    ) => {
      if (!currentText.trim()) {
        setOutput(null);
        return;
      }
      const payload: QrCodeInput = {
        text: currentText,
        ecLevel: currentEcLevel,
        moduleSize: currentModuleSize,
        fgColor: currentFgColor,
        bgColor: currentBgColor,
        margin: currentMargin,
      };
      const result = (await callTool(RUST_COMMAND, payload, {
        skipHistory: true,
      })) as QrCodeOutput;
      setOutput(result);
      if (!result.error) {
        if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
        historyDebounceRef.current = setTimeout(() => {
          addHistoryEntry(TOOL_ID, {
            input: payload,
            output: result,
            timestamp: Date.now(),
          });
          historyDebounceRef.current = null;
        }, HISTORY_DEBOUNCE_MS);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      run(text, ecLevel, moduleSize, fgColor, bgColor, margin);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, ecLevel, moduleSize, fgColor, bgColor, margin, run]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleClear = useCallback(() => {
    setText("");
    setEcLevel(DEFAULT_EC_LEVEL);
    setModuleSize(DEFAULT_MODULE_SIZE);
    setFgColor("#000000");
    setBgColor("#ffffff");
    setMargin(4);
    setDraft("");
    setOutput(null);
  }, [setDraft]);

  const downloadHref = useMemo(() => {
    if (!output?.svg) return "";
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(output.svg)}`;
  }, [output?.svg]);

  const charCount = text.length;
  const hasOutput = !!output?.svg && !output?.error;
  const downloadPng = useCallback(async () => {
    if (!output?.svg) return;

    const svgBlob = new Blob([output.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const scale = 4;
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }

      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "qrcode.png";
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, "image/png");
    };

    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, [output?.svg]);

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      {/* Split panel */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left — input + options */}
        <div className="flex w-80 shrink-0 flex-col border-r border-border-light dark:border-border-dark">
          {/* Input header */}
          <div className="flex shrink-0 min-h-[41px] items-center justify-between border-b border-border-light px-4 py-2 dark:border-border-dark">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Input
            </span>
            {charCount > 0 && (
              <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                {charCount} chars
              </span>
            )}
          </div>

          {/* Textarea */}
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setDraft(e.target.value);
            }}
            placeholder="Enter text or URL..."
            className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none dark:text-slate-300"
          />

          {/* Options */}
          <div className="shrink-0 border-t border-border-light px-4 py-3 dark:border-border-dark">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Error Correction
            </p>
            <div className="mb-3 flex gap-1.5">
              {(
                [
                  ["low", "Low"],
                  ["medium", "Medium"],
                  ["quartile", "High"],
                  ["high", "Max"],
                ] as Array<[QrEcLevel, string]>
              ).map(([value, label]) => (
                <PillButton key={value} active={ecLevel === value} onClick={() => setEcLevel(value)}>
                  {label}
                </PillButton>
              ))}
            </div>

            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Size
            </p>
            <div className="flex gap-1.5">
              <PillButton active={moduleSize === 6} onClick={() => setModuleSize(6)}>S</PillButton>
              <PillButton active={moduleSize === 10} onClick={() => setModuleSize(10)}>M</PillButton>
              <PillButton active={moduleSize === 16} onClick={() => setModuleSize(16)}>L</PillButton>
            </div>

            <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Colors
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="h-6 w-6 cursor-pointer rounded border border-border-light bg-transparent dark:border-border-dark"
                  title="Foreground color"
                />
                FG
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-6 w-6 cursor-pointer rounded border border-border-light bg-transparent dark:border-border-dark"
                  title="Background color"
                />
                BG
              </label>
              <button
                type="button"
                onClick={() => {
                  setFgColor("#000000");
                  setBgColor("#ffffff");
                }}
                className="text-[10px] text-slate-500 hover:text-slate-300"
                title="Reset to default colors"
              >
                Reset
              </button>
            </div>

            <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Margin
            </p>
            <div className="flex gap-1.5">
              {([0, 2, 4] as const).map((m) => (
                <PillButton key={m} active={margin === m} onClick={() => setMargin(m)}>
                  {m === 0 ? "None" : m === 2 ? "Small" : "Normal"}
                </PillButton>
              ))}
            </div>
          </div>
        </div>

        {/* Right — QR output */}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center p-8">
          {!text.trim() && (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-700">
                qr_code
              </span>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Enter text on the left to generate a QR code
              </p>
            </div>
          )}

          {output?.error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {output.error}
            </div>
          )}

          {hasOutput && (
            <div className="flex flex-col items-center gap-4">
              {/* QR code card */}
              <div
                className="rounded-xl bg-white p-5 shadow-md"
                dangerouslySetInnerHTML={{ __html: output.svg }}
              />

              {/* Metadata */}
              <div className="flex items-center gap-3 font-mono text-xs text-slate-400 dark:text-slate-500">
                <span>v{output.qrVersion}</span>
                <span>·</span>
                <span>{output.size} × {output.size} modules</span>
                <span>·</span>
                <span>{charCount} {charCount === 1 ? "char" : "chars"}</span>
                <span>·</span>
                <span className="capitalize">{ecLevel} EC</span>
              </div>
              {output.inputBytes > 0 && output.maxBytes > 0 && (() => {
                const pct = output.inputBytes / output.maxBytes;
                if (pct >= 1) {
                  return (
                    <div className="text-xs text-red-400">
                      Payload too large ({output.inputBytes} / {output.maxBytes} bytes max for this EC level)
                    </div>
                  );
                }
                if (pct >= 0.8) {
                  return (
                    <div className="text-xs text-amber-400">
                      Payload is {Math.round(pct * 100)}% of capacity - consider lower EC level for more data
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      </div>

      <ToolbarFooter
        groups={[
          {
            end: true,
            children: (
              <>
                <a
                  href={downloadHref || undefined}
                  download="qrcode.svg"
                  className={`rounded-lg border border-border-light bg-panel-light px-3 py-1.5 text-xs dark:border-border-dark dark:bg-panel-dark ${
                    downloadHref
                      ? "text-slate-600 hover:text-primary dark:text-slate-300"
                      : "pointer-events-none text-slate-500 opacity-50"
                  }`}
                >
                  Download SVG
                </a>
                <button
                  type="button"
                  onClick={downloadPng}
                  disabled={!hasOutput}
                  className={`rounded-lg border border-border-light bg-panel-light px-3 py-1.5 text-xs dark:border-border-dark dark:bg-panel-dark ${
                    hasOutput
                      ? "text-slate-600 hover:text-primary dark:text-slate-300"
                      : "pointer-events-none text-slate-500 opacity-50"
                  }`}
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg border border-border-light bg-panel-light px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

export default QrCodeTool;
