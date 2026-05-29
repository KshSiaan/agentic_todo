# Debugging Guide for AI Todo Chat

## Overview of Error Handling Improvements

This document outlines the comprehensive error handling and debugging infrastructure that has been added to diagnose and resolve occasional failures in the AI chat and todo API.

---

## 1. New Error Handling Components

### 1.1 Error Handler Utilities (`src/lib/error-handler.ts`)

Provides robust retry logic with exponential backoff:

- **`fetchWithRetry()`** - Automatically retries failed requests with exponential backoff
  - Max 3 attempts by default
  - Configurable delays (100ms-5000ms)
  - Jitter to prevent thundering herd
  - Only retries transient errors (5xx, network timeouts, connection errors)

- **`isRetryableError()`** - Determines if an error should be retried
  - Network errors (TypeError with fetch)
  - HTTP 408, 429, 500-504
  - Timeouts and connection errors

- **`calculateBackoffDelay()`** - Exponential backoff with jitter
  - Example: 100ms → 200ms → 400ms (with ±10% jitter)
  - Prevents cascading failures

### 1.2 Health Check Endpoint (`src/app/api/health/route.ts`)

Visit `http://localhost:3000/api/health` to diagnose system status:

```json
{
  "timestamp": "2026-05-29T09:00:14.000Z",
  "status": "ok",
  "checks": {
    "googleApiKey": { "status": "ok", "message": "API key configured" },
    "database": { "status": "ok", "message": "Database connection working" },
    "googleApiModel": { "status": "ok", "message": "Model accessible" }
  },
  "environment": {
    "nodeEnv": "development",
    "nextPublicApiUrl": "http://localhost:3000"
  }
}
```

**Possible Issues:**
- If `googleApiKey` shows error: Check `GOOGLE_GENERATIVE_AI_API_KEY` env var
- If `database` shows error: Check database connection
- If `googleApiModel` shows error: Check API key validity or quota

---

## 2. Enhanced Logging System

### 2.1 Chat Route Logging

All requests to `/api/chat` are logged with:
- **Request ID**: Unique identifier for tracing (format: `abc123d`)
- **Timestamps**: Request start and duration
- **Tool Execution**: Each tool call logs inputs, execution time, and errors

Example logs:
```
[Chat:abc123d] Starting request
[Chat:abc123d] Received 5 messages
[Chat:abc123d] Starting streamText with model: gemma-4-31b-it
[Tool:getTodos] Executing (attempt 1): {}
[Tool:getTodos] Success: fetched 12 todos
[Chat:abc123d] Stream created successfully
```

### 2.2 Todo API Logging

All requests to `/api/todos*` include:
- **Request ID**: For cross-referencing with chat logs
- **Operation**: GET, POST, PUT, DELETE with parameters
- **Duration**: How long the operation took
- **Result**: Success/failure with details

Example logs:
```
[GET /api/todos:xyz789] Request started
[GET /api/todos:xyz789] Filtering by status: pending
[GET /api/todos:xyz789] Success: fetched 8 todos in 145ms
```

### 2.3 Error Details

When errors occur, they include:
- **Full error message** with context
- **Stack trace** for debugging
- **Request ID** for cross-referencing
- **Timestamp** for correlation
- **Type** of error (network, validation, database, etc.)

---

## 3. Debugging Common Issues

### Issue: "Internal error encountered" from Google API (500 errors)

**Cause**: Google's Gemini API is experiencing temporary issues (known to happen occasionally)

**Solution**:
1. Check `/api/health` endpoint
2. Look at logs for pattern: `[Chat:xxxxx] AI SDK Error after Nms: Google API server error`
3. **Retry automatically**: The client now handles this with exponential backoff
4. If persistent:
   - Check API quota: https://console.cloud.google.com/quotas
   - Check API key validity
   - Try with a different model if available

### Issue: GET /api/todos returns 500

**Cause**: Database connectivity issue or malformed query

**Solution**:
1. Check `/api/health` endpoint for database status
2. Look at server logs for request ID
3. Search logs for `[GET /api/todos:xxxxx] Error`
4. Check database connection string in `.env.local`
5. Verify database is running and accessible

### Issue: Chat fails but only occasionally

**Cause**: Transient network or API issues

**Solution**:
1. **Check the logs** - Search for the specific request ID in server logs
2. **Note the timestamp** - Cross-reference with API service status
3. **Check network** - Ensure stable internet connection
4. **Verify API quota** - Check Google Cloud console for rate limits
5. **Check retry behavior** - Look for `[fetchWithRetry] Attempt X/Y` logs

### Issue: Todos don't sync after AI action

**Cause**: The `/api/todos` call is failing (cascading failure)

**Solution**:
1. Check chat logs for request ID
2. Look at todos API logs around the same timestamp
3. The client now waits 500ms for mutations to process before refetching
4. If this timeout is too short, increase it in `ai-agent-chat.tsx` line ~144

---

## 4. Reading the Logs

### Server Console Output

```
[Chat:abc123d] Starting request
```
- `Chat` = This is the chat endpoint
- `abc123d` = Request ID (use this to filter related logs)
- Message describes what's happening

### Timestamps in Logs

Each request now includes timing information:
```
[GET /api/todos:xyz789] Success: fetched 8 todos in 145ms
```
- `145ms` indicates how long the database query took
- Slow queries (>500ms) might indicate database performance issues

### Request IDs for Tracing

To debug a complete chat flow:
1. Find the chat request ID in logs: `[Chat:abc123d]`
2. Search for all logs with `abc123d` to see complete flow
3. When chat calls tools, each tool is logged: `[Tool:getTodos]`
4. When todos API is called, it has its own ID: `[GET /api/todos:xyz789]`

---

## 5. Testing Error Scenarios

### Test Retry Logic

Stop your database temporarily, then trigger a chat message. You should see:
```
[fetchWithRetry] Attempt 1/3 failed with: ...
[fetchWithRetry] Retrying in 150ms...
[fetchWithRetry] Attempt 2/3 failed with: ...
```

### Test Health Check

```bash
curl http://localhost:3000/api/health
```

Should return degraded status if any component is down.

### Monitor API Quota

If you see many 500 errors:
1. Check Google Cloud console: https://console.cloud.google.com/quotas
2. Check usage at: https://console.cloud.google.com/billing
3. Consider upgrading quota limits

---

## 6. Error Recovery Strategies

### Client-Side

The client now:
- **Retries** tool calls automatically with backoff
- **Provides detailed error messages** to users
- **Distinguishes between error types**:
  - Temporary (500, timeout) → "Try again in a moment"
  - Configuration (API key) → "Please configure API key"
  - Network → "Check your connection"

### Server-Side

The server now:
- **Logs all details** for debugging
- **Generates request IDs** for tracing
- **Returns error info** in responses (doesn't just return 500)
- **Retries tool calls** with exponential backoff
- **Handles cascading failures** with timeouts

---

## 7. Performance Monitoring

### Request Duration Logging

All API endpoints log duration:
```
[POST /api/todos:abc] Success: created todo ID 42 in 234ms
```

If you see consistently high durations:
1. Check database performance
2. Check API response times
3. Consider implementing caching

### Tool Execution Times

The chat logs tool execution:
```
[Tool:getTodos] Success: fetched 12 todos
[Tool:updateTodo] Success: updated todo "My Task"
```

If tools are slow:
1. Check if `/api/todos` is responsive
2. Verify network latency
3. Check database indexes

---

## 8. Environment Variables Checklist

Ensure these are set in `.env.local`:

```env
# Required for Google AI
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here

# Optional but recommended
NEXT_PUBLIC_API_URL=http://localhost:3000

# Database (varies by setup)
DATABASE_URL=...
```

**To verify settings are loaded:**
1. Visit `/api/health`
2. Check the response for environment info

---

## 9. Advanced Debugging

### Enable Verbose Logging

In `src/app/api/chat/route.ts`, the logging is already comprehensive.

To add more detail:
- Each tool logs its input/output
- Search for `[Tool:` prefix to see tool execution details
- Search for `[AI SDK Event]` to see streamed events

### Trace a Complete User Action

1. User sends message in chat
2. Search logs for chat request ID: `[Chat:abc123d]`
3. Chat calls tools, find logs: `[Tool:getTodos]`, `[Tool:addTodo]`, etc.
4. Each tool calls `/api/todos*`, find those logs: `[GET /api/todos:xyz]`
5. After chat completes, client refetches todos: `[GET /api/todos:uvw]`

All these operations should have logs you can trace.

---

## 10. Reporting Issues

When reporting a bug, include:

```
1. Error message shown to user
2. Server logs with the request ID
3. Browser console errors
4. Network tab from DevTools (showing failed requests)
5. Result from /api/health endpoint
6. Approximate timestamp
7. Steps to reproduce (if possible)
```

Example:
```
Error: "The AI service encountered a temporary error"
Request ID: abc123d (visible in server logs)
Timestamp: 2026-05-29 09:00:14
Reproduce: Click send button, wait for response
Health check: All systems green
Server logs: [Chat:abc123d] AI SDK Error after 15234ms: Google API server error
```

---

## 11. Performance Optimization Tips

### Reduce Retry Attempts for Faster Feedback

In `src/lib/error-handler.ts`:
```typescript
maxAttempts: 2,  // Reduce from 3 to 2 for faster feedback
maxDelayMs: 2000,  // Reduce max backoff delay
```

### Increase Mutation Processing Delay

In `src/components/ai-agent-chat.tsx` (~line 144):
```typescript
await new Promise((resolve) => setTimeout(resolve, 1000));  // Increase from 500ms
```

### Monitor Health Check

Add periodic health checks to detect issues early:
```typescript
// In a useEffect hook
setInterval(() => {
  fetch('/api/health').then(r => r.json()).then(console.log);
}, 30000);  // Every 30 seconds
```

---

## 12. Summary

The improved error handling provides:

✅ **Automatic retries** with exponential backoff  
✅ **Detailed logging** with request IDs for tracing  
✅ **Health checks** for system diagnostics  
✅ **Better error messages** to users  
✅ **Request tracking** across service boundaries  
✅ **Performance monitoring** with timing data  
✅ **Graceful degradation** for transient failures  

These improvements make it much easier to diagnose and resolve occasional failures.
