
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
