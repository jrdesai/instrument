# Git Cheatsheet

Searchable reference for common Git commands inside Instrument. No network calls and no Rust backend — commands are static templates.

## Variable substitution

- **Branch** and **Remote** fields replace `<branch>` and `<remote>` in every listed command when filled. Empty branch leaves `<branch>` visible in the template.
- **Remote** defaults to `origin` and is not persisted (only the branch name is saved as a draft).
- Placeholders such as `<file>`, `<commit>`, `<url>`, and `<tag>` stay in the text for you to substitute manually.

## Categories

Basics, Branching, Remote, History, Undoing, Stashing, Advanced — filter with the pills or combine with search.

## Destructive commands

Entries marked with a warning icon are especially risky (for example force-push, hard reset, `git clean`, or discarding working-tree changes). Always confirm the command and context before running anything copied from the cheatsheet.
