# UI Review — Instrument v1.2.0

Reviewed against the live deployed site (instrument-wqt.pages.dev) and local dev server.
Date: 2026-04-16

---

## Navigation & Information Architecture

### [HIGH] No route from a tool page to its category
From within a tool (e.g. Base64 Encoder), there is no way to navigate to the containing category (e.g. Encoding) or discover sibling tools (URL Encoder, Hex Converter, etc.) without going all the way back to the dashboard.

The `ENCODING` category badge is already present in the tool header top-right — making it a clickable link to the category page fixes this with zero new UI.

**Fix:** Make the category badge in the tool header a link to `/category/<id>`.

---

### [MEDIUM] Category badge in tool header is the right fix — just needs to be wired up
The `ENCODING · frontend · backend · general` badges are in the right place but non-interactive. The category badge (`ENCODING`) is the useful one for navigation. The role tags (`frontend`, `backend`, `general`) add noise at the tool level where the user already knows what the tool does — consider removing role tags from the tool header entirely and keeping only the category badge, made clickable.

---

### [MEDIUM] Sidebar icons have no hover tooltips
The three sidebar icons (home / history / settings) are recognisable but have no hover tooltip to confirm their function. The keyboard shortcuts ⌘1 / ⌘2 / ⌘3 are referenced in the search bar area but never surfaced in the sidebar itself.

**Fix:** Add a tooltip on hover to each sidebar icon showing the label and keyboard shortcut.

---

## Dashboard

### [MEDIUM] All category cards are visually identical
Every category card has the same background, icon treatment, and typography. There is no visual differentiation between Encoding, Security, Formatting, etc. Users cannot build spatial memory of where things are at a glance.

**Fix:** Add a subtle accent colour per category — e.g. a tinted icon background or a thin coloured left border. The colour does not need to be vivid; a 10–15% opacity tint is enough.

---

### [MEDIUM] Tool count badge is disconnected from the title
The count (e.g. "18" for Security, "11" for Formatting) appears in the top-right corner of each card, positioned like a notification badge. It reads ambiguously — it's actually a tool count, but its position makes it look like a badge or indicator.

**Fix:** Render the count inline with the category title, e.g. `Security · 10 tools`, or style it clearly as a count chip attached to the heading.

---

### [MEDIUM] "View all 60 tools" CTA is buried
The button sits below the category grid in a low-contrast ghost style. It is a primary navigation action for users who want to browse all tools and deserves more visual weight or a more prominent position (e.g. in the page header row alongside the role filters).

---

### [LOW] "Good afternoon" heading has low long-term utility
On first visit it is a nice touch. On return visits the Favourites and Recent sections below it do the real work. The heading itself occupies space without adding information.

**Fix:** No urgent change needed. Could eventually be replaced with a more persistent piece of useful content (e.g. a "what's new in v1.2.0" line), but acceptable as-is.

---

## Tool Page

### [MEDIUM] Four tag badges in the tool header is too many
The tool header shows `ENCODING · frontend · backend · general` — four badges. At the tool level, the user already knows the context. The category badge (`ENCODING`) is useful for navigation (once made clickable). The role tags (`frontend`, `backend`, `general`) are redundant noise here.

**Fix:** Show only the category badge in the tool header. Role tags are useful in the library/search views but not needed inside the tool itself.

---

### [LOW] Output panel empty state is too bare
Before the user has typed anything, the right panel shows only `Output` in small grey text. The panel feels abandoned.

**Fix:** Add a subtle placeholder: `"Output will appear here"` or a faint decorative pattern.

---

### [LOW] Panel divider / resize handle is nearly invisible
The vertical divider between INPUT and OUTPUT panels is very faint. The drag-to-resize affordance is undiscoverable.

**Fix:** Make the divider 2px wide with a subtle hover highlight (e.g. primary colour at 40% opacity on hover) to signal that it is draggable.

---

## Mobile (375px)

### [HIGH] Role filter pills wrap to two rows
At 375px the filter pills (All / Frontend / Backend / DevOps / Security / Data / General) wrap onto two rows, breaking the layout and consuming significant vertical space.

**Fix:** Make the filter row `overflow-x: auto` with `white-space: nowrap` and hidden scrollbar — a single horizontally-scrollable row is the correct mobile pattern.

---

### [LOW] Category cards are very tall on mobile
Cards showing 3 tool tags + "+N more" are quite tall in the 2-column mobile grid, requiring a lot of scrolling.

**Fix:** Reduce to 1–2 tags maximum on mobile, or show only the "+N tools" count without listing individual tags.

---

### [LOW] ⌘K shortcut hint shown on touch devices
The search bar displays `⌘K` even on mobile where the shortcut is meaningless.

**Fix:** Hide the shortcut hint below the `md:` breakpoint.

---

## Search Modal

### [LOW] Modal width is on the narrow side
The modal renders at ~380px on a 1280px+ viewport — about 28% of available width. Tool names and descriptions fit, but there is no room for additional content (shortcuts, descriptions, a second results column).

**Fix:** Increase to ~520px. This is still well within comfortable command palette norms and leaves clear backdrop on either side.

---

## History Page

### [MEDIUM] Empty state has no actionable CTA
The empty state reads: *"No history yet. Run a tool to see results here."* — plain text only, no link or button. A user arriving here for the first time has no direct path forward.

**Fix:** Add a `Browse tools →` button below the message that navigates to the dashboard.

---

### [LOW] Heading style inconsistent with Settings page
History uses `HISTORY` (all-caps). Settings uses `Settings` (title case). These are adjacent pages accessed from the same sidebar.

**Fix:** Pick one convention and apply it consistently across all pages.

---

## Light Mode

### [LOW] Sidebar has no distinct background
In light mode both the sidebar and main content area are white, separated only by a 1px border. The sidebar has no visual identity of its own.

**Fix:** Apply `bg-slate-50` or `bg-slate-100` to the sidebar in light mode to give it definition.

---

### [LOW] Active nav icon is barely distinguishable in light mode
The filled vs outlined icon variant used to indicate the active sidebar item is subtle, especially in light mode where there is less overall contrast.

**Fix:** Add a small filled pill or coloured dot background behind the active icon to make the active state unambiguous.

---

## Icons & Consistency

### [LOW] `HTML` text string used as an icon
The HTML Entity tool uses the literal text `HTML` as its category icon in the tool list view. Every other tool uses a proper symbol (Material Symbols or SVG). This looks unfinished.

**Fix:** Replace with an appropriate Material Symbol or a purpose-built SVG icon consistent with other tools.

---

## Summary Table

| Priority | Area | Issue |
|---|---|---|
| High | Navigation | No route from tool page to its category |
| High | Mobile | Filter pills wrap to two rows |
| Medium | Navigation | Category badge not clickable; role tags add noise |
| Medium | Navigation | Sidebar icons have no hover tooltips |
| Medium | Dashboard | Category cards all look identical |
| Medium | Dashboard | Tool count badge disconnected from title |
| Medium | Dashboard | "View all tools" CTA buried |
| Medium | Tool page | Four tag badges in tool header — too many |
| Medium | History | Empty state has no actionable CTA |
| Low | Dashboard | "Good afternoon" heading low long-term utility |
| Low | Tool page | Output panel empty state too bare |
| Low | Tool page | Panel divider resize handle invisible |
| Low | Mobile | Category cards very tall |
| Low | Mobile | ⌘K hint shown on touch devices |
| Low | Search | Modal width narrow at large viewports |
| Low | History | Heading casing inconsistent with Settings |
| Low | Light mode | Sidebar has no distinct background |
| Low | Light mode | Active nav icon hard to distinguish |
| Low | Icons | `HTML` text string used as icon for HTML Entity tool |
