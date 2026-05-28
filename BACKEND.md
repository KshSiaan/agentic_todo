# Agentic Todo - Backend Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Error Handling](#error-handling)
6. [Development Setup](#development-setup)
7. [Environment Variables](#environment-variables)

---

## Architecture Overview

The backend is built with **Next.js 16** using the App Router, implementing a REST API for todo management. The system follows a modern serverless architecture with database operations through Drizzle ORM connected to Neon PostgreSQL.

### Core Components:
- **API Routes**: `src/app/api/todos/` - Handles all CRUD operations
- **Database Layer**: `src/lib/db/` - Drizzle ORM configuration and schema
- **Type System**: Full TypeScript support for type safety
- **Middleware**: Built-in Next.js request/response handling

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js + Next.js | 16.2.6 |
| Database | PostgreSQL (Neon) | Latest |
| ORM | Drizzle ORM | 0.45.2 |
| Language | TypeScript | 5.x |
| API | RESTful JSON | - |
| Linter | Biomejs | 2.2.0 |

---

## Database Schema

### Table: `todos`

**Purpose**: Stores all todo items with metadata

**Fields:**

| Field | Type | Constraints | Default | Purpose |
|-------|------|-------------|---------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTO INCREMENT | GENERATED | Unique identifier |
| `title` | VARCHAR(255) | NOT NULL | - | Todo title/name |
| `description` | TEXT | NULLABLE | NULL | Detailed description |
| `status` | VARCHAR(50) | NOT NULL | "pending" | Current status (pending, in_progress, completed) |
| `priority` | VARCHAR(50) | NOT NULL | "medium" | Priority level (low, medium, high) |
| `isCompleted` | BOOLEAN | NOT NULL | false | Completion flag |
| `createdAt` | TIMESTAMP | NOT NULL | NOW() | Creation timestamp (UTC) |
| `updatedAt` | TIMESTAMP | NOT NULL | NOW() | Last update timestamp (UTC) |
| `dueDate` | TIMESTAMP | NULLABLE | NULL | Task due date |

**Indexes:**

```sql
- todos_status_idx ON status
- todos_completed_idx ON isCompleted
- todos_created_at_idx ON createdAt
- todos_due_date_idx ON dueDate
```

**Purpose of Indexes**: Optimize queries for filtering by status, completion, creation date, and due date.

---

## API Endpoints

### Base URL
```
http://localhost:3000/api/todos
```

### 1. GET /api/todos
**Retrieve all todos**

**Description**: Fetches all todos with optional filtering by status or completion state.

**Query Parameters:**
- `status` (optional): Filter by status value (e.g., "pending", "in_progress", "completed")
- `isCompleted` (optional): Filter by completion (values: "true" or "false")

**Example Requests:**
```bash
GET /api/todos
GET /api/todos?status=pending
GET /api/todos?isCompleted=true
GET /api/todos?status=in_progress&isCompleted=false
```

**Response (200 OK):**
```json
[
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
]
```

**Error Response (500):**
```json
{
  "error": "Failed to fetch todos"
}
```

---

### 2. POST /api/todos
**Create a new todo**

**Description**: Creates a new todo item with provided data.

**Request Body:**
```json
{
  "title": "string (required, non-empty)",
  "description": "string (optional)",
  "priority": "string (optional, default: 'medium')",
  "dueDate": "ISO 8601 string (optional)"
}
```

**Example Request:**
```bash
POST /api/todos
Content-Type: application/json

{
  "title": "Complete project",
  "description": "Finish the React component",
  "priority": "high",
  "dueDate": "2026-05-30T23:59:59Z"
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "title": "Complete project",
  "description": "Finish the React component",
  "status": "pending",
  "priority": "high",
  "isCompleted": false,
  "createdAt": "2026-05-27T11:00:00Z",
  "updatedAt": "2026-05-27T11:00:00Z",
  "dueDate": "2026-05-30T23:59:59Z"
}
```

**Error Response (400):**
```json
{
  "error": "Title is required and must be a non-empty string"
}
```

**Error Response (500):**
```json
{
  "error": "Failed to create todo"
}
```

---

### 3. GET /api/todos/[id]
**Retrieve a single todo**

**Description**: Fetches a specific todo by its ID.

**URL Parameters:**
- `id` (required): Integer ID of the todo

**Example Request:**
```bash
GET /api/todos/1
```

**Response (200 OK):**
```json
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
```

**Error Response (400):**
```json
{
  "error": "Invalid todo ID"
}
```

**Error Response (404):**
```json
{
  "error": "Todo not found"
}
```

**Error Response (500):**
```json
{
  "error": "Failed to fetch todo"
}
```

---

### 4. PUT /api/todos/[id]
**Update a todo**

**Description**: Updates one or more fields of an existing todo. Supports partial updates.

**URL Parameters:**
- `id` (required): Integer ID of the todo

**Request Body (All fields optional):**
```json
{
  "title": "string",
  "description": "string",
  "status": "string",
  "priority": "string",
  "isCompleted": "boolean",
  "dueDate": "ISO 8601 string or null"
}
```

**Example Request:**
```bash
PUT /api/todos/1
Content-Type: application/json

{
  "isCompleted": true,
  "status": "completed"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "title": "Buy groceries",
  "description": "Milk, bread, eggs",
  "status": "completed",
  "priority": "high",
  "isCompleted": true,
  "createdAt": "2026-05-27T10:30:00Z",
  "updatedAt": "2026-05-27T12:00:00Z",
  "dueDate": "2026-05-28T18:00:00Z"
}
```

**Error Response (400):**
```json
{
  "error": "Invalid todo ID"
}
```

**Error Response (404):**
```json
{
  "error": "Todo not found"
}
```

**Error Response (500):**
```json
{
  "error": "Failed to update todo"
}
```

---

### 5. DELETE /api/todos/[id]
**Delete a todo**

**Description**: Permanently deletes a todo item by its ID.

**URL Parameters:**
- `id` (required): Integer ID of the todo

**Example Request:**
```bash
DELETE /api/todos/1
```

**Response (200 OK):**
```json
{
  "message": "Todo deleted successfully"
}
```

**Error Response (400):**
```json
{
  "error": "Invalid todo ID"
}
```

**Error Response (404):**
```json
{
  "error": "Todo not found"
}
```

**Error Response (500):**
```json
{
  "error": "Failed to delete todo"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Scenario | Typical Errors |
|------|----------|----------------|
| 200 | Success (GET, PUT, DELETE) | None |
| 201 | Successfully created (POST) | None |
| 400 | Bad request | Invalid ID, missing required fields, validation failure |
| 404 | Resource not found | Todo ID doesn't exist |
| 500 | Server error | Database connection issues, unexpected errors |

### Error Response Format
All errors follow a consistent JSON structure:

```json
{
  "error": "Descriptive error message"
}
```

### Validation Rules

**Title Field:**
- Required on CREATE
- Optional on UPDATE
- Must be a non-empty string (whitespace trimmed)
- Maximum length: 255 characters

**Priority Field:**
- Valid values: "low", "medium", "high"
- Default: "medium"

**Status Field:**
- Valid values: "pending", "in_progress", "completed"
- Default: "pending"

**ID Parameter:**
- Must be a valid integer
- Must exist in database

**Timestamps:**
- Always in UTC (ISO 8601 format)
- Automatically managed by database
- `createdAt` is immutable
- `updatedAt` updates automatically on changes

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL database (via Neon)

### Installation

```bash
# Clone repository
cd agentic_todo

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev        # Start development server (localhost:3000)
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run Biomejs linter
npm run format     # Format code with Biomejs
```

---

## Environment Variables

### Required Variables

```env
DB_URL=postgresql://user:password@host:port/database
```

### Description

**DB_URL**: Connection string for Neon PostgreSQL database

**Format**: `postgresql://[user]:[password]@[host]:[port]/[database]`

**Example:**
```env
DB_URL=postgresql://user:pass123@ep-example.neon.tech:5432/todoapp
```

---

## Database Connection

### Drizzle ORM Configuration

**File**: `src/lib/db/index.ts`

```typescript
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const db = drizzle(process.env.DB_URL, { schema });
```

### Connection Features
- HTTP adapter for serverless environment
- Full schema type safety
- Automatic connection pooling
- Error handling with environment variable validation

---

## Code Organization

```
src/
├── app/
│   └── api/
│       └── todos/
│           ├── route.ts        # GET all, POST new todo
│           └── [id]/
│               └── route.ts    # GET single, PUT update, DELETE todo
└── lib/
    └── db/
        ├── index.ts            # Database client initialization
        └── schema.ts           # Drizzle ORM schema definition
```

---

## Key Features

✅ **Type Safety**: Full TypeScript with Drizzle ORM  
✅ **Input Validation**: Comprehensive validation on all endpoints  
✅ **Error Handling**: Consistent error responses with HTTP status codes  
✅ **Filtering**: Query-based filtering for status and completion  
✅ **Partial Updates**: Support for updating single or multiple fields  
✅ **Performance**: Strategic database indexes for common queries  
✅ **Timestamps**: Automatic UTC timestamps for auditing  
✅ **Serverless Ready**: Optimized for edge deployment  

---

## Future Enhancements

- [ ] User authentication and authorization
- [ ] Rate limiting on API endpoints
- [ ] Pagination for large todo lists
- [ ] Advanced filtering and sorting
- [ ] Batch operations (bulk update/delete)
- [ ] Webhook support for real-time updates
- [ ] API documentation with Swagger/OpenAPI
- [ ] Database transaction support

---

**Last Updated**: May 27, 2026  
**Version**: 0.1.0
