// Key used to save tasks in localStorage
const STORAGE_KEY = "todoTasks";

// Get the elements we need from the page
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");
const taskCount = document.getElementById("task-count");

// Each task looks like: { id: 123, text: "Do homework", completed: false }
let tasks = loadTasks();

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
    item.appendChild(deleteButton);
    taskList.appendChild(item);
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
    id: Date.now(),
    text: text,
    completed: false
  });
  saveTasks();
  renderTasks();
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

// Remove a task from the list
function deleteTask(id) {
  tasks = tasks.filter(function (task) {
    return task.id !== id;
  });
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
