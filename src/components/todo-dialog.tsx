import { useState, useEffect } from "react";
import { Todo, CreateTodoInput } from "@/types/todo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

interface TodoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateTodoInput) => Promise<void>;
  initialTodo?: Todo;
  isLoading?: boolean;
}

export function TodoDialog({
  open,
  onOpenChange,
  onSubmit,
  initialTodo,
  isLoading = false,
}: TodoDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (initialTodo) {
      setTitle(initialTodo.title);
      setDescription(initialTodo.description || "");
      setPriority(initialTodo.priority);
      setDueDate(initialTodo.dueDate ? initialTodo.dueDate.split("T")[0] : "");
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
    }
  }, [initialTodo, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        priority: priority as "low" | "medium" | "high",
        dueDate: dueDate || undefined,
      });

      toast.success(initialTodo ? "Todo updated" : "Todo created");
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Operation failed";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialTodo ? "Edit Todo" : "Create Todo"}</DialogTitle>
          <DialogDescription>
            {initialTodo
              ? "Update your todo details"
              : "Add a new todo to your list"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter todo title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter todo description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Spinner className="h-4 w-4" />}
              {initialTodo ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
