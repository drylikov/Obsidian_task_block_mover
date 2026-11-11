
# Task Block Mover

Task Block Mover is an Obsidian community plugin that moves markdown task blocks from the active note to another markdown note in your vault.

The plugin adds one editor command:

- `Move task block(s) to note`

It uses a fuzzy note picker to choose the destination note, preserves the selected task block text exactly, writes the destination first, and only removes the source content after the destination update succeeds.

## Settings

Task Block Mover includes one plugin setting:

- `Enable debug logs`: writes Task Block Mover diagnostic logs to the Obsidian developer console

Leave it off for normal use. Turn it on when debugging command behavior.

## Install dependencies

```bash
npm install
```

## Build

```bash
npm run build
```

Install or update the plugin in a vault:

```bash
npm run install:vault -- /path/to/your/vault
```

For local development, rebuild the root `main.js` on change:

```bash
npm run dev
```

## Quality checks

```bash
npm run test
npm run build
```

You can also run the full project check:

```bash
npm run check
```

## Install into an Obsidian vault for testing

1. Run `npm run install:vault -- /path/to/your/vault`.
2. The script builds the plugin, then copies `dist/main.js`, `dist/manifest.json`, and `dist/styles.css` into `.obsidian/plugins/task-block-mover/` inside that vault.
3. Enable `Task Block Mover` in Obsidian’s Community Plugins settings.

The install script expects the vault root path, not the plugin directory path. It will fail if the target directory does not contain `.obsidian/`.

## Command behavior

### No selection

- If the cursor is on a task line, the plugin moves that task block.
- If the cursor is inside indented content belonging to a task block, the plugin moves the enclosing task block.
- If the cursor is outside any task block, the plugin shows a notice and does nothing.

### Selection

- The plugin looks at the touched line range.
- It finds all task blocks touched by the selection.
- It moves the full task blocks, not partial line fragments.
- It ignores non-task lines that are not part of any touched task block.
- It avoids duplicating nested blocks when a parent block is already included.

### Destination behavior

- The plugin opens a fuzzy picker for markdown files in the vault.
- It refuses to move tasks into the same note.
- If the destination already contains tasks, the moved blocks are inserted immediately above the first existing task line.
- If the destination contains no tasks, the moved blocks are appended to the bottom with exactly one blank line separator when needed.

### Source cleanup

- The plugin removes moved blocks from bottom to top.
- It collapses obvious excessive blank lines caused by the move.
- It preserves unrelated content and task text as much as possible.

## Examples

### Move a parent task with notes and children

```markdown
- [ ] Parent task
  notes about it
  more notes
  - [ ] Child task
    child notes
```

If the cursor is on `Parent task`, the full subtree above moves together.

### Move only the child task

```markdown
- [ ] Parent task
  - [ ] Child task
    child notes
```

If the cursor is on `Child task`, only the child subtree moves.

### Move multiple blocks from a selection

Select a range that touches several task blocks. The plugin moves the full touched task blocks and ignores unrelated non-task lines in the selection.

## Files

- `manifest.json`: Obsidian plugin metadata
- `src/main.ts`: plugin entrypoint and command wiring
- `src/core/`: file picker, task-block parsing, and destination insertion helpers
- `src/__tests__/`: unit tests for block detection and destination insertion
