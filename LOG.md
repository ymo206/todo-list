
# Development Log – Simple To-Do List

## October 18, 2026

### Project Planning
I decided to create a simple to-do list app for my TCSS 490 Artifact 2. I wanted something that I could use to keep track of my school assignments and daily tasks.

### Repository Setup
- Created a public GitHub repository named todo-list.
- Added CLAUDE.md with the project description and instructions.
- Used GitHub commits to track my changes.

### Planned Features
- Add tasks to a list.
- Mark tasks as completed.
- Delete tasks.
- Save tasks so they remain after refreshing the page.

### Next Steps
- Build the application using Claude Code.
- Test the features to make sure they work.
- Update the log with changes and test results.
- Add the completed project to my portfolio.

## October 19, 2026

### Building the Application (with Claude Code)
Claude Code read CLAUDE.md, README.md, and LOG.md, then built the app using only HTML, CSS, and JavaScript (no frameworks or libraries).

Files created:
- **index.html** – Page structure: a title, a form with a text box and "Add" button, an empty list for tasks, a "No tasks yet" message, and a task counter.
- **style.css** – Clean card layout centered on the page. Completed tasks are crossed out and grayed. A media query stacks the input and button on screens 480px wide or smaller so the app works on phones.
- **script.js** – All of the app logic:
  - Tasks are stored in an array of objects: `{ id, text, completed }`.
  - `addTask`, `toggleTask`, and `deleteTask` change the array, then call `saveTasks()` and `renderTasks()`.
  - `saveTasks()` writes the array to localStorage as JSON; `loadTasks()` reads it back when the page opens (and starts with an empty list if the saved data is missing or broken).
  - `renderTasks()` redraws the list, shows/hides the empty message, and updates the "X of Y tasks left" counter.
  - Empty or whitespace-only tasks are ignored.
  - Task text is inserted with `textContent` instead of `innerHTML`, so typing something like `<b>hi</b>` shows as plain text instead of being run as HTML.

Files updated:
- **README.md** – Replaced "Once the application is built" with actual usage instructions.

### Testing
Tested in a real Chromium browser with an automated Playwright script. All checks passed:

| Test | Result |
|------|--------|
| "No tasks yet" message shows when list is empty | Pass |
| Clicking "Add" with an empty box does not add a task | Pass |
| Tasks can be added (Enter key and Add button) | Pass |
| HTML typed into a task is shown as plain text | Pass |
| Task can be marked completed (crossed out, counter updates) | Pass |
| Tasks and completed state remain after refreshing | Pass |
| Tasks can be deleted | Pass |
| Deleted task stays deleted after refreshing | Pass |
| No horizontal scrolling at phone width (375px) | Pass |
| No JavaScript errors in the console | Pass |

Also checked screenshots at desktop (1200px) and phone (375px) widths to confirm the layout looks clean.

### Next Steps
- Test the app manually in my own browser.
- Add the completed project to my portfolio.

## October 27, 2026 – Artifact 3: putting Claude inside the app

### Plan
Artifact 3 asks for a model that does real work every time the feature runs.
I extended this app instead of starting a new project. Feature: a
**Break down** button that turns a vague task ("CS 490 artifact 3") into
smaller steps I can check off.

### Decisions
- **Claude Code, not the API.** The API costs money and a key can't be kept
  secret in a GitHub Pages site. So a small local Python helper (`helper.py`)
  serves the app and runs `claude -p` when I click the button.
- **Claude suggests, I decide.** Claude only returns a list of steps. Code
  cleans them, and nothing is added until I choose which ones to keep.
- **Small, checkable output.** Claude returns `{"subtasks": [...]}`; the helper
  rejects anything that doesn't fit and shows what it dropped. That way I can
  tell whether a bad result came from Claude or from my code.
- **Still works on GitHub Pages.** Without the helper, the button is hidden.

### What changed
- New `helper.py`: local server (127.0.0.1 only), one `/api/breakdown`
  endpoint, one retry, cleaning rules, request log in `.breakdown-log.jsonl`.
- `script.js`: Break down button, review panel, steps saved with a
  `parentId` and shown indented. Ids now come from `newId()` so several steps
  added at once never share an id (`Date.now()` alone could repeat).
- `style.css`: styles for steps and the review panel, visible keyboard focus,
  buttons wrap on phones.
- New `tests/test_helper.py`: 20 tests with a fake Claude, including the
  server itself and requests from another website being refused.

### Testing
First version generated with Claude in a claude.ai chat, then tested with a
stand-in for the `claude` command (it returns a fixed answer).

| Test | Result |
|------|--------|
| 20 unit and server tests | Pass |
| Button appears when served by helper.py | Pass |
| Button shows "Thinking…" while waiting | Pass |
| "1." prefix stripped and repeated step dropped, with a note shown | Pass |
| Unchecked step is not added | Pass |
| Steps indented under their task, still there after refresh | Pass |
| No horizontal scroll at 375px | Pass |
| Button hidden without helper (file opened directly) | Pass |
| Invalid answer: one retry, then a clear error, logged | Pass |
| No JavaScript errors | Pass |

Problems found while testing: the stand-in's first version produced invalid
JSON. That turned out to be useful, because it showed the retry and error
message working. I also changed the startup message to give
`http://127.0.0.1:8765`, since tasks are saved per address.

### Not yet verified
Not yet run with the real `claude -p`. The helper expects Claude Code's
`--output-format json` output to have a `result` field; if it doesn't, it
falls back to reading the raw text.

### Next steps
- Run it with real Claude Code on my actual tasks and record what happens.
- Note how long breakdowns take and whether the steps are actually useful.
- Update the Artifact 3 card on my portfolio.

