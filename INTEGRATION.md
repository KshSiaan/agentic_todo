# Frontend-Backend Integration Guide

## Overview

The todo application implements a complete REST API integration between the Next.js frontend and the Node.js/Next.js backend with PostgreSQL database.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)                  │
│                                                              │
│  ┌────────────────┐      ┌──────────────────┐               │
│  │  Components    │      │  Custom Hooks    │               │
│  │  - TodoCard    │◄────►│  - useTodos()    │               │
│  │  - TodoDialog  │      │                  │               │
│  │  - Page        │      └────────┬──────────┘               │
│  └────────────────┘               │                         │
│                                   │                         │
│                    ┌──────────────▼──────────────┐           │
│                    │   API Client                │           │
│                    │   (lib/api-client.ts)       │           │
│                    │                             │           │
│                    │  - fetchTodos()             │           │
│                    │  - createTodo()             │           │
│                    │  - updateTodo()             │           │
│                    │  - deleteTodo()             │           │
│                    └──────────────┬──────────────┘           │
└───────────────────────────────────┼──────────────────────────┘
                                    │
                        HTTP/REST API (JSON)
                                    │
┌───────────────────────────────────▼──────────────────────────┐
│                 Backend (Next.js API Routes)                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  /api/todos                                          │    │
│  │  ├─ GET    → Fetch all todos (with filters)         │    │
│  │  └─ POST   → Create new todo                        │    │
│  │                                                      │    │
│  │  /api/todos/[id]                                    │    │
│  │  ├─ GET    → Fetch single todo                      │    │
│  │  ├─ PUT    → Update todo                            │    │
│  │  └─ DELETE → Delete todo                            │    │
│  └──────────┬───────────────────────────────────────────┘    │
│             │                                                │
│  ┌──────────▼─────────────────────────────────────────────┐  │
│  │  Database Layer (Drizzle ORM)                         │  │
│  │  - Schema validation                                 │  │
│  │  - Type-safe queries                                │  │
│  └──────────┬──────────────────────────────────────────┘  │
└─────────────┼──────────────────────────────────────────────┘
              │
              │  PostgreSQL Protocol
              │
    ┌─────────▼────────────┐
    │  PostgreSQL Database │
    │  - todos table       │
    │  - Indexes           │
    │  - Constraints       │
    └──────────────────────┘
```

## Data Flow Examples

### 1. Creating a Todo

**Frontend (User Action)**
```
User clicks "Add Todo" button
        ↓
TodoDialog opens
        ↓
User fills form and submits
        ↓
onSubmit() called with CreateTodoInput
```

**Frontend (Component Logic)**
```typescript
const handleCreateTodo = async (input: CreateTodoInput) => {
  await create(input);  // Calls useTodos hook
};
```

**Hook Logic (useTodos)**
```typescript
const create = useCallback(async (input: CreateTodoInput) => {
  const newTodo = await createTodo(input);  // API call
  setTodos((prev) => [newTodo, ...prev]);   // Update state
  return newTodo;
}, []);
```

**API Client (lib/api-client.ts)**
```typescript
export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const response = await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.json();
}
```

**Backend API Route (/api/todos/route.ts)**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Validate input
  if (!body.title) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }

  // Insert into database
  const result = await db.insert(todosTable).values({...}).returning();
  
  return NextResponse.json(result[0], { status: 201 });
}
```

**Database Operation**
```sql
INSERT INTO todos (title, description, priority, status, isCompleted, createdAt, updatedAt, dueDate)
VALUES ('Buy groceries', '...', 'high', 'pending', false, NOW(), NOW(), '2026-05-30')
RETURNING *;
```

**Response Journey**
```
Database ← Result
  ↓
API Route (returns 201 JSON)
  ↓
Fetch API (resolves promise)
  ↓
API Client (parses JSON)
  ↓
useTodos Hook (updates state)
  ↓
Component re-renders (shows new todo)
  ↓
Dialog closes, toast shown
```

### 2. Fetching Todos with Filter

**Frontend URL Construction**
```typescript
// Search for "grocery" AND filter by "pending"
const filteredTodos = todos.filter(todo =>
  todo.title.includes("grocery") && todo.status === "pending"
);
```

**API Request**
```
GET /api/todos?status=pending
```

**Backend Processing**
```typescript
let query = db.select().from(todosTable);

if (status) {
  query = query.where(eq(todosTable.status, status));
}

const todos = await query;
```

**Database Query**
```sql
SELECT * FROM todos
WHERE status = 'pending'
ORDER BY createdAt DESC;
```

### 3. Updating a Todo

**User Toggles Completion**
```
User clicks circle icon on todo card
  ↓
TodoCard.onToggle(id) called
  ↓
useTodos.toggle(id) called
  ↓
updateTodo(id, { isCompleted: !current })
```

**API Request**
```
PUT /api/todos/5
{
  "isCompleted": true
}
```

**Backend Update**
```typescript
const updateData = { isCompleted: true };
const result = await db
  .update(todosTable)
  .set(updateData)
  .where(eq(todosTable.id, 5))
  .returning();
```

**Database Update**
```sql
UPDATE todos
SET isCompleted = true, updatedAt = NOW()
WHERE id = 5
RETURNING *;
```

## Error Handling Flow

### API Error Handling

**Scenario: Invalid Todo ID**

```
User attempts to delete todo with ID "abc"
  ↓
Frontend: parseInt("abc") → NaN
  ↓
Backend: isNaN(id) check fails
  ↓
Response: { error: "Invalid todo ID", status: 400 }
  ↓
API Client: Throws error
  ↓
useTodos Hook: Catches error, sets error state
  ↓
Component: Displays toast notification
  ↓
User sees: "Invalid todo ID"
```

### Network Error Handling

```
Network fails during API call
  ↓
fetch() rejects
  ↓
catch block in API client
  ↓
Error logged to console
  ↓
Error thrown to caller
  ↓
useTodos catches it
  ↓
Toast notification shown to user
```

### Form Validation

```
User submits form with empty title
  ↓
handleSubmit() checks title.trim()
  ↓
Validation fails
  ↓
toast.error("Title is required")
  ↓
Dialog stays open
  ↓
No API call made
```

## State Management Strategy

### Frontend State

**useTodos Hook State:**
```typescript
const [todos, setTodos] = useState<Todo[]>([]);      // Data from API
const [loading, setLoading] = useState(true);        // Loading indicator
const [error, setError] = useState<string | null>(); // Error messages
```

**Component Local State:**
```typescript
const [dialogOpen, setDialogOpen] = useState(false);        // Dialog visibility
const [editingTodo, setEditingTodo] = useState<Todo | null>(null);  // Edit mode
const [searchQuery, setSearchQuery] = useState("");  // Search filter
const [statusFilter, setStatusFilter] = useState("all");    // Status filter
```

### State Update Pattern

```
Initial Load:
useEffect → refetch() → fetchTodos() → setTodos(data)

User Creates Todo:
create(input) → API POST → server response → setTodos([new, ...prev])

User Searches:
setSearchQuery(value) → filteredTodos computed → component re-renders

User Deletes Todo:
delete(id) → API DELETE → success → setTodos(prev => prev.filter(...))
```

## API Response Types

### Success Response (200/201)
```typescript
// Single todo
{
  "id": 1,
  "title": "Buy groceries",
  "description": "Milk, bread, eggs",
  "status": "pending",
  "priority": "high",
  "isCompleted": false,
  "createdAt": "2026-05-27T10:30:00Z",
  "updatedAt": "2026-05-27T10:30:00Z",
  "dueDate": "2026-05-28T18:00:00Z"
}

// Array of todos
[{...}, {...}, ...]
```

### Error Response
```typescript
{
  "error": "Descriptive error message"
}
```

## Performance Considerations

### Optimization Strategies

1. **Optimistic Updates**: Update UI before API confirms
   ```typescript
   setTodos([newTodo, ...prev]);  // Update immediately
   await API.create(newTodo);     // Then call API
   ```

2. **Filtering Client-Side**: Reduce API calls for sorting/filtering
   ```typescript
   const filteredTodos = todos.filter(todo =>
     todo.title.includes(searchQuery)
   );
   ```

3. **Single Fetch**: Load all todos once on mount
   ```typescript
   useEffect(() => {
     refetch();  // Called once on component mount
   }, [refetch]);
   ```

4. **Lazy Loading** (Future): Paginate large lists
   ```typescript
   // GET /api/todos?page=1&limit=20
   ```

## Testing Checklist

### Frontend Tests
- [ ] TodoCard renders correctly with completed/pending state
- [ ] TodoDialog validates required fields
- [ ] Search filter works client-side
- [ ] Status filter works
- [ ] Create todo button opens dialog
- [ ] Edit button opens dialog with pre-filled data
- [ ] Delete shows confirmation
- [ ] Toggle completion updates UI
- [ ] Loading spinner shows during API calls
- [ ] Error toast shows on API failures

### API Tests
- [ ] GET /api/todos returns all todos
- [ ] GET /api/todos?status=pending filters correctly
- [ ] POST /api/todos creates new todo
- [ ] POST validates title required
- [ ] PUT /api/todos/:id updates todo
- [ ] PUT handles partial updates
- [ ] DELETE /api/todos/:id removes todo
- [ ] 404 returned for non-existent todo
- [ ] Invalid ID returns 400

### Integration Tests
- [ ] Create todo appears in list
- [ ] Updated todo shows new values
- [ ] Deleted todo removed from list
- [ ] Search finds created todos
- [ ] Refresh loads current state from API

## Debugging

### Network Tab
1. Open DevTools → Network tab
2. Perform action
3. Check request/response:
   ```
   Method: POST/GET/PUT/DELETE
   URL: /api/todos or /api/todos/:id
   Status: 200/201/400/404/500
   Response: Valid JSON
   ```

### Console Logs
Frontend API client logs:
```
console.error("createTodo error:", error);
console.error("fetchTodos error:", error);
```

Backend logs (via `console.error()` in routes):
```
console.error("POST /api/todos error:", error);
```

### React DevTools
- Check `useTodos` hook state
- Monitor re-renders
- Inspect component props

## Deployment Considerations

### Environment Variables
```env
# Frontend
NEXT_PUBLIC_API_BASE_URL=https://api.example.com  # If different domain

# Backend
DB_URL=postgresql://...  # Database connection
```

### CORS (if frontend and backend on different domains)
```typescript
// Backend
response.headers.set("Access-Control-Allow-Origin", process.env.FRONTEND_URL);
```

### API Timeout Handling (Future)
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);
const response = await fetch(url, { signal: controller.signal });
```

---

**Last Updated**: May 27, 2026  
**Version**: 0.1.0  
**Status**: Production Ready
