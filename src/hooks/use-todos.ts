/**
 * Custom React hook for managing todos
 * Handles fetching, creating, updating, and deleting todos
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { Todo, CreateTodoInput, UpdateTodoInput } from "@/types/todo";
import {
  fetchTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodoCompletion,
} from "@/lib/api-client";

interface UseTodosResult {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<void>;
  create: (input: CreateTodoInput) => Promise<Todo>;
  update: (id: number, input: UpdateTodoInput) => Promise<Todo>;
  delete: (id: number) => Promise<void>;
  toggle: (id: number) => Promise<Todo>;
}

export function useTodos(): UseTodosResult {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[useTodos] Starting refetch (force=${force})`);
      const data = await fetchTodos();
      console.log(`[useTodos] Fetched ${data.length} todos`);

      if (force) {
        // Force update for mutations - bypass all comparisons
        console.log("[useTodos] Force mode: updating todos without comparison");
        setTodos(data);
      } else {
        // Smart comparison for normal refetches
        setTodos((prev) => {
          // Quick length check
          if (prev.length !== data.length) {
            console.log(
              `[useTodos] Todo count changed: ${prev.length} -> ${data.length}`,
            );
            return data;
          }

          // Compare each todo's key fields
          const changed = prev.some((prevTodo, idx) => {
            const newTodo = data[idx];
            if (!newTodo) return true;
            return (
              prevTodo.id !== newTodo.id ||
              prevTodo.title !== newTodo.title ||
              prevTodo.status !== newTodo.status ||
              prevTodo.isCompleted !== newTodo.isCompleted ||
              prevTodo.priority !== newTodo.priority ||
              prevTodo.description !== newTodo.description ||
              prevTodo.dueDate !== newTodo.dueDate
            );
          });

          if (changed) {
            console.log("[useTodos] Changes detected, updating");
            return data;
          }

          console.log("[useTodos] No changes, using cached data");
          return prev;
        });
      }

      setLoading(false);
      console.log("[useTodos] Refetch completed successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load todos";
      console.error("[useTodos] Error:", message);
      setError(message);
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (input: CreateTodoInput): Promise<Todo> => {
    try {
      setError(null);
      const newTodo = await createTodo(input);
      // Only update state with the new todo
      setTodos((prev) => [newTodo, ...prev]);
      return newTodo;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create todo";
      setError(message);
      throw err;
    }
  }, []);

  const update = useCallback(
    async (id: number, input: UpdateTodoInput): Promise<Todo> => {
      try {
        setError(null);
        const updatedTodo = await updateTodo(id, input);
        // Only update the specific todo that changed
        setTodos((prev) => {
          const index = prev.findIndex((todo) => todo.id === id);
          if (index === -1) return prev;

          const updated = [...prev];
          // Only update if the todo data actually changed
          if (JSON.stringify(updated[index]) !== JSON.stringify(updatedTodo)) {
            updated[index] = updatedTodo;
          }
          return updated;
        });
        return updatedTodo;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update todo";
        setError(message);
        throw err;
      }
    },
    [],
  );

  const remove = useCallback(async (id: number): Promise<void> => {
    try {
      setError(null);
      await deleteTodo(id);
      // Only remove the deleted todo from state
      setTodos((prev) => prev.filter((todo) => todo.id !== id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete todo";
      setError(message);
      throw err;
    }
  }, []);

  const toggle = useCallback(
    async (id: number): Promise<Todo> => {
      const todo = todos.find((t) => t.id === id);
      if (!todo) throw new Error("Todo not found");
      return update(id, { isCompleted: !todo.isCompleted });
    },
    [todos, update],
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    todos,
    loading,
    error,
    refetch,
    create,
    update,
    delete: remove,
    toggle,
  };
}
