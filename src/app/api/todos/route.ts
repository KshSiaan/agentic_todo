import { db, todosTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/todos
 * Retrieve all todos with optional filtering
 */
export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    console.log(`[GET /api/todos:${requestId}] Request started`);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const isCompleted = searchParams.get("isCompleted");

    if (status) {
      console.log(
        `[GET /api/todos:${requestId}] Filtering by status: ${status}`,
      );
    }
    if (isCompleted) {
      console.log(
        `[GET /api/todos:${requestId}] Filtering by isCompleted: ${isCompleted}`,
      );
    }

    let query: any = db.select().from(todosTable);

    // Apply filters if provided
    if (status) {
      query = query.where(eq(todosTable.status, status));
    }
    if (isCompleted) {
      query = query.where(eq(todosTable.isCompleted, isCompleted === "true"));
    }

    const todos = await query;
    const duration = Date.now() - startTime;

    console.log(
      `[GET /api/todos:${requestId}] Success: fetched ${todos.length} todos in ${duration}ms`,
    );

    return NextResponse.json(todos, { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `[GET /api/todos:${requestId}] Error after ${duration}ms: ${errorMessage}`,
    );
    console.error(
      `[GET /api/todos:${requestId}] Stack:`,
      error instanceof Error ? error.stack : "N/A",
    );

    return NextResponse.json(
      {
        error: "Failed to fetch todos",
        details: errorMessage,
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/todos
 * Create a new todo
 */
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    console.log(`[POST /api/todos:${requestId}] Request started`);

    const body = await request.json();

    // Validate required fields
    const { title, description, priority, dueDate } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      console.warn(
        `[POST /api/todos:${requestId}] Invalid title: ${JSON.stringify(title)}`,
      );
      return NextResponse.json(
        { error: "Title is required and must be a non-empty string" },
        { status: 400 },
      );
    }

    console.log(`[POST /api/todos:${requestId}] Creating todo: "${title}"`);

    // Insert new todo
    const result = await db
      .insert(todosTable)
      .values({
        title: title.trim(),
        description: description || null,
        priority: priority || "medium",
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning();

    const duration = Date.now() - startTime;
    console.log(
      `[POST /api/todos:${requestId}] Success: created todo ID ${result[0].id} in ${duration}ms`,
    );

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `[POST /api/todos:${requestId}] Error after ${duration}ms: ${errorMessage}`,
    );
    console.error(
      `[POST /api/todos:${requestId}] Stack:`,
      error instanceof Error ? error.stack : "N/A",
    );

    return NextResponse.json(
      {
        error: "Failed to create todo",
        details: errorMessage,
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
