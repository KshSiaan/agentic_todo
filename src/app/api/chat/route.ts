import {
  streamText,
  tool,
  type UIMessage,
  type InferUITools,
  UIDataTypes,
  stepCountIs,
  smoothStream,
  hasToolCall,
} from "ai";
import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import z from "zod";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const tools = {
  getTodos: tool({
    description: "Get all todos, optionally filtered by status or completion",
    inputSchema: z.object({
      status: z
        .enum(["pending", "in_progress", "completed"])
        .optional()
        .describe("Filter by status"),
      isCompleted: z
        .boolean()
        .optional()
        .describe("Filter by completion status"),
    }),
    execute: async (input) => {
      const params = new URLSearchParams();
      if (input.status) params.append("status", input.status);
      if (input.isCompleted !== undefined)
        params.append("isCompleted", String(input.isCompleted));

      const response = await fetch(
        `${API_BASE}/api/todos?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to fetch todos");
      return await response.json();
    },
  }),

  getTodo: tool({
    description: "Get a specific todo by ID",
    inputSchema: z.object({
      id: z.number().describe("The ID of the todo"),
    }),
    execute: async (input) => {
      const response = await fetch(`${API_BASE}/api/todos/${input.id}`);
      if (!response.ok) throw new Error(`Failed to fetch todo ${input.id}`);
      return await response.json();
    },
  }),

  addTodo: tool({
    description: "Add a new todo item",
    inputSchema: z.object({
      title: z.string().describe("The title of the todo item"),
      description: z
        .string()
        .optional()
        .describe("The description of the todo item"),
      priority: z
        .enum(["low", "medium", "high"])
        .optional()
        .default("medium")
        .describe("The priority of the todo item"),
      dueDate: z
        .string()
        .optional()
        .describe("The due date of the todo item (ISO 8601)"),
    }),
    execute: async (input) => {
      const response = await fetch(`${API_BASE}/api/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error("Failed to create todo");
      return await response.json();
    },
  }),

  updateTodo: tool({
    description:
      "Update an existing todo by title. Find the todo by title and update it.",
    inputSchema: z.object({
      title: z.string().describe("The title of the todo to find and update"),
      newTitle: z.string().optional().describe("New title for the todo"),
      status: z
        .enum(["pending", "in_progress", "completed"])
        .optional()
        .describe("New status"),
      priority: z
        .enum(["low", "medium", "high"])
        .optional()
        .describe("New priority"),
      isCompleted: z.boolean().optional().describe("Mark as completed"),
      description: z.string().optional().describe("New description"),
      dueDate: z
        .string()
        .optional()
        .nullable()
        .describe("New due date (ISO 8601) or null to clear"),
    }),
    execute: async (input) => {
      // First, find the todo by title
      const getTodosResponse = await fetch(`${API_BASE}/api/todos`);
      if (!getTodosResponse.ok) throw new Error("Failed to fetch todos list");
      const todos = await getTodosResponse.json();

      const matchingTodo = todos.find(
        (t: any) =>
          t.title.toLowerCase() === input.title.toLowerCase() ||
          t.title.toLowerCase().includes(input.title.toLowerCase()),
      );

      if (!matchingTodo) {
        throw new Error(`Todo with title "${input.title}" not found`);
      }

      // Build update object with only provided fields
      const updateData: any = {};
      if (input.newTitle) updateData.title = input.newTitle;
      if (input.status) updateData.status = input.status;
      if (input.priority) updateData.priority = input.priority;
      if (input.isCompleted !== undefined) {
        updateData.isCompleted = input.isCompleted;
        updateData.status = input.isCompleted ? "completed" : "pending";
      }
      if (input.description) updateData.description = input.description;
      if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;

      const response = await fetch(`${API_BASE}/api/todos/${matchingTodo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error(`Failed to update todo`);
      const updated = await response.json();
      return {
        success: true,
        message: `Updated todo "${matchingTodo.title}"`,
        todo: updated,
      };
    },
  }),

  deleteTodo: tool({
    description:
      "Delete a todo item by title. Find the todo by title and delete it.",
    inputSchema: z.object({
      title: z.string().describe("The title of the todo to find and delete"),
    }),
    execute: async (input) => {
      // First, find the todo by title
      const getTodosResponse = await fetch(`${API_BASE}/api/todos`);
      if (!getTodosResponse.ok) throw new Error("Failed to fetch todos list");
      const todos = await getTodosResponse.json();

      const matchingTodo = todos.find(
        (t: any) =>
          t.title.toLowerCase() === input.title.toLowerCase() ||
          t.title.toLowerCase().includes(input.title.toLowerCase()),
      );

      if (!matchingTodo) {
        throw new Error(`Todo with title "${input.title}" not found`);
      }

      const response = await fetch(`${API_BASE}/api/todos/${matchingTodo.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(`Failed to delete todo`);
      return {
        success: true,
        message: `Deleted todo "${matchingTodo.title}"`,
      };
    },
  }),
};

export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = body.messages || [];

    if (!Array.isArray(messages)) {
      throw new Error("Messages must be an array");
    }

    // Convert frontend messages to model format
    const modelMessages = messages.map(
      (msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }),
    );

    const result = streamText({
      model: google("gemma-4-31b-it"),
      messages: modelMessages,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: "minimal",
          },
        } satisfies GoogleGenerativeAIProviderOptions,
      },
      experimental_transform: smoothStream({ chunking: "word" }),
      tools,
      system: `You are a helpful AI assistant for a todo list app. Your responsibilities:

      1. **Proactive Todo Creation**: 
        - ALWAYS interpret natural language statements as potential todos
        - When users mention tasks, plans, or activities (e.g., "going to sleep", "need to exercise", "should call mom"), immediately create a todo
        - Don't ask for confirmation - just create the todo and confirm what you did
        - Convert casual statements into clear, actionable todo titles
        - Set appropriate priorities based on context

      2. **Manage Todos**: Create, read, update, and delete todos based on user requests
      3. **Smart Updates**: When updating or deleting todos, ALWAYS:
        - Use getTodos() first to see the current todo list
        - Find the exact todo by its title (case-insensitive matching)
        - Call updateTodo with the title (NOT ID) to modify it
        - Call deleteTodo with the title (NOT ID) to remove it
        - If someone says they have done a task, mark it as completed using updateTodo without asking for confirmation
        - Only ask for confirmation for deleting a todo
        - If a user says "I did X", "I finished X", "Im doing X" or "X is done", find the todo with title X and mark it as completed without asking

      4. **Be Helpful**:
        - Suggest priorities and due dates
        - Help organize and prioritize tasks
        - Provide productivity tips
        - Always confirm actions after executing them

      5. **Communication**: 
        - Be concise and actionable
        - Show the user what you're doing
        - Explain reasoning behind suggestions

      When a user asks to update or delete a specific todo, ALWAYS search for it first by getting the full todo list and matching by title.`,
      stopWhen: hasToolCall("finalAnswer"),
    });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
