import { db, todosTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/todos
 * Retrieve all todos with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const isCompleted = searchParams.get("isCompleted");

    let query: any = db.select().from(todosTable);

    // Apply filters if provided
    if (status) {
      query = query.where(eq(todosTable.status, status));
    }
    if (isCompleted) {
      query = query.where(eq(todosTable.isCompleted, isCompleted === "true"));
    }

    const todos = await query;
    return NextResponse.json(todos, { status: 200 });
  } catch (error) {
    console.error("GET /api/todos error:", error);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/todos
 * Create a new todo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { title, description, priority, dueDate } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { error: "Title is required and must be a non-empty string" },
        { status: 400 },
      );
    }

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

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/todos error:", error);
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 },
    );
  }
}
