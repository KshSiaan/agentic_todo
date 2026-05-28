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
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
    }

    const todo = await db
      .select()
      .from(todosTable)
      .where(eq(todosTable.id, id))
      .limit(1);

    if (!todo.length) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    return NextResponse.json(todo[0], { status: 200 });
  } catch (error) {
    console.error("GET /api/todos/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch todo" },
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
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, status, priority, isCompleted, dueDate } = body;

    // Check if todo exists
    const existingTodo = await db
      .select()
      .from(todosTable)
      .where(eq(todosTable.id, id))
      .limit(1);

    if (!existingTodo.length) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    // Validate title if provided
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
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

    const result = await db
      .update(todosTable)
      .set(updateData)
      .where(eq(todosTable.id, id))
      .returning();

    return NextResponse.json(result[0], { status: 200 });
  } catch (error) {
    console.error("PUT /api/todos/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update todo" },
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
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
    }

    // Check if todo exists
    const existingTodo = await db
      .select()
      .from(todosTable)
      .where(eq(todosTable.id, id))
      .limit(1);

    if (!existingTodo.length) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    await db.delete(todosTable).where(eq(todosTable.id, id));

    return NextResponse.json(
      { message: "Todo deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE /api/todos/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete todo" },
      { status: 500 },
    );
  }
}
