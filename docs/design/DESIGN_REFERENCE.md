# Design Reference

This document captures design tokens, typography, component patterns, layout, interaction states, and dark mode usage from the prototype (`prototype-v4.html`). Use it when building the React UI to keep the app visually and behaviourally consistent.

---

## 1. Colour tokens

All custom colour values and their intended usage.

| Token | Value | Usage |
|-------|--------|--------|
| `primary` | `#306ee8` | Brand accent: active nav item, links, primary buttons, selected pills, focus rings, hover accents. Use for anything that should read as “selected” or “action”. |
| `background-light` | `#f6f6f8` | Light-mode page background (body, main canvas). |
| `background-dark` | `#1B1D21` | **Page background in dark mode.** Use for the root page/screen background (body, main content area). Do not use for raised panels. |
| `panel-dark` | `#23262B` | **Panel/surface in dark mode.** Use for cards, sidebars, inputs, and any elevated surface that sits on top of the page. Keeps hierarchy clear vs `background-dark`. |
| `border-dark` | `#2D3139` | **Borders in dark mode.** Use for dividers, panel edges, input borders, and status bar border so they stay visible on both page and panel backgrounds. |

**When to use which**

- **`primary`** — Active states, CTAs, links, selected filters, accent bar on sidebar.
- **`panel-dark`** — Any surface that is “on top of” the page (tool cards, side panels, search input background).
- **`border-dark`** — All borders in dark mode so panels and sections are clearly separated.
- **`background-dark`** — Only the base page/screen background in dark mode; not for panels or cards.

---

## 2. Typography

Font families and sizes used for each content type.

| Content type | Font | Tailwind / usage |
|--------------|------|-------------------|
| **Page headings** | Inter | `text-xl font-semibold` or `font-bold text-lg tracking-tight`; colour `text-slate-900 dark:text-slate-100`. |
| **Section labels** | Inter | `text-sm font-semibold uppercase tracking-wider text-slate-500`; optional icon at `text-[18px]`. Use for “Pinned Tools”, “Library”, “Step Configuration”. |
| **Body text** | Inter | `text-sm` with `text-slate-600 dark:text-slate-400` or `text-slate-500` for secondary copy. |
| **Tool card titles** | Inter | `text-sm font-semibold` or `text-sm font-medium`; primary text colour. |
| **Status bar text** | Inter + JetBrains Mono | `text-[10px] text-slate-500`; engine/version use `font-mono`. |
| **Monospace / code** | JetBrains Mono | `font-mono text-sm` (code blocks); `text-[10px] font-mono` (kbd, status bar). Use `fontFamily.mono` (JetBrains Mono) for code and technical labels. |

**Theme config**

- **Display:** `font-display` → Inter.
- **Mono:** `font-mono` → JetBrains Mono.
- **Border radius:** default `4px`, `rounded-lg` `6px`, `rounded-xl` `8px`, `rounded-full` for pills.

---

## 3. Component patterns

For each component: structure, visual states, and main Tailwind classes.

### Sidebar icon dock

- **Structure:** Fixed-width vertical strip, logo at top, nav links, then settings + avatar at bottom.
- **Tailwind:** `w-[64px] flex flex-col items-center py-6 border-r border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark shrink-0 h-screen`.
- **Inactive:** `text-slate-400 hover:text-primary`, outline icon (`fontVariationSettings` not filled).
- **Active state:** `text-primary` + **filled icon** (`fontVariationSettings: 'FILL' 1`) + **left accent bar**: `absolute -left-[14px] top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full`.
- **Transitions:** `transition-colors` on links and buttons.

### Tool card

- **Structure:** Icon container, title, description, optional tag row (e.g. type + arrow).
- **Tailwind:** `p-4 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-panel-dark` (or `dark:bg-background-dark` on Library grid); icon box `size-10 rounded bg-slate-100 dark:bg-slate-800`; title `text-sm font-semibold`; description `text-xs text-slate-500 line-clamp-2`.
- **Hover:** `hover:border-primary/50 transition-all cursor-pointer`; icon `group-hover:bg-primary/20 group-hover:text-primary transition-colors`.
- **Tag row:** `text-[10px] text-slate-400` with uppercase type label and arrow icon.

### Role filter pills

- **Structure:** Horizontal wrap of pill buttons (e.g. All, Frontend, Backend).
- **Inactive:** `text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50`, `px-2 py-0.5 text-[10px] font-semibold rounded-full cursor-pointer transition-colors`.
- **Active:** `bg-primary text-white` (no hover bg).
- Use for “role” or “category” filters above the category list.

### Category list item

- **Structure:** Icon + label in a row, full-width clickable.
- **Inactive:** `text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50`, `flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors`.
- **Active:** `bg-primary/10 text-primary` (tint background + primary text).
- Icon: `material-symbols-outlined text-[20px]`; label `text-sm font-medium`.

### Status bar footer

- **Structure:** Single row, left: connection label (dot + mono text), right: version + icon.
- **Tailwind:** `h-8 flex items-center px-6 border-t border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-[10px] text-slate-500 gap-6 shrink-0`.
- **Connection:** `w-2 h-2 rounded-full bg-emerald-500 animate-pulse` + `font-mono` label.
- **Right:** version `font-mono`, icon e.g. `material-symbols-outlined text-[16px] cursor-pointer hover:text-slate-100`.

### Chain breadcrumb pills

- **Structure:** Horizontal row of step pills with chevrons between; last item can be “Add Step”.
- **Inactive step:** `bg-slate-100 dark:bg-border-dark rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50 shrink-0`; icon + label inside.
- **Active step:** `bg-primary/10 dark:bg-primary/20 rounded-full text-xs font-medium text-primary border border-primary/20 shrink-0`.
- **Add Step (dashed):** `border border-dashed border-slate-300 dark:border-slate-700 rounded-full text-xs font-medium text-slate-400 dark:text-slate-500 cursor-pointer hover:border-primary/50 hover:text-primary transition-colors`.
- Pills are in a scrollable nav: `overflow-x-auto no-scrollbar`; separators `chevron_right` icon between pills.

---

## 4. Layout patterns

Description of the three-column layout on Library and Chains screens.

- **Overall:** `flex h-screen w-full overflow-hidden`. Sidebar + left panel + main content; main uses `flex-1 flex flex-col overflow-hidden` so it fills remaining space and manages overflow internally.
- **Sidebar widths:** Icon dock is **64px** (`w-[64px]`). Library left panel is **260px** (`w-[260px]`). Chains list panel is **256px** (`w-64`). Chains step-config panel is **320px** (`w-80`).
- **Flex structure:**  
  - First column: sidebar, `shrink-0`.  
  - Second column (Library/Chains list): `shrink-0`, fixed width.  
  - Third column: `flex-1 flex flex-col overflow-hidden`; header `shrink-0`, scrollable content `flex-1 overflow-y-auto custom-scrollbar`, status bar `shrink-0`.
- **Overflow:** Main content area uses `overflow-y-auto` and `custom-scrollbar`; horizontal breadcrumb nav uses `overflow-x-auto no-scrollbar`. This keeps the layout fixed height while only the content scrolls.
- **Main content filling space:** The main column does not have a fixed width; it gets all remaining space via `flex-1` and contains a flex column with a fixed header/footer and scrollable middle.

---

## 5. Interaction states

- **Hover (colour only):** Use `transition-colors` for text/background/border colour changes (e.g. sidebar links `hover:text-primary`, role pills `hover:bg-slate-100 dark:hover:bg-slate-800/50`, status bar icon `hover:text-slate-100`).
- **Hover (layout/border):** Use `transition-all` where both colour and border (or size) change, e.g. tool cards (`hover:border-primary/50`) and chain list rows (`hover:bg-slate-50 dark:hover:bg-panel-dark/80`).
- **Active/selected:** Sidebar: filled icon + left accent bar + `text-primary`. Pills: `bg-primary text-white`. Category list: `bg-primary/10 text-primary`. Chain step: `bg-primary/10 dark:bg-primary/20 text-primary border-primary/20`.
- **Focus:** Inputs use `focus:ring-1 focus:ring-primary` (and optional `outline-none`). Buttons and links rely on hover/active as above.
- **Optional motion:** `group-hover:scale-110 transition-transform` for small icon scale (e.g. “Recent Activity” icon).

---

## 6. Dark mode

- **Mechanism:** Tailwind `darkMode: "class"`; apply the `dark` class on a root element (e.g. `<html class="dark">`) to enable dark mode. All dark styles use the `dark:` prefix.
- **Page background (page bg):** `bg-background-light dark:bg-background-dark`. Use for body and main full-page background so the darkest surface is consistent.
- **Panel background (panel bg):** Use `dark:bg-panel-dark` for cards, sidebars, and inputs so they sit above the page. Some screens use `dark:bg-background-dark` for the sidebar strip and `dark:bg-panel-dark` for tool cards or inputs to create a second level. Library main content uses `dark:bg-[#0d1117]` for a slightly different content well.
- **Border:** Use `dark:border-border-dark` for standard borders in dark mode. Some dividers use `dark:border-slate-800` for a softer line. Keeps borders visible against both `background-dark` and `panel-dark`.
- **Text:** Primary text `dark:text-slate-100`; secondary `dark:text-slate-400` or `dark:text-slate-500`; muted `dark:text-slate-500`. Buttons and pills use the same semantic colours (e.g. `primary`) in both modes, with optional opacity variants (`primary/10`, `primary/20`) for tints in dark.
