# Colour Contrast Checker

Check foreground/background colour pairs against WCAG 2.1 contrast ratio requirements.

## Features

- Accepts 3- or 6-digit hex colours, with or without `#`
- Displays contrast ratio (e.g. 4.54:1)
- Shows pass/fail for all four WCAG thresholds: AA Normal, AA Large, AAA Normal, AAA Large
- Live preview strip renders sample text at normal and large sizes
- Swap button to instantly reverse foreground/background
- Synced colour swatch (native OS picker) + hex text field

## WCAG thresholds

| Level      | Ratio | Use case                          |
| ---------- | ----- | --------------------------------- |
| AA Normal  | ≥ 4.5 | Body text                         |
| AA Large   | ≥ 3.0 | Large text (18pt+) or bold 14pt+ |
| AAA Normal | ≥ 7.0 | Enhanced body text                |
| AAA Large  | ≥ 4.5 | Enhanced large text               |
