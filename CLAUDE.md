# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **AsistenciaYA**, an employee attendance tracking system built with Next.js 15, Firebase, and Genkit AI. It's deployed on Firebase App Hosting and supports role-based access (admin and regular users).

## Tech Stack

- **Framework**: Next.js 15.3.3 with App Router and Turbopack
- **Language**: TypeScript with strict mode
- **UI**: React 18, Tailwind CSS, Radix UI components (shadcn/ui)
- **Backend**: Firebase (Firestore, Authentication)
- **AI**: Genkit with Google Gemini 2.5 Flash
- **Forms**: React Hook Form with Zod validation

## Development Commands

```bash
# Start development server (runs on port 9002 with Turbopack)
npm run dev

# Start Genkit AI development server
npm run genkit:dev

# Start Genkit with auto-reload
npm run genkit:watch

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npm run typecheck
```

## Architecture

### Firebase Integration

The app uses a custom Firebase initialization pattern for Firebase App Hosting:

1. **Initialization** (`src/firebase/index.ts`): Attempts to initialize without config first (for production), falls back to `firebaseConfig` for development
2. **Client Provider** (`src/firebase/client-provider.tsx`): Top-level wrapper that initializes Firebase
3. **Provider Pattern** (`src/firebase/provider.tsx`): Context-based access to Firebase services (auth, firestore) and user state
4. **Custom Hooks**:
   - `useUser()`: Returns `{ user, loading }` for auth state
   - `useFirestore()`: Returns Firestore instance
   - `useAuth()`: Returns Auth instance
   - `useCollection<T>()`: Real-time Firestore collection listener with typed data
   - `useDoc()`: Real-time Firestore document listener
   - `useMemoFirebase()`: Memoization helper for Firebase queries

**IMPORTANT**: When using `useCollection()` or `useDoc()`, ALWAYS memoize queries with `useMemoFirebase()`:

```typescript
const employeesQuery = useMemoFirebase(() => {
  if (!firestore) return null;
  return query(collection(firestore, 'empleados'), orderBy('orden'));
}, [firestore]);

const { data, isLoading } = useCollection<Employee>(employeesQuery);
```

### Route Structure

- `/` - Main attendance tracking page (regular users)
- `/login` - Authentication page
- `/admin` - Admin dashboard with sidebar layout
- `/admin/employees` - Employee management
- `/admin/employees/[id]` - Individual employee detail
- `/admin/layout.tsx` - Shared admin layout with role-based protection

### Role-Based Access

User roles are stored in Firestore `users/{uid}` documents with a `role` field:
- `admin`: Access to admin panel and attendance tracking
- Regular users: Only attendance tracking

Route protection is implemented in:
1. Page-level `useEffect` checks that redirect based on `userData.role`
2. Admin layout (`src/app/admin/layout.tsx`) verifies admin role before rendering

### Data Model

Key Firestore collections:
- `empleados`: Employee records with nested project, sede, DTT, modalidad data
- `asistencias`: Attendance records with employeeId, status, timestamp
- `sedes`: Office locations
- `users`: User authentication data with roles

TypeScript types are defined in `src/types/index.ts`.

### UI Components

Custom UI components live in `src/components/ui/` (shadcn/ui pattern). Component configuration is in `components.json`.

Domain-specific components:
- `src/components/attendance/`: Attendance tracking components
- `src/components/FirebaseErrorListener.tsx`: Global Firebase error handler

### State Management

- Firebase real-time listeners for data synchronization
- Local React state for UI interactions
- Date handling with `date-fns`
- Toast notifications via `src/hooks/use-toast.ts`

### AI Integration

Genkit is configured in `src/ai/genkit.ts` with Google Gemini 2.5 Flash model. Development flows are in `src/ai/dev.ts`.

## Important Notes

- **TypeScript**: `ignoreBuildErrors: true` is enabled in `next.config.ts` - fix type errors when possible
- **Path Aliases**: Use `@/` for imports from `src/`
- **Firebase Config**: Located in `src/firebase/config.ts` (contains non-sensitive public API keys)
- **Date Handling**: Use `date-fns` for date operations, Firestore Timestamps for storage
- **Batch Writes**: Attendance saves use Firestore batch writes for efficiency
- **Error Handling**: Custom `FirestorePermissionError` class with global error emitter pattern
