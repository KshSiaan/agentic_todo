/**
 * Type definitions for Todo application
 */

export interface Todo {
  id: number;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string | null;
  status?: "pending" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  isCompleted?: boolean;
  dueDate?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
