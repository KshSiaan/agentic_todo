/**
 * Todo card component displaying individual todo item
 */

"use client";

import { Todo } from "@/types/todo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EditIcon,
  Trash2Icon,
  CheckCircle2Icon,
  Circle,
  MoreVerticalIcon,
} from "lucide-react";

interface TodoCardProps {
  todo: Todo;
  onEdit: (todo: Todo) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
  isLoading?: boolean;
}

const PRIORITY_COLORS = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const STATUS_COLORS = {
  pending: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export function TodoCard({
  todo,
  onEdit,
  onDelete,
  onToggle,
  isLoading = false,
}: TodoCardProps) {
  const formatDate = (date: string) => {
    try {
      const d = new Date(date);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const formatDueDate = (date: string | null) => {
    if (!date) return null;
    try {
      const d = new Date(date);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  return (
    <Card className={`transition-all ${todo.isCompleted ? "opacity-75" : ""}`}>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggle(todo.id)}
                disabled={isLoading}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                {todo.isCompleted ? (
                  <CheckCircle2Icon className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </button>
              <CardTitle
                className={`text-lg ${
                  todo.isCompleted ? "line-through text-muted-foreground" : ""
                }`}
              >
                {todo.title}
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              #{todo.id} • Created {formatDate(todo.createdAt)}
              {todo.dueDate && ` • Due ${formatDueDate(todo.dueDate)}`}
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isLoading}>
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(todo)}>
                <EditIcon className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(todo.id)}
                className="text-destructive"
              >
                <Trash2Icon className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={STATUS_COLORS[todo.status as keyof typeof STATUS_COLORS]}
          >
            {todo.status.replace("_", " ")}
          </Badge>
          <Badge className={PRIORITY_COLORS[todo.priority]}>
            {todo.priority}
          </Badge>
        </div>
      </CardHeader>

      {todo.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {todo.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
