import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { callTool } from "../../bridge";

const RUST_COMMAND = "image_convert";
const ACCEPTED_TYPES = "PNG, JPEG, WebP, BMP, TIFF, GIF, ICO, TGA, PNM";
const OUTPUT_FORMATS = ["png", "jpeg", "webp", "bmp", "tiff", "ico", "tga", "pnm"] as const;
const ROTATIONS = [0, 90, 180, 270] as const;

interface ConvertOptions {
  outputFormat: (typeof OUTPUT_FORMATS)[number];
  quality: number;
  resizeW: string;
  resizeH: string;
  lockAspect: boolean;
  rotate: (typeof ROTATIONS)[number];
  flipH: boolean;
  flipV: boolean;
  grayscale: boolean;
}

interface InputFile {
  name: string;
  b64: string;
  format: string;
  sizeBytes: number;
  width: number;
  height: number;
}

interface ConvertResult {
  b64: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
}

function readFileAsB64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const raw = result.includes(",") ? result.split(",")[1] : result;
      resolve(raw);
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unsupported or invalid image file."));
    };
    image.src = url;
  });
}

function detectFormat(file: File): string {
  if (file.type.startsWith("image/")) {
    const mime = file.type.replace("image/", "").toLowerCase();
    if (mime === "jpg") return "jpeg";
    return mime;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ext === "jpg" ? "jpeg" : ext;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function downloadOutput(result: ConvertResult, baseName: string) {
  const bytes = Uint8Array.from(atob(result.b64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: `image/${result.format}` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}.${result.format}`;
  a.click();
  URL.revokeObjectURL(url);
}

const defaultOptions: ConvertOptions = {
  outputFormat: "png",
  quality: 85,
  resizeW: "",
  resizeH: "",
  lockAspect: true,
  rotate: 0,
  flipH: false,
  flipV: false,
  grayscale: false,
};

function ImageConverterTool() {
  const [inputFile, setInputFile] = useState<InputFile | null>(null);
  const [opts, setOpts] = useState<ConvertOptions>(defaultOptions);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runConvert = useCallback(async (currentFile: InputFile, currentOpts: ConvertOptions) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = (await callTool(
        RUST_COMMAND,
        {
          data: currentFile.b64,
          inputFormat: currentFile.format,
          outputFormat: currentOpts.outputFormat,
          quality: currentOpts.quality,
          resize:
            currentOpts.resizeW || currentOpts.resizeH
              ? {
                  width: currentOpts.resizeW ? Number.parseInt(currentOpts.resizeW, 10) : null,
                  height: currentOpts.resizeH ? Number.parseInt(currentOpts.resizeH, 10) : null,
                  maintainAspect: currentOpts.lockAspect,
                }
              : null,
          rotate: currentOpts.rotate,
          flip: currentOpts.flipH
            ? "horizontal"
            : currentOpts.flipV
              ? "vertical"
              : "",
          grayscale: currentOpts.grayscale,
        },
        { skipHistory: true }
      )) as {
        data: string;
        format: string;
        width: number;
        height: number;
        sizeBytes: number;
        error?: string | null;
      };

      if (response.error) {
        setResult(null);
        setError(response.error);
        return;
      }

      setResult({
        b64: response.data,
        width: response.width,
        height: response.height,
        sizeBytes: response.sizeBytes,
        format: response.format,
      });
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!inputFile) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runConvert(inputFile, opts);
      debounceRef.current = null;
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputFile, opts, runConvert]);

  const loadFile = useCallback(async (file: File) => {
    try {
      setError(null);
      setResult(null);
      const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
      if (file.size > MAX_BYTES) {
        setError(
          `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 25 MB.`
        );
        return;
      }
      const [b64, dims] = await Promise.all([readFileAsB64(file), readImageDimensions(file)]);
      setInputFile({
        name: file.name,
        b64,
        format: detectFormat(file),
        sizeBytes: file.size,
        width: dims.width,
        height: dims.height,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load image.");
    }
  }, []);

  const onFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await loadFile(file);
      event.target.value = "";
    },
    [loadFile]
  );

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      await loadFile(file);
    },
    [loadFile]
  );

  const changeDimension = useCallback((key: "resizeW" | "resizeH", value: string) => {
    setOpts((prev) => {
      const next: ConvertOptions = { ...prev, [key]: value };
      if (!inputFile || !prev.lockAspect || value === "") return next;
      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed) || parsed < 1) return next;
      if (key === "resizeW") {
        next.resizeH = Math.round((parsed * inputFile.height) / inputFile.width).toString();
      } else {
        next.resizeW = Math.round((parsed * inputFile.width) / inputFile.height).toString();
      }
      return next;
    });
  }, [inputFile]);

  const inputPreviewSrc = useMemo(
    () =>
      inputFile
        ? `data:image/${inputFile.format === "jpg" ? "jpeg" : inputFile.format};base64,${inputFile.b64}`
        : "",
    [inputFile]
  );

  const outputPreviewSrc = useMemo(
    () => (result ? `data:image/${result.format};base64,${result.b64}` : ""),
    [result]
  );

  const sizeDelta = useMemo(() => {
    if (!inputFile || !result) return null;
    const delta = ((result.sizeBytes - inputFile.sizeBytes) / inputFile.sizeBytes) * 100;
    return `${delta > 0 ? "+" : ""}${Math.round(delta)}%`;
  }, [inputFile, result]);

  const baseOutputName = useMemo(() => {
    const raw = inputFile?.name ?? "output";
    const lastDot = raw.lastIndexOf(".");
    return lastDot > 0 ? raw.slice(0, lastDot) : raw;
  }, [inputFile?.name]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 w-full flex-col border-b border-border-light dark:border-border-dark md:w-[45%] md:border-b-0 md:border-r">
          {!inputFile ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`m-4 flex min-h-[240px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border-light dark:border-border-dark"
              }`}
            >
              <span className="material-symbols-outlined mb-2 text-4xl text-slate-400">image</span>
              <p className="text-sm font-medium">Drop an image or click to browse</p>
              <p className="mt-1 text-xs text-slate-500">{ACCEPTED_TYPES}</p>
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border-light px-4 py-2 text-xs dark:border-border-dark">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-primary"
                >
                  <span className="material-symbols-outlined text-sm">image</span>
                  Change image
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputFile(null);
                    setResult(null);
                    setError(null);
                  }}
                  className="text-slate-400 hover:text-red-500"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                <div className="flex h-full items-center justify-center">
                  <img src={inputPreviewSrc} alt="Input preview" className="max-h-full w-full object-contain" />
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-border-light px-4 py-2 text-xs text-slate-500 dark:border-border-dark">
                <span className="truncate">{inputFile.name}</span>
                <span>·</span>
                <span>{inputFile.width}x{inputFile.height}</span>
                <span>·</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">
                  {inputFile.format.toUpperCase()}
                </span>
                <span>·</span>
                <span>{formatBytes(inputFile.sizeBytes)}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex min-h-0 w-full flex-col md:w-[55%]">
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Output format</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {OUTPUT_FORMATS.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setOpts((s) => ({ ...s, outputFormat: format }))}
                  className={`rounded-full px-3 py-1 text-xs ${
                    opts.outputFormat === format
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>

            {(opts.outputFormat === "jpeg" || opts.outputFormat === "webp") && (
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Quality</p>
                  <span className="font-mono text-xs">{opts.quality}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={opts.quality}
                  onChange={(e) => setOpts((s) => ({ ...s, quality: Number.parseInt(e.target.value, 10) }))}
                  className="w-full"
                />
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>1</span>
                  <span>100</span>
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Resize</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs">W</label>
                <input
                  type="number"
                  min={1}
                  value={opts.resizeW}
                  onChange={(e) => changeDimension("resizeW", e.target.value)}
                  placeholder="—"
                  className="w-24 rounded border border-border-light bg-transparent px-2 py-1 text-xs dark:border-border-dark"
                />
                <label className="text-xs">H</label>
                <input
                  type="number"
                  min={1}
                  value={opts.resizeH}
                  onChange={(e) => changeDimension("resizeH", e.target.value)}
                  placeholder="—"
                  className="w-24 rounded border border-border-light bg-transparent px-2 py-1 text-xs dark:border-border-dark"
                />
                <button
                  type="button"
                  onClick={() => setOpts((s) => ({ ...s, lockAspect: !s.lockAspect }))}
                  className={`rounded-full px-3 py-1 text-xs ${
                    opts.lockAspect ? "bg-primary text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  Lock aspect ratio
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Transform</p>
              <div className="mb-2 flex flex-wrap gap-2">
                {ROTATIONS.map((rotation) => (
                  <button
                    key={rotation}
                    type="button"
                    onClick={() => setOpts((s) => ({ ...s, rotate: rotation }))}
                    className={`rounded-full px-3 py-1 text-xs ${
                      opts.rotate === rotation
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {rotation}°
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setOpts((s) => ({ ...s, flipH: !s.flipH, flipV: false }))}
                  className={`rounded-full px-3 py-1 text-xs ${
                    opts.flipH ? "bg-primary text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  ↔ Horizontal
                </button>
                <button
                  type="button"
                  onClick={() => setOpts((s) => ({ ...s, flipV: !s.flipV, flipH: false }))}
                  className={`rounded-full px-3 py-1 text-xs ${
                    opts.flipV ? "bg-primary text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  ↕ Vertical
                </button>
              </div>
            </div>

            <label className="mb-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={opts.grayscale}
                onChange={(e) => setOpts((s) => ({ ...s, grayscale: e.target.checked }))}
              />
              Convert to greyscale
            </label>

            <div className="my-4 h-px bg-border-light dark:bg-border-dark" />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Output</p>
                {isLoading && <span className="text-xs text-slate-500">Converting…</span>}
              </div>
              {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
              {result ? (
                <>
                  <div className="mb-2 flex h-64 items-center justify-center rounded-lg border border-border-light p-3 dark:border-border-dark">
                    <img src={outputPreviewSrc} alt="Output preview" className="max-h-full w-full object-contain" />
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{baseOutputName}.{result.format}</span>
                    <span>·</span>
                    <span>{result.width}x{result.height}</span>
                    <span>·</span>
                    <span>{formatBytes(result.sizeBytes)}</span>
                    {sizeDelta && (
                      <>
                        <span>·</span>
                        <span className={sizeDelta.startsWith("-") ? "text-emerald-600" : "text-amber-600"}>
                          {sizeDelta}
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadOutput(result, baseOutputName)}
                    className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    Download {baseOutputName}.{result.format}
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-500">Load an image to start converting.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageConverterTool;
