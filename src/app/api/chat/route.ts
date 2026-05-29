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
import {
  fetchWithRetry,
  serializeError,
  isRetryableError,
} from "@/lib/error-handler";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Logging utility
function logToolCall(toolName: string, input: any, attempt: number = 1) {
  console.log(
    `[Tool:${toolName}] Executing (attempt ${attempt}):`,
    JSON.stringify(input),
  );
}

function logToolError(toolName: string, error: any, attempt: number = 1) {
  console.error(
    `[Tool:${toolName}] Error (attempt ${attempt}):`,
    error instanceof Error ? error.message : String(error),
  );
}

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
      try {
        logToolCall("getTodos", input);
        const params = new URLSearchParams();
        if (input.status) params.append("status", input.status);
        if (input.isCompleted !== undefined)
          params.append("isCompleted", String(input.isCompleted));

        const url = `${API_BASE}/api/todos?${params.toString()}`;
        const response = await fetchWithRetry(url, {
          retryOptions: {
            maxAttempts: 3,
            initialDelayMs: 100,
            maxDelayMs: 2000,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch todos: HTTP ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();
        console.log(`[Tool:getTodos] Success: fetched ${data.length} todos`);
        return data;
      } catch (error) {
        logToolError("getTodos", error);
        throw error;
      }
    },
  }),

  getTodo: tool({
    description: "Get a specific todo by ID",
    inputSchema: z.object({
      id: z.number().describe("The ID of the todo"),
    }),
    execute: async (input) => {
      try {
        logToolCall("getTodo", input);
        const response = await fetchWithRetry(
          `${API_BASE}/api/todos/${input.id}`,
          {
            retryOptions: { maxAttempts: 3 },
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch todo ${input.id}: HTTP ${response.status}`,
          );
        }

        const data = await response.json();
        console.log(`[Tool:getTodo] Success: fetched todo ${input.id}`);
        return data;
      } catch (error) {
        logToolError("getTodo", error);
        throw error;
      }
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
      try {
        logToolCall("addTodo", input);
        const response = await fetchWithRetry(`${API_BASE}/api/todos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          retryOptions: { maxAttempts: 3 },
        });

        if (!response.ok) {
          throw new Error(`Failed to create todo: HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log(`[Tool:addTodo] Success: created todo "${input.title}"`);
        return data;
      } catch (error) {
        logToolError("addTodo", error);
        throw error;
      }
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
      try {
        logToolCall("updateTodo", input);

        // First, find the todo by title with retry
        const getTodosResponse = await fetchWithRetry(`${API_BASE}/api/todos`, {
          retryOptions: { maxAttempts: 3 },
        });

        if (!getTodosResponse.ok) {
          throw new Error("Failed to fetch todos list");
        }

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

        const response = await fetchWithRetry(
          `${API_BASE}/api/todos/${matchingTodo.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
            retryOptions: { maxAttempts: 3 },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to update todo: HTTP ${response.status}`);
        }

        const updated = await response.json();
        console.log(
          `[Tool:updateTodo] Success: updated todo "${matchingTodo.title}"`,
        );
        return {
          success: true,
          message: `Updated todo "${matchingTodo.title}"`,
          todo: updated,
        };
      } catch (error) {
        logToolError("updateTodo", error);
        throw error;
      }
    },
  }),

  deleteTodo: tool({
    description:
      "Delete a todo item by title. Find the todo by title and delete it.",
    inputSchema: z.object({
      title: z.string().describe("The title of the todo to find and delete"),
    }),
    execute: async (input) => {
      try {
        logToolCall("deleteTodo", input);

        // First, find the todo by title with retry
        const getTodosResponse = await fetchWithRetry(`${API_BASE}/api/todos`, {
          retryOptions: { maxAttempts: 3 },
        });

        if (!getTodosResponse.ok) {
          throw new Error("Failed to fetch todos list");
        }

        const todos = await getTodosResponse.json();

        const matchingTodo = todos.find(
          (t: any) =>
            t.title.toLowerCase() === input.title.toLowerCase() ||
            t.title.toLowerCase().includes(input.title.toLowerCase()),
        );

        if (!matchingTodo) {
          throw new Error(`Todo with title "${input.title}" not found`);
        }

        const response = await fetchWithRetry(
          `${API_BASE}/api/todos/${matchingTodo.id}`,
          {
            method: "DELETE",
            retryOptions: { maxAttempts: 3 },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to delete todo: HTTP ${response.status}`);
        }

        console.log(
          `[Tool:deleteTodo] Success: deleted todo "${matchingTodo.title}"`,
        );
        return {
          success: true,
          message: `Deleted todo "${matchingTodo.title}"`,
        };
      } catch (error) {
        logToolError("deleteTodo", error);
        throw error;
      }
    },
  }),
};

export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    console.log(`[Chat:${requestId}] Starting request`);

    const body = await request.json();
    const messages = body.messages || [];

    if (!Array.isArray(messages)) {
      throw new Error("Messages must be an array");
    }

    console.log(`[Chat:${requestId}] Received ${messages.length} messages`);

    // Convert frontend messages to model format
    const modelMessages = messages.map(
      (msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }),
    );

    console.log(
      `[Chat:${requestId}] Starting streamText with model: gemma-4-31b-it`,
    );

    try {
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

      console.log(`[Chat:${requestId}] Stream created successfully`);
      return result.toUIMessageStreamResponse();
    } catch (aiError) {
      const elapsedTime = Date.now() - startTime;
      console.error(
        `[Chat:${requestId}] AI SDK Error after ${elapsedTime}ms:`,
        {
          name: aiError instanceof Error ? aiError.name : "Unknown",
          message: aiError instanceof Error ? aiError.message : String(aiError),
          isRetryable: isRetryableError(aiError),
        },
      );

      // Check if it's a specific AI SDK error
      if (
        aiError instanceof Error &&
        (aiError.name === "AI_RetryError" || aiError.message.includes("500"))
      ) {
        console.error(
          `[Chat:${requestId}] Google API server error - these are typically transient and may resolve on retry`,
        );
        console.error(
          `[Chat:${requestId}] Full error:`,
          serializeError(aiError),
        );
      }

      throw aiError;
    }
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(
      `[Chat:${requestId}] Fatal error after ${elapsedTime}ms:`,
      serializeError(error),
    );

    // Return detailed error info for debugging
    const errorResponse = {
      error: "Chat request failed",
      details: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.name : "UnknownError",
      requestId,
      timestamp: new Date().toISOString(),
    };

    console.error(`[Chat:${requestId}] Responding with:`, errorResponse);

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
      },
    });
  }
}
