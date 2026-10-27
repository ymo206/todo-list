// Key used to save tasks in localStorage
const STORAGE_KEY = "todoTasks";

// Get the elements we need from the page
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");
const taskCount = document.getElementById("task-count");

// Each task looks like: { id: 123, text: "Do homework", completed: false }
// Steps added by "Break down" also have a parentId: the id of the task they belong to.
let tasks = loadTasks();

// "Break down" only works when the page is opened through helper.py.
// On GitHub Pages the helper isn't there, so the button stays hidden.
let helperAvailable = false;

// Suggestions waiting for me to review, keyed by task id.
// Each looks like: { status: "loading" | "ready" | "error", steps, chosen, notes, error }
const suggestions = {};

// Read tasks from localStorage (returns an empty list if nothing is saved)
function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return [];
  }
  try {
    return JSON.parse(saved);
  } catch (error) {
    // If the saved data is broken, start with an empty list
    return [];
  }
}

// Save the current tasks to localStorage
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// Make an id that is never repeated, even when adding several tasks at once
let lastId = 0;
function newId() {
  lastId = Math.max(Date.now(), lastId + 1);
  return lastId;
}

// Is there a task with this id?
function taskExists(id) {
  return tasks.some(function (task) {
    return task.id === id;
  });
}

// Draw all tasks on the page
function renderTasks() {
  // Clear the list before redrawing it
  taskList.innerHTML = "";

  tasks.forEach(function (task) {
    const item = document.createElement("li");
    item.className = "task-item";
    if (task.completed) {
      item.classList.add("completed");
    }
    // Indent steps under their task (if the task was deleted, show them normally)
    const isStep = task.parentId && taskExists(task.parentId);
    if (isStep) {
      item.classList.add("subtask");
    }

    // Checkbox to mark the task as completed
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Mark task as completed");
    checkbox.addEventListener("change", function () {
      toggleTask(task.id);
    });

    // Task text (textContent keeps user input from being read as HTML)
    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    // Button to delete the task
    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function () {
      deleteTask(task.id);
    });

    item.appendChild(checkbox);
    item.appendChild(text);

    // "Break down" button: only for top-level, unfinished tasks, and only with the helper
    if (helperAvailable && !isStep && !task.completed) {
      const breakButton = document.createElement("button");
      breakButton.className = "break-button";
      const pending = suggestions[task.id];
      const loading = pending && pending.status === "loading";
      breakButton.textContent = loading ? "Thinking\u2026" : "Break down";
      breakButton.disabled = Boolean(pending);
      breakButton.addEventListener("click", function () {
        requestBreakdown(task);
      });
      item.appendChild(breakButton);
    }

    item.appendChild(deleteButton);
    taskList.appendChild(item);

    // Suggested steps waiting for review appear right under the task
    if (suggestions[task.id]) {
      taskList.appendChild(renderSuggestions(task));
    }
  });

  // Show the "No tasks yet" message only when the list is empty
  emptyMessage.style.display = tasks.length === 0 ? "block" : "none";

  // Show how many tasks are left to do
  const remaining = tasks.filter(function (task) {
    return !task.completed;
  }).length;
  taskCount.textContent =
    tasks.length === 0 ? "" : remaining + " of " + tasks.length + " tasks left";
}

// Add a new task
function addTask(text) {
  tasks.push({
    id: newId(),
    text: text,
    completed: false
  });
  saveTasks();
  renderTasks();
}

// ---------- Break down (the part Claude helps with) ----------

// Ask the helper for suggested steps. Claude only suggests; nothing is added
// until I choose steps and click "Add steps".
function requestBreakdown(task) {
  suggestions[task.id] = { status: "loading" };
  renderTasks();

  fetch("/api/breakdown", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: task.text })
  })
    .then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) {
          throw new Error(data.error || "The helper returned an error.");
        }
        return data;
      });
    })
    .then(function (data) {
      // Check the answer again here: never trust its shape blindly
      const steps = Array.isArray(data.subtasks)
        ? data.subtasks.filter(function (step) {
            return typeof step === "string" && step.trim() !== "";
          })
        : [];
      if (steps.length === 0) {
        throw new Error("Claude didn't suggest any usable steps.");
      }
      suggestions[task.id] = {
        status: "ready",
        steps: steps,
        chosen: steps.map(function () { return true; }),
        notes: Array.isArray(data.notes) ? data.notes : []
      };
    })
    .catch(function (error) {
      const message = error instanceof TypeError
        ? "Couldn't reach the helper. Is helper.py still running?"
        : error.message;
      suggestions[task.id] = { status: "error", error: message };
    })
    .then(function () {
      // The task may have been deleted while waiting
      if (!taskExists(task.id)) {
        delete suggestions[task.id];
      }
      renderTasks();
    });
}

// Build the review panel for one task's suggested steps
function renderSuggestions(task) {
  const pending = suggestions[task.id];
  const panel = document.createElement("li");
  panel.className = "suggestions";

  if (pending.status === "loading") {
    panel.textContent = "Asking Claude for steps\u2026";
    panel.setAttribute("aria-live", "polite");
    return panel;
  }

  if (pending.status === "error") {
    const message = document.createElement("p");
    message.className = "suggestions-error";
    message.textContent = pending.error;
    panel.appendChild(message);
    panel.appendChild(makeActions(task, false));
    return panel;
  }

  const heading = document.createElement("p");
  heading.className = "suggestions-heading";
  heading.textContent = "Suggested steps. Uncheck any you don't want.";
  panel.appendChild(heading);

  pending.steps.forEach(function (step, index) {
    const label = document.createElement("label");
    label.className = "suggestion";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = pending.chosen[index];
    box.addEventListener("change", function () {
      pending.chosen[index] = box.checked;
    });
    const text = document.createElement("span");
    text.textContent = step; // textContent: Claude's text is never read as HTML
    label.appendChild(box);
    label.appendChild(text);
    panel.appendChild(label);
  });

  // Show anything the helper had to fix, so I can tell when Claude slipped
  pending.notes.forEach(function (note) {
    const noteText = document.createElement("p");
    noteText.className = "suggestions-note";
    noteText.textContent = note;
    panel.appendChild(noteText);
  });

  panel.appendChild(makeActions(task, true));
  return panel;
}

// "Add steps" and "Dismiss" buttons for the review panel
function makeActions(task, canAdd) {
  const actions = document.createElement("div");
  actions.className = "suggestions-actions";

  if (canAdd) {
    const addButton = document.createElement("button");
    addButton.className = "add-steps-button";
    addButton.textContent = "Add steps";
    addButton.addEventListener("click", function () {
      addSteps(task.id);
    });
    actions.appendChild(addButton);
  }

  const dismissButton = document.createElement("button");
  dismissButton.className = "dismiss-button";
  dismissButton.textContent = canAdd ? "Dismiss" : "Close";
  dismissButton.addEventListener("click", function () {
    delete suggestions[task.id];
    renderTasks();
  });
  actions.appendChild(dismissButton);
  return actions;
}

// Add the chosen steps right after the task (and after any steps it already has)
function addSteps(parentId) {
  const pending = suggestions[parentId];
  const chosen = pending.steps.filter(function (step, index) {
    return pending.chosen[index];
  });
  delete suggestions[parentId];

  let insertAt = tasks.findIndex(function (task) {
    return task.id === parentId;
  }) + 1;
  while (insertAt < tasks.length && tasks[insertAt].parentId === parentId) {
    insertAt++;
  }

  const newSteps = chosen.map(function (step) {
    return { id: newId(), text: step.slice(0, 200), completed: false, parentId: parentId };
  });
  tasks.splice.apply(tasks, [insertAt, 0].concat(newSteps));
  saveTasks();
  renderTasks();
}

// Check whether helper.py is serving this page
function checkHelper() {
  if (location.protocol !== "http:") {
    return; // GitHub Pages (https) or a file opened directly
  }
  fetch("/api/health")
    .then(function (response) {
      return response.ok ? response.json() : null;
    })
    .then(function (data) {
      helperAvailable = Boolean(data && data.ok);
      renderTasks();
    })
    .catch(function () {
      // No helper: the app works exactly as before
    });
}

// Switch a task between completed and not completed
function toggleTask(id) {
  tasks.forEach(function (task) {
    if (task.id === id) {
      task.completed = !task.completed;
    }
  });
  saveTasks();
  renderTasks();
}

// Remove a task from the list (its steps stay, shown as normal tasks)
function deleteTask(id) {
  tasks = tasks.filter(function (task) {
    return task.id !== id;
  });
  delete suggestions[id];
  saveTasks();
  renderTasks();
}

// When the form is submitted, add the task
taskForm.addEventListener("submit", function (event) {
  // Stop the page from reloading
  event.preventDefault();

  const text = taskInput.value.trim();
  if (text === "") {
    return; // Ignore empty tasks
  }

  addTask(text);
  taskInput.value = "";
  taskInput.focus();
});

// Show saved tasks when the page first loads
renderTasks();
checkHelper();
