import { useMemo, useState } from "react";
import { CopyButton } from "../../components/tool/CopyButton";

interface ShadowLayer {
  id: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
}

interface NumericField {
  key: "x" | "y" | "blur" | "spread";
  label: string;
  min: number;
  max: number;
}

const MAX_LAYERS = 6;
const NUMERIC_FIELDS: NumericField[] = [
  { key: "x", label: "X Offset", min: -100, max: 100 },
  { key: "y", label: "Y Offset", min: -100, max: 100 },
  { key: "blur", label: "Blur", min: 0, max: 100 },
  { key: "spread", label: "Spread", min: -50, max: 50 },
];

function createDefaultLayer(): ShadowLayer {
  return {
    id: crypto.randomUUID(),
    x: 4,
    y: 4,
    blur: 10,
    spread: 0,
    color: "#00000040",
    inset: false,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getHexAndOpacity(color: string): { hex6: string; opacity: number } {
  const normalized = color.toLowerCase();
  const safe = /^#[0-9a-f]{8}$/.test(normalized) ? normalized : "#00000040";
  const hex6 = safe.slice(0, 7);
  const alphaHex = safe.slice(7, 9);
  const opacity = Math.round((parseInt(alphaHex, 16) / 255) * 100);
  return { hex6, opacity };
}

function buildColorWithOpacity(hex6: string, opacity: number): string {
  const safeHex6 = /^#[0-9a-f]{6}$/i.test(hex6) ? hex6.toLowerCase() : "#000000";
  const safeOpacity = clamp(opacity, 0, 100);
  const alpha = Math.round((safeOpacity / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${safeHex6}${alpha}`;
}

function BoxShadowBuilderTool() {
  const [layers, setLayers] = useState<ShadowLayer[]>([createDefaultLayer()]);

  const cssValue = useMemo(() => {
    if (layers.length === 0) return "none";
    return layers
      .map((layer) => {
        const parts = layer.inset ? ["inset"] : [];
        parts.push(
          `${layer.x}px`,
          `${layer.y}px`,
          `${layer.blur}px`,
          `${layer.spread}px`,
          layer.color
        );
        return parts.join(" ");
      })
      .join(", ");
  }, [layers]);

  const cssProperty = `box-shadow: ${cssValue};`;

  function updateLayer(id: string, patch: Partial<Omit<ShadowLayer, "id">>) {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer))
    );
  }

  function addLayer() {
    setLayers((prev) => {
      if (prev.length >= MAX_LAYERS) return prev;
      return [...prev, createDefaultLayer()];
    });
  }

  function removeLayer(id: string) {
    setLayers((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((layer) => layer.id !== id);
    });
  }

  function moveLayerUp(index: number) {
    if (index <= 0) return;
    setLayers((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveLayerDown(index: number) {
    setLayers((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  return (
    <div className="h-full bg-background-light p-3 font-display text-slate-900 dark:bg-background-dark dark:text-slate-100 md:p-4">
      <div className="grid h-full min-h-0 grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
        <section className="flex min-h-0 flex-col rounded-xl border border-border-light bg-white dark:border-border-dark dark:bg-panel-dark">
          <header className="flex min-h-[41px] items-center justify-between border-b border-border-light px-4 py-2 dark:border-border-dark">
            <h2 className="text-sm font-semibold">Layers</h2>
            <button
              type="button"
              onClick={addLayer}
              disabled={layers.length >= MAX_LAYERS}
              className="rounded-lg border border-border-light px-2.5 py-1.5 text-xs font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-dark dark:bg-background-dark"
            >
              + Add layer
            </button>
          </header>

          <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {layers.map((layer, index) => {
              const { hex6, opacity } = getHexAndOpacity(layer.color);
              return (
                <article
                  key={layer.id}
                  className="rounded-lg border border-border-light bg-background-light p-3 dark:border-border-dark dark:bg-background-dark"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold">Layer {index + 1}</h3>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={layer.inset}
                          onChange={(e) =>
                            updateLayer(layer.id, { inset: e.target.checked })
                          }
                          className="h-3.5 w-3.5 rounded border-border-light accent-primary dark:border-border-dark"
                        />
                        Inset
                      </label>
                    </div>

                    <div className="flex items-center gap-1">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => moveLayerUp(index)}
                          className="rounded p-1 text-slate-500 transition-colors hover:text-primary"
                          aria-label={`Move layer ${index + 1} up`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            keyboard_arrow_up
                          </span>
                        </button>
                      )}
                      {index < layers.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moveLayerDown(index)}
                          className="rounded p-1 text-slate-500 transition-colors hover:text-primary"
                          aria-label={`Move layer ${index + 1} down`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            keyboard_arrow_down
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeLayer(layer.id)}
                        disabled={layers.length === 1}
                        className="rounded p-1 text-slate-500 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Remove layer ${index + 1}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {NUMERIC_FIELDS.map((field) => (
                      <label key={field.key} className="text-xs">
                        <span className="mb-1 block text-slate-600 dark:text-slate-400">
                          {field.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={field.min}
                            max={field.max}
                            step={1}
                            value={layer[field.key]}
                            onChange={(e) => {
                              const parsed = Number(e.target.value);
                              if (Number.isNaN(parsed)) return;
                              const bounded = clamp(parsed, field.min, field.max);
                              updateLayer(layer.id, { [field.key]: bounded });
                            }}
                            className="w-full rounded-lg border border-border-light bg-white px-2 py-1.5 text-sm dark:border-border-dark dark:bg-panel-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          />
                          <span className="text-xs text-slate-500">px</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="mt-3">
                    <p className="mb-1 text-xs text-slate-600 dark:text-slate-400">Color</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={hex6}
                          onChange={(e) =>
                            updateLayer(layer.id, {
                              color: buildColorWithOpacity(e.target.value, opacity),
                            })
                          }
                          className="h-8 w-10 cursor-pointer rounded border border-border-light bg-transparent p-0.5 dark:border-border-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          aria-label={`Choose color for layer ${index + 1}`}
                        />
                        <span className="font-mono text-xs text-slate-500">
                          {layer.color.toUpperCase()}
                        </span>
                      </div>
                      <label className="flex min-w-[180px] flex-1 items-center gap-2 text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Opacity</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={opacity}
                          onChange={(e) =>
                            updateLayer(layer.id, {
                              color: buildColorWithOpacity(hex6, Number(e.target.value)),
                            })
                          }
                          className="flex-1 accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                        <span className="w-9 text-right font-mono text-slate-500">
                          {opacity}%
                        </span>
                      </label>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-xl border border-border-light bg-white dark:border-border-dark dark:bg-panel-dark">
          <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-4">
            <div
              className="flex h-full w-full items-center justify-center rounded-xl border border-border-light bg-slate-100 p-6 dark:border-border-dark dark:bg-slate-800"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, rgb(226 232 240 / 70%) 25%, transparent 25%), linear-gradient(-45deg, rgb(226 232 240 / 70%) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgb(226 232 240 / 70%) 75%), linear-gradient(-45deg, transparent 75%, rgb(226 232 240 / 70%) 75%)",
                backgroundSize: "16px 16px",
                backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
              }}
            >
              <div
                className="h-20 w-[120px] rounded-lg border border-border-light bg-white dark:border-border-dark dark:bg-panel-dark"
                style={{ boxShadow: cssValue }}
              />
            </div>
          </div>

          <div className="border-t border-border-light p-3 dark:border-border-dark sm:p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">CSS Output</h2>
              <div className="flex items-center gap-2">
                <CopyButton value={cssValue} label="Copy value" />
                <CopyButton value={cssProperty} label="Copy property" />
              </div>
            </div>
            <code
              className="block w-full overflow-x-auto rounded-lg border border-border-light bg-background-light p-3 font-mono text-xs text-slate-700 dark:border-border-dark dark:bg-background-dark dark:text-slate-300"
              aria-live="polite"
            >
              {cssProperty}
            </code>
          </div>
        </section>
      </div>
    </div>
  );
}

export default BoxShadowBuilderTool;
