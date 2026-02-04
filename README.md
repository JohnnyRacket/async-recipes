# Async Recipes

**Recipes for engineers: visualize cooking as a dependency graph to maximize parallelism.**

A Next.js 16 application demonstrating modern React Server Components, streaming AI, interactive data visualization, and real-time cooking guidance.

## Screenshots

<img width="1440" height="813" alt="Image" src="https://github.com/user-attachments/assets/d2f5b7b5-afc8-4120-a8d0-c6b57f6aa520" />
<img width="886" height="806" alt="Image" src="https://github.com/user-attachments/assets/1b4607d6-dd26-494c-bb17-38550ba7d0fd" />
<img width="1440" height="810" alt="Image" src="https://github.com/user-attachments/assets/a308f4f9-8ca9-4a58-b065-d7b3dc928938" />
<img width="291" height="713" alt="Image" src="https://github.com/user-attachments/assets/2af980d8-3a3f-463b-98cd-fc9265706c6f" />
<img width="393" height="555" alt="Image" src="https://github.com/user-attachments/assets/b32b7964-b1bd-4aa8-b82f-af58076fd501" />

## Features

- **Dependency Graph Visualization** - Interactive React Flow graph showing which steps depend on others
- **Cooking Mode** - Step-by-step cooking guidance with timers, progress tracking, and parallel step detection
- **Parallel Step Detection** - Identifies which cooking tasks can run simultaneously
- **AI Recipe Extraction** - Paste any recipe URL and AI extracts structured data with dependency analysis
- **Recipe Enhancement** - Improve existing recipes with AI-powered step dependency analysis
- **Streaming UI** - Watch the AI extract recipe data in real-time
- **Parallel Routes** - Browse recipes with side-by-side list and preview panels
- **Smart Timers** - Automatic timer detection for steps requiring precise timing

## Tech Stack

- **Next.js 16.1** with App Router
- **React 19** with Server Components
- **AI SDK 6** with Vercel AI Gateway
- **Upstash Redis** for data persistence via `@upstash/redis`
- **Zod 4** for schema validation
- **XY Flow** (`@xyflow/react`) for recipe step graph visualization
- **shadcn/ui** for accessible UI components
- **Tailwind CSS v4** with `@tailwindcss/postcss`

## Architecture Decisions

### Server vs Client Components

| Component | Type | Rationale |
|-----------|------|-----------|
| Home page | Server | SEO-critical, no interactivity needed, fast FCP |
| Recipe list | Server | Data-driven, cacheable, reduces client JS |
| Recipe detail (content) | Server | Static content renders instantly |
| Recipe graph | Client | Requires DOM + interactivity (React Flow) |
| Cooking mode | Client | Timer state, step tracking, user interactions |
| Add recipe form | Client | Form state, streaming updates, event handlers |

**Result**: ~80% Server Components, only interactive pieces are client-side.

### Parallel Routes

The browse page (`/recipes`) uses Next.js parallel routes for a side-by-side layout:

```
app/recipes/(browse)/
├── layout.tsx          # Defines @list and @preview slots
├── @list/              # Recipe list slot
└── @preview/           # Recipe preview slot
```

- List shows all recipes with infinite scroll
- Preview panel shows selected recipe details
- Responsive: preview hidden on mobile, full-width list

### Data Fetching & Caching

```typescript
// Tag-based caching with 'use cache' directive
export async function getCachedRecipes(): Promise<Recipe[]> {
  'use cache'
  cacheTag('recipes')
  cacheLife({ revalidate: 3600 })
  return getRecipes()
}

// On-demand revalidation when saving
revalidateTag('recipes');
revalidatePath('/recipes');
```

- All fetches use Next.js cache with tags
- New recipes trigger tag-based revalidation
- Users hit cache → fast, scalable

### Streaming & Suspense

```typescript
// Recipe detail page - Suspense for graph
<Suspense fallback={<GraphSkeleton />}>
  <InteractiveRecipe recipe={recipe} />
</Suspense>

// Add page - AI SDK streaming
const { object, submit, isLoading } = useObject({
  api: '/api/ingest',
  schema: RecipeSchema,
});
```

- Suspense boundaries isolate loading states
- AI streaming shows progressive results
- Better UX than spinners

### Cooking Mode

Interactive cooking guidance with:

- **Step Status Tracking** - Mark steps as pending, in-progress, or completed
- **Smart Timers** - Automatic timer detection for steps with `needsTimer: true`
- **Parallel Step Detection** - Shows which steps can start simultaneously
- **Up Next Queue** - Displays upcoming steps based on dependencies
- **Progress Tracking** - Visual progress bar showing completion percentage
- **Active Timers Bar** - Sticky bar showing all running timers

### Error Handling

Typed error system using `lib/errors.ts`:

```typescript
// Server actions throw typed errors
throw new ValidationError('Invalid input', 'INVALID_INPUT');

// Client handles errors gracefully
if (isAppError(error)) {
  // Handle specific error types
}
```

## Project Structure

```
app/
├── layout.tsx                    # Root layout (Server)
├── page.tsx                      # Home - featured recipes (Server)
├── loading.tsx                   # Root loading skeleton
├── recipes/
│   ├── (browse)/                 # Parallel route group
│   │   ├── layout.tsx            # Defines @list and @preview slots
│   │   ├── @list/                # Recipe list slot
│   │   │   └── page.tsx          # Infinite scroll list
│   │   └── @preview/             # Preview slot
│   │       └── preview/[id]/     # Preview detail page
│   └── [id]/                     # Individual recipe pages
│       ├── page.tsx              # Recipe detail (Mixed)
│       ├── loading.tsx           # Detail skeleton
│       ├── _components/          # Recipe-specific components
│       │   ├── cooking-mode/     # Cooking mode UI
│       │   ├── ingredients-list.tsx
│       │   ├── steps-list.tsx
│       │   └── interactive-recipe.tsx
│       └── _hooks/
│           └── use-cooking-state.ts  # Cooking mode state management
├── add/
│   └── page.tsx                  # Add recipe form (Client)
└── api/
    ├── ingest/
    │   └── route.ts              # AI recipe extraction (Node.js)
    ├── enhance/
    │   └── route.ts              # AI recipe enhancement (Node.js)
    └── sync-recipe-ids/
        └── route.ts              # Recipe ID sync utility

lib/
├── types.ts                      # TypeScript definitions
├── schemas.ts                    # Zod schemas for AI
├── kv.ts                         # Data access with caching
├── actions.ts                    # Server actions
├── errors.ts                     # Typed error system
├── utils.ts                      # Utility functions
└── seed.ts                       # Pre-seeded recipes

components/
├── ui/                           # shadcn/ui components
├── recipe-card.tsx               # Recipe card (Server)
├── recipe-grid.tsx               # Grid layout (Server)
├── recipe-graph.tsx              # React Flow graph (Client)
├── recipe-infinite-list.tsx      # Infinite scroll list (Client)
├── add-recipe-form.tsx           # Streaming form (Client)
└── nav.tsx                       # Navigation (Server)

hooks/
└── use-cooking-state.ts          # Shared cooking state hook (legacy)

proxy.ts                          # Request proxy (rate limiting)
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
# Upstash Redis (optional - uses in-memory store without)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# OpenAI API Key (required for AI extraction via Vercel AI Gateway)
OPENAI_API_KEY=
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app works without Upstash Redis configured - it uses an in-memory store with pre-seeded recipes for development.

### Production Build

```bash
npm run build
npm start
```

## Key Next.js Concepts Demonstrated

1. **Server Components** - Default for all data-fetching pages
2. **Client Components** - Only for interactive features (`'use client'`)
3. **Parallel Routes** - Side-by-side list and preview layout
4. **Streaming** - AI SDK `streamObject` for progressive UI
5. **Suspense** - Isolate loading states, improve perceived performance
6. **Caching** - `'use cache'` directive with `cacheTag` for fine-grained invalidation
7. **Server Actions** - Mutations with `revalidateTag`/`revalidatePath`
8. **Streaming API Routes** - Server actions for AI streaming
9. **generateStaticParams** - Pre-render known recipes
10. **Metadata API** - Dynamic SEO metadata per page
11. **Loading UI** - `loading.tsx` for route transitions
12. **Error Boundaries** - `error.tsx` for graceful error handling

## Recipe Domain Model

### Step Dependencies (DAG Model)

Steps form a Directed Acyclic Graph for parallelization:

```typescript
// Can start immediately (no dependencies)
{ id: "step1", dependsOn: [], text: "Preheat oven to 375°F" }
{ id: "step2", dependsOn: [], text: "Chop vegetables" }

// Must wait for step2
{ id: "step3", dependsOn: ["step2"], text: "Sauté vegetables" }

// Must wait for multiple steps
{ id: "step4", dependsOn: ["step1", "step3"], text: "Bake for 25 minutes" }
```

### Step Metadata

- **duration**: Estimated minutes for the step
- **isPassive**: `true` if hands-off (simmering, baking, resting)
- **needsTimer**: `true` if precise timing required (bake 25 min)
- **ingredients**: Short ingredient names used in this step
- **temperature**: Cooking temperature if mentioned

### Ingredient Categories

Color-coded categories for UI visualization:
- `meat`, `seafood`, `vegetable`, `dairy`, `grain`, `sauce`, `spice`, `chocolate`, `other`

## License

MIT
