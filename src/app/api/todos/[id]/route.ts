import { db, todosTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/todos/[id]
 * Retrieve a single todo by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      console.warn(
        `[GET /api/todos/[id]:${requestId}] Invalid ID format: ${idStr}`,
      );
      return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
    }

    console.log(`[GET /api/todos/[id]:${requestId}] Fetching todo ID: ${id}`);

    const todo = await db
      .select()
      .from(todosTable)
      .where(eq(todosTable.id, id))
      .limit(1);

    if (!todo.length) {
      const duration = Date.now() - startTime;
      console.warn(
        `[GET /api/todos/[id]:${requestId}] Todo ID ${id} not found (${duration}ms)`,
      );
      return NextResponse.json(
        { error: "Todo not found", id },
        { status: 404 },
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[GET /api/todos/[id]:${requestId}] Success: fetched todo ID ${id} (${duration}ms)`,
    );

    return NextResponse.json(todo[0], { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `[GET /api/todos/[id]:${requestId}] Error after ${duration}ms: ${errorMessage}`,
    );

    return NextResponse.json(
      {
        error: "Failed to fetch todo",
        details: errorMessage,
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/todos/[id]
 * Update a todo by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      console.warn(
        `[PUT /api/todos/[id]:${requestId}] Invalid ID format: ${idStr}`,
      );
      return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, status, priority, isCompleted, dueDate } = body;

    console.log(`[PUT /api/todos/[id]:${requestId}] Updating todo ID: ${id}`);

    // Check if todo exists
    const existingTodo = await db
      .select()
      .from(todosTable)
      .where(eq(todosTable.id, id))
      .limit(1);

    if (!existingTodo.length) {
      const duration = Date.now() - startTime;
      console.warn(
        `[PUT /api/todos/[id]:${requestId}] Todo ID ${id} not found (${duration}ms)`,
      );
      return NextResponse.json(
        { error: "Todo not found", id },
        { status: 404 },
      );
    }

    // Validate title if provided
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
        console.warn(
          `[PUT /api/todos/[id]:${requestId}] Invalid title provided`,
        );
        return NextResponse.json(
          { error: "Title must be a non-empty string" },
          { status: 400 },
        );
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description || null;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (dueDate !== undefined)
      updateData.dueDate = dueDate ? new Date(dueDate) : null;

    console.log(
      `[PUT /api/todos/[id]:${requestId}] Update fields:`,
      Object.keys(updateData),
    );

    const result = await db
      .update(todosTable)
      .set(updateData)
      .where(eq(todosTable.id, id))
      .returning();

    const duration = Date.now() - startTime;
    console.log(
      `[PUT /api/todos/[id]:${requestId}] Success: updated todo ID ${id} (${duration}ms)`,
    );

    return NextResponse.json(result[0], { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `[PUT /api/todos/[id]:${requestId}] Error after ${duration}ms: ${errorMessage}`,
    );

    return NextResponse.json(
      {
        error: "Failed to update todo",
        details: errorMessage,
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/todos/[id]
 * Delete a todo by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      console.warn(
        `[DELETE /api/todos/[id]:${requestId}] Invalid ID format: ${idStr}`,
      );
      return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
    }

    console.log(
      `[DELETE /api/todos/[id]:${requestId}] Deleting todo ID: ${id}`,
    );

    // Check if todo exists
    const existingTodo = await db
      .select()
      .from(todosTable)
      .where(eq(todosTable.id, id))
      .limit(1);

    if (!existingTodo.length) {
      const duration = Date.now() - startTime;
      console.warn(
        `[DELETE /api/todos/[id]:${requestId}] Todo ID ${id} not found (${duration}ms)`,
      );
      return NextResponse.json(
        { error: "Todo not found", id },
        { status: 404 },
      );
    }

    await db.delete(todosTable).where(eq(todosTable.id, id));

    const duration = Date.now() - startTime;
    console.log(
      `[DELETE /api/todos/[id]:${requestId}] Success: deleted todo ID ${id} (${duration}ms)`,
    );

    return NextResponse.json(
      { message: "Todo deleted successfully", id },
      { status: 200 },
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `[DELETE /api/todos/[id]:${requestId}] Error after ${duration}ms: ${errorMessage}`,
    );

    return NextResponse.json(
      {
        error: "Failed to delete todo",
        details: errorMessage,
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
