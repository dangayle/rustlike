import { Result, Ok, Err, Option, iter } from "rustlike";

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

type TodoState = {
  todos: Todo[];
  nextId: number;
};

// Data structures (plain objects - Rust "structs")
function createTodoList(): TodoState {
  return {
    todos: [],
    nextId: 1,
  };
}

function createTodo(id: number, text: string): Todo {
  return {
    id,
    text,
    completed: false,
  };
}

// Behavior (pure functions - Rust "impl" blocks)

// Add a todo, returns Result with new state and the added todo
function addTodo(state: TodoState, text: string): Result<{ state: TodoState; todo: Todo }, string> {
  if (!text || text.trim().length === 0) {
    return Err("Todo text cannot be empty");
  }

  const todo = createTodo(state.nextId, text.trim());

  const newState = {
    todos: [...state.todos, todo],
    nextId: state.nextId + 1,
  };

  return Ok({ state: newState, todo });
}

// Find a todo by id using iter().find() — returns Option<Todo>
function findTodo(state: TodoState, id: number): Option<Todo> {
  return iter(state.todos).find((t) => t.id === id);
}

// Toggle completion status, returns Result with new state
function toggleTodo(
  state: TodoState,
  id: number,
): Result<{ state: TodoState; todo: Todo }, string> {
  return findTodo(state, id)
    .okOr(`Todo with id ${id} not found`)
    .map((todo) => {
      const newTodos = state.todos.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      );
      return {
        state: { ...state, todos: newTodos },
        todo: { ...todo, completed: !todo.completed },
      };
    });
}

// Remove a todo, returns Result with new state and removed todo
function removeTodo(
  state: TodoState,
  id: number,
): Result<{ state: TodoState; todo: Todo }, string> {
  return findTodo(state, id)
    .okOr(`Todo with id ${id} not found`)
    .map((todo) => {
      const newState = {
        ...state,
        todos: state.todos.filter((t) => t.id !== id),
      };
      return { state: newState, todo };
    });
}

// Get stats using mapOr for default values
function getStats(state: TodoState): { completed: number; total: number; remaining: number } {
  const completed = iter(state.todos)
    .filter((t) => t.completed)
    .count();
  const total = iter(state.todos).count();
  return { completed, total, remaining: total - completed };
}

// Demo usage
console.log("=== Todo App Demo ===\n");

let state = createTodoList();

// Add todos - thread state through operations
state = addTodo(state, "Learn Rust").match({
  ok: ({ state: newState, todo }) => {
    console.log(`Added: "${todo.text}" (id: ${todo.id})`);
    return newState;
  },
  err: (e) => {
    console.error(`Error: ${e}`);
    return state;
  },
});

state = addTodo(state, "Learn TypeScript").match({
  ok: ({ state: newState, todo }) => {
    console.log(`Added: "${todo.text}" (id: ${todo.id})`);
    return newState;
  },
  err: (e) => {
    console.error(`Error: ${e}`);
    return state;
  },
});

state = addTodo(state, "Build something cool").match({
  ok: ({ state: newState, todo }) => {
    console.log(`Added: "${todo.text}" (id: ${todo.id})`);
    return newState;
  },
  err: (e) => {
    console.error(`Error: ${e}`);
    return state;
  },
});

// Try adding empty todo
console.log();
addTodo(state, "").match({
  ok: ({ todo }) => console.log(`Added: "${todo.text}"`),
  err: (e) => console.error(`Error: ${e}`),
});

// Complete a todo
console.log();
state = toggleTodo(state, 1).match({
  ok: ({ state: newState, todo }) => {
    console.log(`Toggled: "${todo.text}" - completed: ${todo.completed}`);
    return newState;
  },
  err: (e) => {
    console.error(`Error: ${e}`);
    return state;
  },
});

// Use mapOr to get a display string for a found/not-found todo
console.log();
const display999 = findTodo(state, 999).mapOr("Todo not found", (t) => `Found: ${t.text}`);
console.log(display999);

const display1 = findTodo(state, 1).mapOr("Todo not found", (t) => `Found: ${t.text}`);
console.log(display1);

// Use mapOrElse for lazy default computation
const summary = findTodo(state, 999).mapOrElse(
  () => `No todo with id 999 among ${state.todos.length} todos`,
  (t) => `"${t.text}" (${t.completed ? "done" : "pending"})`,
);
console.log(summary);

// Remove a todo
console.log();
state = removeTodo(state, 2).match({
  ok: ({ state: newState, todo }) => {
    console.log(`Removed: "${todo.text}"`);
    return newState;
  },
  err: (e) => {
    console.error(`Error: ${e}`);
    return state;
  },
});

// Show stats
console.log();
const stats = getStats(state);
console.log(`Stats: ${stats.completed}/${stats.total} completed, ${stats.remaining} remaining`);

// List all todos using iter
console.log();
console.log("Current todos:");
iter(state.todos).forEach((todo) => {
  const status = todo.completed ? "[x]" : "[ ]";
  console.log(`  ${status} [${todo.id}] ${todo.text}`);
});
