export type Category =
  | "Basics"
  | "Branching"
  | "Remote"
  | "History"
  | "Undoing"
  | "Stashing"
  | "Advanced";

export interface GitCommand {
  id: string;
  /** Template — may contain `<branch>`, `<remote>`, `<file>`, `<commit>`, etc. */
  command: string;
  description: string;
  category: Category;
  /** Destructive or hard-to-undo operations */
  dangerous?: boolean;
}

export const CATEGORIES: Category[] = [
  "Basics",
  "Branching",
  "Remote",
  "History",
  "Undoing",
  "Stashing",
  "Advanced",
];

export const GIT_COMMANDS: GitCommand[] = [
  // ── Basics ────────────────────────────────────────────────────────────────
  {
    id: "init",
    category: "Basics",
    command: "git init",
    description: "Initialise a new repository in the current directory",
  },
  {
    id: "clone",
    category: "Basics",
    command: "git clone <url>",
    description: "Clone a remote repository locally",
  },
  {
    id: "status",
    category: "Basics",
    command: "git status",
    description: "Show working tree status",
  },
  {
    id: "add-file",
    category: "Basics",
    command: "git add <file>",
    description: "Stage a specific file",
  },
  {
    id: "add-all",
    category: "Basics",
    command: "git add .",
    description: "Stage all changes in the current directory",
  },
  {
    id: "commit",
    category: "Basics",
    command: 'git commit -m "<message>"',
    description: "Commit staged changes with a message",
  },
  {
    id: "commit-amend",
    category: "Basics",
    command: "git commit --amend",
    description: "Amend the most recent commit (message or staged changes)",
  },
  {
    id: "diff",
    category: "Basics",
    command: "git diff",
    description: "Show unstaged changes",
  },
  {
    id: "diff-staged",
    category: "Basics",
    command: "git diff --staged",
    description: "Show staged changes not yet committed",
  },

  // ── Branching ─────────────────────────────────────────────────────────────
  {
    id: "branch-list",
    category: "Branching",
    command: "git branch",
    description: "List local branches",
  },
  {
    id: "branch-list-all",
    category: "Branching",
    command: "git branch -a",
    description: "List all branches including remotes",
  },
  {
    id: "branch-create",
    category: "Branching",
    command: "git branch <branch>",
    description: "Create a new branch without switching to it",
  },
  {
    id: "checkout-b",
    category: "Branching",
    command: "git checkout -b <branch>",
    description: "Create and switch to a new branch",
  },
  {
    id: "switch-c",
    category: "Branching",
    command: "git switch -c <branch>",
    description: "Create and switch to a new branch (modern syntax)",
  },
  {
    id: "checkout",
    category: "Branching",
    command: "git checkout <branch>",
    description: "Switch to an existing branch",
  },
  {
    id: "switch",
    category: "Branching",
    command: "git switch <branch>",
    description: "Switch to an existing branch (modern syntax)",
  },
  {
    id: "merge",
    category: "Branching",
    command: "git merge <branch>",
    description: "Merge a branch into the current branch",
  },
  {
    id: "merge-no-ff",
    category: "Branching",
    command: "git merge --no-ff <branch>",
    description: "Merge preserving a merge commit (no fast-forward)",
  },
  {
    id: "branch-delete",
    category: "Branching",
    command: "git branch -d <branch>",
    description: "Delete a fully merged branch",
  },
  {
    id: "branch-rename",
    category: "Branching",
    command: "git branch -m <branch>",
    description: "Rename the current branch",
  },

  // ── Remote ────────────────────────────────────────────────────────────────
  {
    id: "remote-list",
    category: "Remote",
    command: "git remote -v",
    description: "List remotes with their URLs",
  },
  {
    id: "remote-add",
    category: "Remote",
    command: "git remote add <remote> <url>",
    description: "Add a new remote",
  },
  {
    id: "fetch",
    category: "Remote",
    command: "git fetch <remote>",
    description: "Download changes from a remote without merging",
  },
  {
    id: "fetch-all",
    category: "Remote",
    command: "git fetch --all",
    description: "Fetch from all configured remotes",
  },
  {
    id: "pull",
    category: "Remote",
    command: "git pull <remote> <branch>",
    description: "Fetch and merge changes from a remote branch",
  },
  {
    id: "push",
    category: "Remote",
    command: "git push <remote> <branch>",
    description: "Push local branch to remote",
  },
  {
    id: "push-upstream",
    category: "Remote",
    command: "git push -u <remote> <branch>",
    description: "Push and set the upstream tracking branch",
  },
  {
    id: "push-force",
    category: "Remote",
    command: "git push --force <remote> <branch>",
    description: "Force-push, overwriting remote history",
    dangerous: true,
  },
  {
    id: "push-force-lease",
    category: "Remote",
    command: "git push --force-with-lease <remote> <branch>",
    description: "Force-push only if remote has not diverged (safer)",
  },

  // ── History ───────────────────────────────────────────────────────────────
  {
    id: "log",
    category: "History",
    command: "git log",
    description: "Show full commit history",
  },
  {
    id: "log-oneline",
    category: "History",
    command: "git log --oneline",
    description: "Show compact one-line commit history",
  },
  {
    id: "log-graph",
    category: "History",
    command: "git log --oneline --graph --all",
    description: "Visual branch and merge history",
  },
  {
    id: "log-n",
    category: "History",
    command: "git log -n <number>",
    description: "Show the last N commits",
  },
  {
    id: "log-author",
    category: "History",
    command: 'git log --author="<name>"',
    description: "Filter commits by author",
  },
  {
    id: "show",
    category: "History",
    command: "git show <commit>",
    description: "Show details of a specific commit",
  },
  {
    id: "blame",
    category: "History",
    command: "git blame <file>",
    description: "Show who last modified each line of a file",
  },
  {
    id: "diff-branch",
    category: "History",
    command: "git diff <branch>",
    description: "Show differences between current branch and another",
  },

  // ── Undoing ───────────────────────────────────────────────────────────────
  {
    id: "restore-staged",
    category: "Undoing",
    command: "git restore --staged <file>",
    description: "Unstage a file, keeping working directory changes",
  },
  {
    id: "restore-file",
    category: "Undoing",
    command: "git restore <file>",
    description: "Discard working directory changes to a file",
    dangerous: true,
  },
  {
    id: "restore-all",
    category: "Undoing",
    command: "git restore .",
    description: "Discard all working directory changes",
    dangerous: true,
  },
  {
    id: "reset-soft",
    category: "Undoing",
    command: "git reset --soft HEAD~1",
    description: "Undo last commit, keep changes staged",
  },
  {
    id: "reset-mixed",
    category: "Undoing",
    command: "git reset HEAD~1",
    description: "Undo last commit, keep changes unstaged",
  },
  {
    id: "reset-hard",
    category: "Undoing",
    command: "git reset --hard HEAD~1",
    description: "Undo last commit and discard all changes",
    dangerous: true,
  },
  {
    id: "revert",
    category: "Undoing",
    command: "git revert <commit>",
    description: "Create a new commit that undoes a specific commit (safe)",
  },
  {
    id: "clean",
    category: "Undoing",
    command: "git clean -fd",
    description: "Remove all untracked files and directories",
    dangerous: true,
  },

  // ── Stashing ──────────────────────────────────────────────────────────────
  {
    id: "stash",
    category: "Stashing",
    command: "git stash",
    description: "Stash current uncommitted changes",
  },
  {
    id: "stash-msg",
    category: "Stashing",
    command: 'git stash push -m "<message>"',
    description: "Stash with a descriptive name",
  },
  {
    id: "stash-list",
    category: "Stashing",
    command: "git stash list",
    description: "List all stashes",
  },
  {
    id: "stash-pop",
    category: "Stashing",
    command: "git stash pop",
    description: "Apply the most recent stash and remove it",
  },
  {
    id: "stash-apply",
    category: "Stashing",
    command: "git stash apply stash@{0}",
    description: "Apply a specific stash without removing it",
  },
  {
    id: "stash-drop",
    category: "Stashing",
    command: "git stash drop stash@{0}",
    description: "Delete a specific stash",
  },
  {
    id: "stash-branch",
    category: "Stashing",
    command: "git stash branch <branch>",
    description: "Create a branch from a stash",
  },

  // ── Advanced ──────────────────────────────────────────────────────────────
  {
    id: "rebase",
    category: "Advanced",
    command: "git rebase <branch>",
    description: "Rebase current branch onto another branch",
  },
  {
    id: "rebase-i",
    category: "Advanced",
    command: "git rebase -i HEAD~<number>",
    description: "Interactive rebase — reorder, squash, or edit commits",
  },
  {
    id: "rebase-abort",
    category: "Advanced",
    command: "git rebase --abort",
    description: "Abort an in-progress rebase",
  },
  {
    id: "cherry-pick",
    category: "Advanced",
    command: "git cherry-pick <commit>",
    description: "Apply a specific commit onto the current branch",
  },
  {
    id: "tag",
    category: "Advanced",
    command: "git tag <tag>",
    description: "Create a lightweight tag at the current commit",
  },
  {
    id: "tag-annotated",
    category: "Advanced",
    command: 'git tag -a <tag> -m "<message>"',
    description: "Create an annotated tag with a message",
  },
  {
    id: "submodule-init",
    category: "Advanced",
    command: "git submodule update --init",
    description: "Initialise and fetch all submodules",
  },
  {
    id: "worktree-add",
    category: "Advanced",
    command: "git worktree add <path> <branch>",
    description: "Check out a branch in a separate directory",
  },
  {
    id: "bisect-start",
    category: "Advanced",
    command: "git bisect start",
    description: "Start a binary search to find a bug-introducing commit",
  },
];
