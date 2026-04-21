import { useMemo, useState } from "react";
import { CopyButton } from "../../components/tool/CopyButton";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";

const OUI_TABLE: Record<string, string> = {
  // Apple
  "001124": "Apple",
  "0017F2": "Apple",
  "0019E3": "Apple",
  "002332": "Apple",
  "002500": "Apple",
  "0026BB": "Apple",
  "0050E4": "Apple",
  "00A040": "Apple",
  "000A27": "Apple",
  "000A95": "Apple",
  F0D1A9: "Apple",
  F8FF0B: "Apple",
  "3C0754": "Apple",
  "7C6D62": "Apple",
  A8BE27: "Apple",
  DC2B2A: "Apple",
  // Google
  "3C5AB4": "Google",
  DA4485: "Google",
  F88FCA: "Google",
  "94EB2C": "Google",
  // Intel
  "001B21": "Intel",
  "0021D8": "Intel",
  "001320": "Intel",
  "7085C2": "Intel",
  "8086F2": "Intel",
  A4C3F0: "Intel",
  // Dell
  "001372": "Dell",
  "14187B": "Dell",
  B083FE: "Dell",
  F8BC12: "Dell",
  // Cisco
  "000142": "Cisco",
  "0019E7": "Cisco",
  "001B0D": "Cisco",
  B8D7AF: "Cisco",
  "001517": "Cisco",
  // Raspberry Pi Foundation
  B827EB: "Raspberry Pi Foundation",
  DCA632: "Raspberry Pi Foundation",
  E45F01: "Raspberry Pi Foundation",
  // Samsung
  "001599": "Samsung",
  "0026E2": "Samsung",
  "5CF7C2": "Samsung",
  CC07AB: "Samsung",
  // Qualcomm / Atheros
  "00235A": "Qualcomm",
  "0003FF": "Qualcomm / Atheros",
  // TP-Link
  "14CC20": "TP-Link",
  "50C7BF": "TP-Link",
  "74EA3A": "TP-Link",
  A0F3C1: "TP-Link",
  // NETGEAR
  "001E2A": "NETGEAR",
  "20E52A": "NETGEAR",
  "9003B7": "NETGEAR",
  // Amazon Technologies
  F0272D: "Amazon Technologies",
  "68371B": "Amazon Technologies",
  "34D270": "Amazon Technologies",
  A002DC: "Amazon Technologies",
  "40B4CD": "Amazon Technologies",
  // Microsoft
  "28186A": "Microsoft",
  "7C1E52": "Microsoft",
  // VMware
  "000C29": "VMware",
  "005056": "VMware",
  "000569": "VMware",
  // VirtualBox / Oracle
  "080027": "VirtualBox / Oracle",
  // Huawei
  "00259E": "Huawei",
  "48DB50": "Huawei",
  "70F96D": "Huawei",
  // ASUSTek
  "00261B": "ASUSTek",
  "1062EB": "ASUSTek",
  BC9746: "ASUSTek",
  // HP
  "001083": "HP",
  "3C4A92": "HP",
  D8D385: "HP",
};

interface MacFormats {
  colon: string;
  hyphen: string;
  cisco: string;
  plain: string;
}

function normalizeMac(input: string): string | null {
  const stripped = input.trim().replace(/[:\-.]/g, "");
  if (!/^[0-9a-fA-F]{12}$/.test(stripped)) return null;
  return stripped.toUpperCase();
}

function formatMac(hex: string): MacFormats {
  const pairs = hex.match(/.{2}/g)!;
  return {
    colon: pairs.join(":"),
    hyphen: pairs.join("-"),
    cisco: `${hex.slice(0, 4)}.${hex.slice(4, 8)}.${hex.slice(8, 12)}`,
    plain: hex,
  };
}

function getTransmission(hex: string): "Unicast" | "Multicast" {
  const firstByte = parseInt(hex.slice(0, 2), 16);
  return (firstByte & 0x01) === 0 ? "Unicast" : "Multicast";
}

function getScope(hex: string): "Globally Unique" | "Locally Administered" {
  const firstByte = parseInt(hex.slice(0, 2), 16);
  return (firstByte & 0x02) === 0 ? "Globally Unique" : "Locally Administered";
}

function getOui(hex: string): string {
  return hex.slice(0, 6);
}

function lookupVendor(oui: string): string | undefined {
  return OUI_TABLE[oui];
}

function generateLocalMac(): string {
  const bytes = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
  bytes[0] = (bytes[0] & 0xfc) | 0x02;
  return bytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join("");
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {children}
    </p>
  );
}

function FormatRow({
  label,
  value,
  ariaLabel,
}: {
  label: string;
  value: string;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-light bg-panel-light/40 px-4 py-2.5 dark:border-border-dark dark:bg-panel-dark/40">
      <span className="w-16 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="flex-1 font-mono text-sm text-slate-800 dark:text-slate-200">{value}</span>
      <CopyButton value={value} variant="icon" aria-label={ariaLabel} />
    </div>
  );
}

function PropCard({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border-light bg-white px-3 py-2 dark:border-border-dark dark:bg-panel-dark">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </div>
      {badge ?? (
        <div className="mt-0.5 font-mono text-sm text-slate-800 dark:text-slate-200">{value}</div>
      )}
    </div>
  );
}

const TOOL_ID = "mac-address";

function MacAddressTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);

  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    const hex = normalizeMac(input);
    if (!hex) return { error: "Invalid MAC address — expected 12 hex digits" } as const;
    const oui = getOui(hex);
    return {
      hex,
      formats: formatMac(hex),
      transmission: getTransmission(hex),
      scope: getScope(hex),
      oui,
      vendor: lookupVendor(oui),
    };
  }, [input]);

  function handleGenerate() {
    const hex = generateLocalMac();
    const mac = formatMac(hex).colon;
    setInput(mac);
    setDraft(mac);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="shrink-0 border-b border-border-light p-4 dark:border-border-dark">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setDraft(e.target.value);
            }}
            placeholder="AA:BB:CC:DD:EE:FF — any format accepted"
            className="min-w-0 flex-1 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm font-mono dark:border-border-dark dark:bg-background-dark"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="MAC address input"
          />
          <button
            type="button"
            onClick={handleGenerate}
            className="shrink-0 rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm text-slate-600 transition-colors hover:border-primary/40 hover:text-primary dark:border-border-dark dark:text-slate-400 dark:hover:text-primary"
          >
            Generate Random
          </button>
        </div>
        {parsed && "error" in parsed && (
          <p className="mt-2 text-sm text-red-500 dark:text-red-400">{parsed.error}</p>
        )}
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        {!parsed ? (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            Enter a MAC address above
          </div>
        ) : "error" in parsed ? null : (
          <div className="flex flex-col gap-5 p-4">
            <div>
              <SectionLabel>Normalized Formats</SectionLabel>
              <div className="flex flex-col gap-2">
                <FormatRow
                  label="Colon"
                  value={parsed.formats.colon}
                  ariaLabel="Copy colon format"
                />
                <FormatRow
                  label="Hyphen"
                  value={parsed.formats.hyphen}
                  ariaLabel="Copy hyphen format"
                />
                <FormatRow
                  label="Cisco"
                  value={parsed.formats.cisco}
                  ariaLabel="Copy Cisco format"
                />
                <FormatRow
                  label="Plain"
                  value={parsed.formats.plain}
                  ariaLabel="Copy plain format"
                />
              </div>
            </div>

            <div>
              <SectionLabel>Details</SectionLabel>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <PropCard
                  label="Transmission"
                  value={parsed.transmission}
                  badge={
                    parsed.transmission === "Unicast" ? (
                      <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Unicast
                      </span>
                    ) : (
                      <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Multicast
                      </span>
                    )
                  }
                />

                <PropCard
                  label="Scope"
                  value={parsed.scope}
                  badge={
                    parsed.scope === "Globally Unique" ? (
                      <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Globally Unique
                      </span>
                    ) : (
                      <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        Locally Administered
                      </span>
                    )
                  }
                />

                <PropCard
                  label="OUI"
                  value={`${parsed.oui.slice(0, 2)}:${parsed.oui.slice(2, 4)}:${parsed.oui.slice(
                    4,
                    6
                  )}`}
                />

                <PropCard
                  label="Vendor"
                  value={parsed.vendor ?? "Unknown"}
                  badge={
                    parsed.vendor ? undefined : (
                      <div className="mt-0.5 font-mono text-sm text-slate-400 dark:text-slate-500">
                        Unknown
                      </div>
                    )
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MacAddressTool;
