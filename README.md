# Async Recipes

**Recipes for engineers: visualize cooking as a dependency graph to maximize parallelism.**

A Next.js application demonstrating modern React Server Components, streaming AI, and interactive data visualization.

## Features

- **Dependency Graph Visualization** - Each recipe displays an interactive React Flow graph showing which steps depend on others
- **Parallel Step Detection** - Identifies which cooking tasks can run simultaneously
- **AI Recipe Extraction** - Paste any recipe URL and AI extracts structured data with dependency analysis
- **Streaming UI** - Watch the AI extract recipe data in real-time

## Tech Stack

- **Next.js 16** (App Router)
- **React 19** with Server Components
- **Vercel KV** for data persistence
- **Vercel AI SDK** for streaming structured output
- **React Flow** (`@xyflow/react`) for dependency graphs
- **shadcn/ui** for accessible UI components
- **Tailwind CSS 4** for styling

## Architecture Decisions

### Server vs Client Components

| Component | Type | Rationale |
|-----------|------|-----------|
| Home page | Server | SEO-critical, no interactivity needed, fast FCP |
| Recipe list | Server | Data-driven, cacheable, reduces client JS |
| Recipe detail (content) | Server | Static content renders instantly |
| Recipe graph | Client | Requires DOM + interactivity (React Flow) |
| Add recipe form | Client | Form state, streaming updates, event handlers |

**Result**: ~80% Server Components, only interactive pieces are client-side.

### Data Fetching & Caching

```typescript
// Tag-based caching for instant updates
export const getCachedRecipes = unstable_cache(
  getRecipes,
  ['recipes'],
  { tags: ['recipes'] }
);

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
  <RecipeGraph steps={recipe.steps} />
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

### Edge Runtime for AI

```typescript
// app/api/ingest/route.ts
export const runtime = 'edge';
```

- Lower latency for URL fetch + AI call
- Server-side fetch avoids CORS issues

## Project Structure

```
app/
├── layout.tsx              # Root layout (Server)
├── page.tsx                # Home - featured recipes (Server)
├── loading.tsx             # Root loading skeleton
├── recipes/
│   ├── page.tsx            # Recipe list (Server)
│   ├── loading.tsx         # List skeleton
│   └── [id]/
│       ├── page.tsx        # Recipe detail (Mixed)
│       └── loading.tsx     # Detail skeleton
├── add/
│   └── page.tsx            # Add recipe form (Client)
└── api/
    └── ingest/
        └── route.ts        # AI streaming (Edge)

lib/
├── types.ts                # TypeScript definitions
├── schemas.ts              # Zod schemas for AI
├── kv.ts                   # Data access with caching
├── actions.ts              # Server actions
└── seed.ts                 # Pre-seeded recipes

components/
├── ui/                     # shadcn/ui components
├── recipe-card.tsx         # Recipe card (Server)
├── recipe-grid.tsx         # Grid layout (Server)
├── recipe-graph.tsx        # React Flow graph (Client)
├── add-recipe-form.tsx     # Streaming form (Client)
└── nav.tsx                 # Navigation (Server)
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
# Vercel KV (optional - uses in-memory store without)
KV_REST_API_URL=
KV_REST_API_TOKEN=

# OpenAI API Key (required for AI extraction via Vercel AI Gateway)
# When deployed on Vercel, you can also use Vercel's built-in AI features
OPENAI_API_KEY=
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app works without KV configured - it uses an in-memory store with pre-seeded recipes for development.

### Production Build

```bash
npm run build
npm start
```

## Key Next.js Concepts Demonstrated

1. **Server Components** - Default for all data-fetching pages
2. **Client Components** - Only for interactive features (`'use client'`)
3. **Streaming** - AI SDK `streamObject` for progressive UI
4. **Suspense** - Isolate loading states, improve perceived performance
5. **Caching** - `unstable_cache` with tags for fine-grained invalidation
6. **Server Actions** - Mutations with `revalidateTag`/`revalidatePath`
7. **Edge Runtime** - API route for lower latency
8. **generateStaticParams** - Pre-render known recipes
9. **Metadata API** - Dynamic SEO metadata per page
10. **Loading UI** - `loading.tsx` for route transitions

## Performance Tradeoffs

| Decision | Benefit | Tradeoff |
|----------|---------|----------|
| Server-first rendering | Lower TTI, smaller bundles | Initial server request |
| Tag-based caching | Fast reads, instant invalidation | Complexity vs time-based |
| Edge API route | Lower latency globally | Limited Node.js APIs |
| React Flow (client) | Rich interactivity | ~100KB client JS |
| In-memory fallback | Works without KV | Not persistent |

## License

MIT
