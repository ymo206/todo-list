
# Simple To-Do List

A simple web application for keeping track of school assignments and daily tasks.

## Features
- Add new tasks
- Mark tasks as completed
- Delete tasks
- Save tasks automatically
- **Break down** a big task into smaller steps with Claude (when run through `helper.py`)

## Technologies
- HTML
- CSS
- JavaScript
- Python (standard library only) for the local helper
- Claude Code in headless mode (`claude -p`)

## How to Use
Open index.html in a web browser. Type a task and press Enter or click "Add". Check the box to mark a task as completed, and click "Delete" to remove it. Tasks are saved in your browser with localStorage, so they stay after you refresh.

## Break down with Claude (Artifact 3)

Clicking **Break down** next to a task asks Claude for 2 to 6 smaller steps.
I review the suggestions, uncheck any I don't want, and click **Add steps**.
The steps appear indented under the task and work like any other task.

This uses Claude Code (`claude -p`), not the paid API, so it needs a small
local helper:

```bash
python3 helper.py
```

Then open **http://127.0.0.1:8765** (always this exact address: tasks are
saved per address, so `localhost` would show a separate, empty list).
Requires Python 3.10+ and Claude Code installed and logged in.

On GitHub Pages, or if `index.html` is opened directly, the helper isn't
there, so the Break down button is hidden and the app works as before.

### What Claude is responsible for

Given the text of one task (at most 200 characters), return
`{"subtasks": ["step", ...]}`. That is its only job. It runs with no tools
in an empty temporary folder, sees nothing but that one task, and never adds
anything to my list by itself.

### What the code checks

| Step | Done by | Check |
|------|---------|-------|
| Accept the request | `helper.py` | Only from this page (Origin check, JSON only), only on 127.0.0.1, task must be 1 to 200 characters. Bad requests never reach Claude |
| Suggest steps | **Claude** | One `claude -p` call, 120 s timeout |
| Parse the answer | `helper.py` | Unwrap Claude Code's JSON output, strip stray code fences or prose |
| Retry | `helper.py` | One retry if the answer is unusable, then a clear error message |
| Clean the steps | `helper.py` | Strip list markers ("1.", "-"), drop non-text, empty, over-200-character and repeated steps, drop a step that just repeats the task, keep at most 6 |
| Show what was fixed | page | Anything dropped appears as a small grey note, so I can see when Claude slipped |
| Decide | **me** | Nothing is added until I choose steps and click Add steps |
| Display | `script.js` | Steps are inserted with `textContent`, so Claude's text can never run as HTML |
| Record | `helper.py` | Every request, its result, timing and notes go to `.breakdown-log.jsonl` |

### Trade-offs

- **Cost:** one Claude Code call per click, on my course access; no API key.
- **Latency:** a few seconds per breakdown, shown as "Thinking…". Fine for
  an occasional click; too slow to run automatically on every task.
- **Reliability:** Claude can return bad formatting or repeat itself; the
  helper catches that. It can also suggest steps that are just unhelpful,
  which code can't detect. That's why I review before anything is added.
- **Security:** the helper only listens on my own machine and only accepts
  requests from its own page, so another website can't use my Claude access.
  Task text is sent to Anthropic, so I don't break down tasks containing
  private information.

## Tests

```bash
python3 -m unittest discover -s tests -v
```

The tests use a fake Claude, so they never use my Claude Code access.

## About
This project was created for TCSS 490 at the University of Washington Tacoma.

## Development
See LOG.md for the development log and CLAUDE.md for project instructions.
