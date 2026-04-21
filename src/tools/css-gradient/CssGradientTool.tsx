import { useMemo, useState } from "react";
import { CopyButton } from "../../components/tool/CopyButton";

interface ColorStop {
  id: string;
  color: string;
  position: number;
}

type GradientType = "linear" | "radial" | "conic";
type RadialShape = "circle" | "ellipse";

const DEFAULT_STOPS: ColorStop[] = [
  { id: crypto.randomUUID(), color: "#6366f1", position: 0 },
  { id: crypto.randomUUID(), color: "#ec4899", position: 100 },
];

const DIRECTION_PRESETS = [
  { label: "↑", value: 0 },
  { label: "→", value: 90 },
  { label: "↓", value: 180 },
  { label: "←", value: 270 },
  { label: "↗", value: 45 },
  { label: "↙", value: 225 },
];

const RADIAL_POSITION_PRESETS = [
  "center",
  "top",
  "right",
  "bottom",
  "left",
  "top left",
  "top right",
  "bottom left",
  "bottom right",
];

function buildGradientValue(
  type: GradientType,
  angle: number,
  shape: RadialShape,
  position: string,
  stops: ColorStop[]
): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const stopsStr = sorted.map((s) => `${s.color} ${s.position}%`).join(", ");
  if (type === "linear") return `linear-gradient(${angle}deg, ${stopsStr})`;
  if (type === "radial") return `radial-gradient(${shape} at ${position}, ${stopsStr})`;
  return `conic-gradient(from ${angle}deg, ${stopsStr})`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {children}
    </p>
  );
}

function OptionPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
        active
          ? "bg-primary/10 text-primary border-primary/30"
          : "bg-transparent text-slate-500 border-border-light dark:border-border-dark hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function CssGradientTool() {
  const [gradientType, setGradientType] = useState<GradientType>("linear");
  const [angle, setAngle] = useState(90);
  const [radialShape, setRadialShape] = useState<RadialShape>("ellipse");
  const [radialPosition, setRadialPosition] = useState("center");
  const [stops, setStops] = useState<ColorStop[]>(DEFAULT_STOPS);

  const gradientValue = useMemo(
    () => buildGradientValue(gradientType, angle, radialShape, radialPosition, stops),
    [gradientType, angle, radialShape, radialPosition, stops]
  );
  const cssBackground = `background: ${gradientValue};`;

  function addStop() {
    setStops((prev) => [
      ...prev,
      { id: crypto.randomUUID(), color: "#ffffff", position: 50 },
    ]);
  }

  function removeStop(id: string) {
    setStops((prev) => prev.filter((s) => s.id !== id));
  }

  function updateStop(id: string, patch: Partial<Omit<ColorStop, "id">>) {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div
        className="mx-4 mt-4 h-40 shrink-0 rounded-xl border border-border-light dark:border-border-dark"
        style={{ background: gradientValue }}
      />

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 p-4">
          <div>
            <SectionLabel>Type</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <OptionPill
                active={gradientType === "linear"}
                onClick={() => setGradientType("linear")}
              >
                Linear
              </OptionPill>
              <OptionPill
                active={gradientType === "radial"}
                onClick={() => setGradientType("radial")}
              >
                Radial
              </OptionPill>
              <OptionPill
                active={gradientType === "conic"}
                onClick={() => setGradientType("conic")}
              >
                Conic
              </OptionPill>
            </div>
          </div>

          {(gradientType === "linear" || gradientType === "conic") && (
            <div>
              <SectionLabel>Direction</SectionLabel>
              <div className="mb-3 flex flex-wrap gap-2">
                {DIRECTION_PRESETS.map((preset) => (
                  <OptionPill
                    key={preset.label}
                    active={angle === preset.value}
                    onClick={() => setAngle(preset.value)}
                  >
                    {preset.label}
                  </OptionPill>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <input
                  type="number"
                  min={0}
                  max={360}
                  value={angle}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(360, Number(e.target.value)));
                    if (!Number.isNaN(v)) setAngle(v);
                  }}
                  className="w-16 rounded border border-border-light px-2 py-1 text-center text-sm dark:border-border-dark dark:bg-panel-dark"
                />
                <span className="text-sm text-slate-500">°</span>
              </div>
            </div>
          )}

          {gradientType === "radial" && (
            <div>
              <SectionLabel>Radial</SectionLabel>
              <div className="mb-3 flex flex-wrap gap-2">
                <OptionPill
                  active={radialShape === "circle"}
                  onClick={() => setRadialShape("circle")}
                >
                  Circle
                </OptionPill>
                <OptionPill
                  active={radialShape === "ellipse"}
                  onClick={() => setRadialShape("ellipse")}
                >
                  Ellipse
                </OptionPill>
              </div>
              <div className="flex flex-wrap gap-2">
                {RADIAL_POSITION_PRESETS.map((position) => (
                  <OptionPill
                    key={position}
                    active={radialPosition === position}
                    onClick={() => setRadialPosition(position)}
                  >
                    {position
                      .split(" ")
                      .map((word) => word[0].toUpperCase() + word.slice(1))
                      .join(" ")}
                  </OptionPill>
                ))}
              </div>
            </div>
          )}

          <div>
            <SectionLabel>Color Stops</SectionLabel>
            <div className="flex flex-col gap-2">
              {stops.map((stop) => (
                <div key={stop.id} className="flex items-center gap-2">
                  <div className="relative h-7 w-7 shrink-0">
                    <div
                      className="h-7 w-7 rounded border border-border-light dark:border-border-dark"
                      style={{ backgroundColor: stop.color }}
                    />
                    <input
                      type="color"
                      value={stop.color}
                      onChange={(e) => updateStop(stop.id, { color: e.target.value })}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label="Choose stop color"
                    />
                  </div>

                  <span className="w-16 font-mono text-xs text-slate-600 dark:text-slate-400">
                    {stop.color.toUpperCase()}
                  </span>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={stop.position}
                    onChange={(e) => updateStop(stop.id, { position: Number(e.target.value) })}
                    className="flex-1 accent-primary"
                  />

                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={stop.position}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(100, Number(e.target.value)));
                      if (!Number.isNaN(v)) updateStop(stop.id, { position: v });
                    }}
                    className="w-12 rounded border border-border-light px-1.5 py-0.5 text-center text-xs dark:border-border-dark dark:bg-panel-dark"
                  />
                  <span className="text-xs text-slate-400">%</span>

                  {stops.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeStop(stop.id)}
                      className="text-slate-400 transition-colors hover:text-red-500"
                      aria-label="Remove stop"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addStop}
              className="mt-2 flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add stop
            </button>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-border-light px-4 py-3 dark:border-border-dark">
        <code className="flex-1 truncate font-mono text-xs text-slate-600 dark:text-slate-400">
          {cssBackground}
        </code>
        <CopyButton value={cssBackground} />
      </div>
    </div>
  );
}

export default CssGradientTool;
