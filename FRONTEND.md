# Frontend Documentation - Todo Application

## Overview

The frontend is a modern React-based Single Page Application (SPA) built with **Next.js 16** and **TypeScript**, providing a professional and user-friendly interface for todo management.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                # Main todos page with CRUD UI
│   ├── layout.tsx              # Root layout with theme provider
│   └── globals.css             # Global styles
├── components/
│   ├── core/
│   │   └── theme-changer.tsx   # Theme toggle component
│   ├── ui/                     # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── badge.tsx
│   │   ├── select.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── spinner.tsx
│   │   ├── empty.tsx
│   │   ├── label.tsx
│   │   ├── sonner.tsx          # Toast notifications
│   │   ├── theme-provider.tsx
│   │   └── accordion.tsx
│   ├── todo-dialog.tsx         # Create/Edit todo modal
│   └── todo-card.tsx           # Individual todo display card
├── hooks/
│   └── use-todos.ts            # Custom React hook for todo management
├── lib/
│   ├── api-client.ts           # API client utilities
│   ├── utils.ts                # Helper utilities
│   └── db/                     # Backend database configuration
├── types/
│   └── todo.ts                 # TypeScript type definitions
└── public/                     # Static assets
```

## Key Features

### 1. **Real-time API Integration**
- All CRUD operations connected to REST API backend
- Automatic state synchronization
- Error handling with user feedback via toast notifications

### 2. **Full CRUD Functionality**
- **Create**: Add new todos via modal dialog
- **Read**: Display all todos with filtering and search
- **Update**: Edit todo details inline or via dialog
- **Delete**: Remove todos with confirmation

### 3. **Advanced Filtering**
- Search by title or description
- Filter by status (pending, in_progress, completed)
- Combined filtering support

### 4. **Professional UI/UX**
- Dark/Light theme toggle
- Responsive design (mobile-first)
- Loading states with spinner
- Empty state messaging
- Toast notifications for feedback
- Keyboard accessible components

### 5. **Type Safety**
- Full TypeScript support
- Proper type definitions for all API responses
- Type-safe component props

## Type Definitions

### Todo Type
```typescript
interface Todo {
  id: number;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
}
```

### API Input Types
```typescript
interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
}

interface UpdateTodoInput {
  title?: string;
  description?: string | null;
  status?: "pending" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  isCompleted?: boolean;
  dueDate?: string | null;
}
```

## API Integration

### API Client (`lib/api-client.ts`)

Provides utility functions for all backend API calls:

```typescript
// Fetch operations
fetchTodos(params?: { status?: string; isCompleted?: boolean }): Promise<Todo[]>
fetchTodoById(id: number): Promise<Todo>

// Mutation operations
createTodo(input: CreateTodoInput): Promise<Todo>
updateTodo(id: number, input: UpdateTodoInput): Promise<Todo>
deleteTodo(id: number): Promise<void>

// Helper operations
toggleTodoCompletion(id: number, isCompleted: boolean): Promise<Todo>
updateTodoStatus(id: number, status: StatusType): Promise<Todo>
updateTodoPriority(id: number, priority: PriorityType): Promise<Todo>
```

### Custom Hook (`hooks/use-todos.ts`)

React hook managing todo state and API calls:

```typescript
interface UseTodosResult {
  todos: Todo[];              // Current todos array
  loading: boolean;           // Loading state
  error: string | null;       // Error message if any
  refetch: () => Promise<void>;  // Manually refresh todos
  create: (input: CreateTodoInput) => Promise<Todo>;
  update: (id: number, input: UpdateTodoInput) => Promise<Todo>;
  delete: (id: number) => Promise<void>;
  toggle: (id: number) => Promise<Todo>;
}
```

### Usage Example

```typescript
const { todos, loading, error, create, update, delete: deleteTodo, toggle } = useTodos();

// Create new todo
await create({
  title: "New Todo",
  priority: "high",
});

// Update todo
await update(todoId, { isCompleted: true });

// Delete todo
await deleteTodo(todoId);

// Toggle completion
await toggle(todoId);
```

## Component Details

### TodoDialog
Modal component for creating and editing todos.

**Props:**
- `open: boolean` - Dialog open state
- `onOpenChange: (open: boolean) => void` - State callback
- `onSubmit: (input: CreateTodoInput) => Promise<void>` - Submit handler
- `initialTodo?: Todo` - Todo to edit (undefined for create)
- `isLoading?: boolean` - Loading state during submission

**Features:**
- Form validation (title required)
- Priority selector
- Date picker for due date
- Description textarea
- Toast notifications for success/error

### TodoCard
Displays individual todo item with actions.

**Props:**
- `todo: Todo` - Todo item to display
- `onEdit: (todo: Todo) => void` - Edit action callback
- `onDelete: (id: number) => void` - Delete action callback
- `onToggle: (id: number) => void` - Toggle completion callback
- `isLoading?: boolean` - Loading state

**Features:**
- Visual completion indicator (circle/check icon)
- Priority badge with color coding
- Status badge with color coding
- Dropdown menu for actions
- Due date display
- Creation date display
- Click-to-toggle completion
- Strikethrough for completed todos

**Color Coding:**
- Priority: Low (Blue), Medium (Amber), High (Red)
- Status: Pending (Gray), In Progress (Blue), Completed (Green)

### Main Page (page.tsx)
Central todo management interface.

**Features:**
- Todo list display
- Search functionality
- Status filtering
- Add todo button
- Loading state
- Empty state messaging
- Error display
- Responsive grid layout

**Sections:**
1. **Header** - Title and add todo button
2. **Filters** - Search and status filter
3. **Content** - Todo list or empty state
4. **Dialog** - Modal for create/edit

## Styling & Theme

### Framework & Libraries
- **Tailwind CSS 4**: Utility-first CSS framework
- **Shadcn Components**: Pre-built accessible UI components
- **Lucide React**: Icon library
- **Next Themes**: Theme management (light/dark)

### Theme Support
- Light theme (default)
- Dark theme (toggle via ModeToggle)
- System preference detection
- CSS variable-based theming

### Responsive Design
- Mobile-first approach
- Breakpoints: sm, md, lg, xl, 2xl
- Flexible grid layouts
- Touch-friendly interfaces

## State Management

### Component State
- **useTodos Hook**: Centralizes all todo data and operations
- **Local Component State**: Form fields in dialogs/inputs
- **Error Handling**: Graceful error messages

### Data Flow
1. Component mounts → `useTodos` fetches todos
2. User interaction → API call via hook method
3. API response → State updated, UI re-renders
4. Error → Toast notification, user informed

## Error Handling

### API Errors
- HTTP status code validation
- JSON error message parsing
- Toast notifications for user feedback

### Form Validation
- Title required check
- Input trimming and sanitization
- Real-time feedback

### User Confirmations
- Delete confirmation dialog
- Prevents accidental deletion

## Performance Optimizations

### Code Splitting
- Dynamic imports via Next.js
- Route-based code splitting
- Component lazy loading

### Rendering
- React functional components
- Memoization where needed
- Efficient event handlers

### Data Fetching
- Single fetch on component mount
- Optimistic updates via state
- Manual refetch capability

## Development Workflow

### Commands
```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Linting and formatting
npm run lint
npm run format
```

### Development Server
- URL: `http://localhost:3000`
- Hot module replacement enabled
- Source maps for debugging

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility (a11y)

- Semantic HTML
- ARIA labels where needed
- Keyboard navigation
- Focus management
- Color contrast compliance
- Screen reader support

## Future Enhancements

- [ ] Drag-and-drop todo reordering
- [ ] Bulk operations (multi-select)
- [ ] Todo categories/tags
- [ ] Recurring todos
- [ ] Due date notifications
- [ ] Keyboard shortcuts
- [ ] Undo/Redo functionality
- [ ] Export todos (CSV, JSON)
- [ ] Collaborative features
- [ ] Offline support (Service Workers)
- [ ] Progressive Web App (PWA)
- [ ] Analytics/insights dashboard

## Dependencies

### Production
- `next: 16.2.6` - React framework
- `react: 19.2.4` - UI library
- `react-dom: 19.2.4` - DOM renderer
- `tailwindcss: 4` - Styling
- `next-themes: 0.4.6` - Theme management
- `lucide-react: 1.16.0` - Icons
- `sonner: 2.0.7` - Toast notifications
- `radix-ui: 1.4.3` - Headless components
- `clsx: 2.1.1` - Class name utility
- `tailwind-merge: 3.6.0` - Tailwind utilities

### Development
- `typescript: 5` - Type checking
- `tailwindcss: 4` - CSS framework
- `biomejs: 2.2.0` - Linting & formatting

## Testing

### Unit Testing (Future)
- Component testing with Vitest
- API client mocking
- Hook testing

### E2E Testing (Future)
- Full user flow testing
- Cypress or Playwright
- API integration tests

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
- Required: `NEXT_PUBLIC_API_URL` (if API on different domain)
- Optional: `NEXT_PUBLIC_DEBUG_MODE` (for development)

### Hosting Options
- Vercel (recommended)
- Netlify
- AWS Amplify
- Docker containerization

---

**Last Updated**: May 27, 2026  
**Version**: 0.1.0  
**Status**: Production Ready
