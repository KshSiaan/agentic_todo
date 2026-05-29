/**
 * API client utilities for todo operations
 * Handles all REST API calls to the backend
 */

import { Todo, CreateTodoInput, UpdateTodoInput } from "@/types/todo";
import { fetchWithRetry } from "@/lib/error-handler";

const API_BASE = "/api/todos";

/**
 * Error handler utility
 */
function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

/**
 * Fetch all todos with optional filtering
 */
export async function fetchTodos(params?: {
  status?: string;
  isCompleted?: boolean;
}): Promise<Todo[]> {
  try {
    const url = new URL(API_BASE, window.location.origin);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.isCompleted !== undefined) {
      url.searchParams.set("isCompleted", String(params.isCompleted));
    }

    console.log(`[api-client] Fetching todos from: ${url.toString()}`);

    const response = await fetchWithRetry(url.toString(), {
      retryOptions: {
        maxAttempts: 3,
        initialDelayMs: 100,
        maxDelayMs: 2000,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to fetch todos: ${response.statusText}` +
          (data.details ? ` - ${data.details}` : ""),
      );
    }

    const data = await response.json();
    console.log(
      `[api-client] Fetched ${Array.isArray(data) ? data.length : "unknown"} todos`,
      data,
    );
    return data;
  } catch (error) {
    console.error("fetchTodos error:", error);
    throw error;
  }
}

/**
 * Fetch a single todo by ID
 */
export async function fetchTodoById(id: number): Promise<Todo> {
  try {
    const response = await fetch(`${API_BASE}/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch todo: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("fetchTodoById error:", error);
    throw error;
  }
}

/**
 * Create a new todo
 */
export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create todo");
    }

    return await response.json();
  } catch (error) {
    console.error("createTodo error:", error);
    throw error;
  }
}

/**
 * Update an existing todo
 */
export async function updateTodo(
  id: number,
  input: UpdateTodoInput,
): Promise<Todo> {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update todo");
    }

    return await response.json();
  } catch (error) {
    console.error("updateTodo error:", error);
    throw error;
  }
}

/**
 * Delete a todo
 */
export async function deleteTodo(id: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete todo");
    }
  } catch (error) {
    console.error("deleteTodo error:", error);
    throw error;
  }
}

/**
 * Toggle todo completion status
 */
export async function toggleTodoCompletion(
  id: number,
  isCompleted: boolean,
): Promise<Todo> {
  return updateTodo(id, { isCompleted: !isCompleted });
}

/**
 * Update todo status
 */
export async function updateTodoStatus(
  id: number,
  status: "pending" | "in_progress" | "completed",
): Promise<Todo> {
  return updateTodo(id, { status });
}

/**
 * Update todo priority
 */
export async function updateTodoPriority(
  id: number,
  priority: "low" | "medium" | "high",
): Promise<Todo> {
  return updateTodo(id, { priority });
}
