
# Simple To-Do List

## Project Description
A simple to-do list application for tracking my school assignments and daily tasks. This project is for TCSS 490 at UW Tacoma.

## Technologies
- HTML
- CSS
- JavaScript

## Features
- Add new tasks
- Mark tasks as completed
- Delete tasks
- Save tasks after refreshing the page
- Break down a task into steps with Claude (via helper.py)

## Instructions for Claude Code
- Keep the code simple and beginner-friendly.
- Use HTML, CSS, and JavaScript.
- Do not use external frameworks.
- Make the website clean and easy to use.
- Use localStorage to save tasks.
- Keep a development log in LOG.md.
- Explain major changes.

## Break down feature (Artifact 3)
- helper.py (Python standard library only) serves the app on 127.0.0.1:8765 and runs `claude -p`.
- Claude's only job: task text in, `{"subtasks": [...]}` out. Do not give it more jobs.
- All checking stays in plain code: helper.py cleans the steps, script.js re-checks them.
- Nothing Claude suggests is added until the user clicks "Add steps".
- Always insert Claude's text with textContent, never innerHTML.
- The app must still work with no helper (GitHub Pages): hide the button, change nothing else.
- Tests in tests/ use a fake runner; never call the real claude in tests.
- Run `python3 -m unittest discover -s tests` before committing.

## Testing
- Verify tasks can be added.
- Verify tasks can be completed.
- Verify tasks can be deleted.
- Verify tasks remain after refreshing.
- Verify Break down shows suggestions, and only checked steps are added.
- Verify steps stay indented under their task after refreshing.
- Verify the Break down button is hidden when the page is not served by helper.py.
