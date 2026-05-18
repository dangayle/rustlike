// Idiomatic TypeScript version - imperative, exception-based, mutable state
type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

type TodoState = {
  todos: Todo[];
  nextId: number;
};

// Simple class-based approach
class TodoList {
  private state: TodoState;

  constructor() {
    this.state = {
      todos: [],
      nextId: 1,
    };
  }

  add(text: string): void {
    if (!text || text.trim().length === 0) {
      throw new Error("Todo text cannot be empty");
    }

    const todo: Todo = {
      id: this.state.nextId,
      text: text.trim(),
      completed: false,
    };

    this.state.todos.push(todo);
    this.state.nextId++;
    console.log(`✓ Added: "${todo.text}" (id: ${todo.id})`);
  }

  find(id: number): Todo | null {
    return this.state.todos.find((t) => t.id === id) ?? null;
  }

  toggle(id: number): void {
    const todo = this.find(id);
    if (!todo) {
      throw new Error(`Todo with id ${id} not found`);
    }
    todo.completed = !todo.completed;
    console.log(`✓ Toggled: "${todo.text}" - completed: ${todo.completed}`);
  }

  remove(id: number): void {
    const index = this.state.todos.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Todo with id ${id} not found`);
    }
    const removed = this.state.todos.splice(index, 1)[0]!;
    console.log(`✓ Removed: "${removed.text}"`);
  }

  getStats(): { completed: number; total: number; remaining: number } {
    const completed = this.state.todos.filter((t) => t.completed).length;
    const total = this.state.todos.length;
    return { completed, total, remaining: total - completed };
  }

  listAll(): void {
    console.log("Current todos:");
    this.state.todos.forEach((todo) => {
      const status = todo.completed ? "✓" : "☐";
      console.log(`  ${status} [${todo.id}] ${todo.text}`);
    });
  }
}

// Demo
console.log("=== Todo App Demo ===\n");

const todos = new TodoList();

// Add todos
todos.add("Learn Rust");
todos.add("Learn TypeScript");
todos.add("Build something cool");

// Try adding empty todo (will throw)
try {
  todos.add("");
} catch (e) {
  console.error(`✗ Error: ${(e as Error).message}`);
}

// Complete a todo
console.log();
todos.toggle(1);

// Try to find non-existent todo
console.log();
const found = todos.find(999);
if (found) {
  console.log(`Found: ${found.text}`);
} else {
  console.log("Todo not found");
}

// Remove a todo
console.log();
todos.remove(2);

// Show stats
console.log();
const stats = todos.getStats();
console.log(`Stats: ${stats.completed}/${stats.total} completed, ${stats.remaining} remaining`);

// List all todos
console.log();
todos.listAll();
