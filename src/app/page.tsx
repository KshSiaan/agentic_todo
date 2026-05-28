"use client";

import { useState } from "react";
import Link from "next/link";
import { ModeToggle } from "@/components/core/theme-changer";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { PlusIcon, SearchIcon, SparklesIcon } from "lucide-react";
import { useTodos } from "@/hooks/use-todos";
import { TodoDialog } from "@/components/todo-dialog";
import { TodoCard } from "@/components/todo-card";
import { Todo, CreateTodoInput, UpdateTodoInput } from "@/types/todo";
import { toast } from "sonner";
import AIAgent from "./ai-agent";

export default function Page() {
  const {
    todos,
    loading,
    error,
    create,
    update,
    delete: deleteTodo,
    toggle,
    refetch,
  } = useTodos();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogLoading, setIsDialogLoading] = useState(false);

  // Filter todos based on search and status
  const filteredTodos = todos.filter((todo) => {
    const matchesSearch =
      todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || todo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTodo = async (input: CreateTodoInput) => {
    setIsDialogLoading(true);
    try {
      await create(input);
    } catch (error) {
      // Error is already handled by the hook
    } finally {
      setIsDialogLoading(false);
    }
  };

  const handleUpdateTodo = async (input: CreateTodoInput) => {
    if (!editingTodo) return;
    setIsDialogLoading(true);
    try {
      const updateInput: UpdateTodoInput = {
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate: input.dueDate,
      };
      await update(editingTodo.id, updateInput);
      setEditingTodo(null);
    } catch (error) {
      // Error is already handled by the hook
    } finally {
      setIsDialogLoading(false);
    }
  };

  const handleDeleteTodo = async (id: number) => {
    if (!confirm("Are you sure you want to delete this todo?")) return;
    try {
      await deleteTodo(id);
      toast.success("Todo deleted");
    } catch (error) {
      // Error is already handled by the hook
    }
  };

  const handleToggleTodo = async (id: number) => {
    try {
      await toggle(id);
    } catch (error) {
      // Error is already handled by the hook
    }
  };

  const handleOpenDialog = (todo?: Todo) => {
    if (todo) {
      setEditingTodo(todo);
    } else {
      setEditingTodo(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTodo(null);
    setIsDialogLoading(false);
  };

  return (
    <main className="min-h-dvh relative">
      <ModeToggle />
      <AIAgent onTodosUpdated={refetch} />
      <section className="container flex flex-col justify-start items-start mx-auto py-12 bg-muted min-h-dvh p-4 gap-4 lg:p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Todos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredTodos.length} of {todos.length} todos
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Link href="/ai-chat" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="gap-2 w-full">
                <SparklesIcon className="h-4 w-4" />
                AI Chat
              </Button>
            </Link>
            <Button
              onClick={() => handleOpenDialog()}
              size="lg"
              className="gap-2 w-full sm:w-auto"
            >
              <PlusIcon className="h-4 w-4" />
              Add Todo
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search todos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-md border border-input bg-transparent text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Error State */}
        {error && (
          <div className="w-full bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Content Section */}
        <div className="flex-1 w-full max-h-[calc(100dvh-300px)] overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <Spinner className="h-8 w-8" />
              <p className="text-sm text-muted-foreground">Loading todos...</p>
            </div>
          ) : filteredTodos.length === 0 ? (
            <Empty
              title={
                searchQuery || statusFilter !== "all"
                  ? "No todos found"
                  : "No todos yet"
              }
              description={
                searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first todo to get started"
              }
            />
          ) : (
            filteredTodos.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onEdit={() => handleOpenDialog(todo)}
                onDelete={handleDeleteTodo}
                onToggle={handleToggleTodo}
              />
            ))
          )}
        </div>
      </section>

      {/* Todo Dialog */}
      <TodoDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSubmit={editingTodo ? handleUpdateTodo : handleCreateTodo}
        initialTodo={editingTodo ?? undefined}
        isLoading={isDialogLoading}
      />
    </main>
  );
}
