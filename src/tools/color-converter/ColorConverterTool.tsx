import { useCallback, useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { ColorInput } from "../../bindings/ColorInput";
import type { ColorOutput } from "../../bindings/ColorOutput";

const RUST_COMMAND = "color_convert";
const TOOL_ID = "color-converter";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;
const COPIED_DURATION_MS = 1500;

const FORMATS: { id: keyof Omit<ColorOutput, "name" | "error">; label: string }[] = [
  { id: "hex", label: "HEX" },
  { id: "rgb", label: "RGB" },
  { id: "hsl", label: "HSL" },
  { id: "hsb", label: "HSB" },
];

function ColorConverterTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const [output, setOutput] = useState<ColorOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Tracks the picker's live colour immediately — separate from the debounced output
  const [pickerColor, setPickerColor] = useState("#000000");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        setOutput(null);
        setError(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const payload: ColorInput = { value };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as ColorOutput;

        if (result.error) {
          setError(result.error);
          setOutput(null);
        } else {
          setOutput(result);
          setError(null);
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
      } catch (e) {
        const message =
          e instanceof Error ? e.message : typeof e === "string" ? e : "Failed to run tool";
        setError(message);
        setOutput(null);
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(input);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      setDraft(value);
    },
    [setDraft]
  );

  // react-colorful fires with #rrggbb — update swatch immediately, text input debounces to Rust
  const handlePickerChange = useCallback(
    (hex: string) => {
      setPickerColor(hex);
      handleInputChange(hex);
    },
    [handleInputChange]
  );

  const handleClear = useCallback(() => {
    setInput("");
    setDraft("");
    setOutput(null);
    setError(null);
    setPickerOpen(false);
  }, [setDraft]);

  const handleCopy = useCallback(async (value: string, id: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), COPIED_DURATION_MS);
    } catch {
      // ignore
    }
  }, []);

  const pickerHex = output?.hex ?? pickerColor;
  // Swatch reflects picker live colour when open; output hex when closed; null = show hue strip
  const swatchColor = pickerOpen ? pickerColor : (output?.hex ?? null);

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Input row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark">

        {/* Swatch toggle button */}
        <button
          type="button"
          aria-label="Toggle colour picker"
          onClick={() => {
            if (!pickerOpen && output?.hex) setPickerColor(output.hex);
            setPickerOpen((o) => !o);
          }}
          className="shrink-0 w-12 h-10 rounded-lg border-2 border-border-light dark:border-border-dark hover:border-primary/60 transition-colors overflow-hidden"
          style={swatchColor ? { backgroundColor: swatchColor } : undefined}
        >
          {!swatchColor && (
            <div
              className="w-full h-full"
              style={{
                background:
                  "linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))",
              }}
            />
          )}
        </button>

        {/* Text input */}
        <input
          type="text"
          aria-label="Colour value input"
          placeholder="#1a2b3c  ·  rgb(26, 43, 60)  ·  hsl(…)  ·  cornflowerblue"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          className="flex-1 h-10 px-3 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm outline-none focus:ring-1 focus:ring-primary border border-border-light dark:border-border-dark rounded-lg placeholder:text-slate-400 dark:placeholder:text-slate-600"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />

        <button
          type="button"
          onClick={handleClear}
          disabled={!input}
          className="shrink-0 px-3 h-10 text-sm text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Inline colour picker — shown below the input bar, above the output rows */}
      {pickerOpen && (
        <div className="flex justify-start px-4 pt-4 pb-2 border-b border-border-light dark:border-border-dark">
          <HexColorPicker color={pickerHex} onChange={handlePickerChange} />
        </div>
      )}

      {/* Output */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
        {error ? (
          <p className="text-red-600 dark:text-red-400 text-sm font-mono">{error}</p>
        ) : output ? (
          <div className="flex flex-col gap-2">
            {FORMATS.map(({ id, label }) => {
              const value = output[id];
              const isCopied = copiedId === id;
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 px-4 py-3 border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark rounded-lg"
                >
                  <span className="w-10 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {label}
                  </span>
                  <span className="flex-1 font-mono text-sm text-slate-800 dark:text-slate-200 select-all">
                    {value}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(value, id)}
                    className="shrink-0 px-2 py-0.5 text-[10px] font-medium bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:border-primary/60 transition-colors"
                  >
                    {isCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              );
            })}

            {/* CSS Name row */}
            <div className="flex items-center gap-3 px-4 py-3 border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark rounded-lg">
              <span className="w-10 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                CSS
              </span>
              {output.name ? (
                <>
                  <span className="flex-1 font-mono text-sm text-slate-800 dark:text-slate-200 select-all">
                    {output.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(output.name!, "css")}
                    className="shrink-0 px-2 py-0.5 text-[10px] font-medium bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:border-primary/60 transition-colors"
                  >
                    {copiedId === "css" ? "Copied" : "Copy"}
                  </button>
                </>
              ) : (
                <span className="flex-1 text-sm text-slate-400 dark:text-slate-600">—</span>
              )}
            </div>

            {/* Large swatch preview */}
            <div
              className="mt-2 w-full h-20 rounded-lg border border-border-light dark:border-border-dark"
              style={{ backgroundColor: output.hex }}
              aria-label={`Colour preview: ${output.hex}`}
            />
          </div>
        ) : !isLoading && !input ? (
          <p className="text-sm text-slate-400 dark:text-slate-600">
            Enter a colour in any format, or click the swatch to open the colour picker.
          </p>
        ) : null}
      </div>

      {isLoading && (
        <div className="px-4 pb-2 text-xs text-primary">Processing…</div>
      )}
    </div>
  );
}

export default ColorConverterTool;
