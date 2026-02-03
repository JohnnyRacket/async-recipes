# Next.js Technical Interview Guide

A comprehensive guide to Next.js concepts, features, and best practices for technical interviews. Each section includes explanations, benefits, and code examples from real-world implementations.

---

## Table of Contents

1. [App Router Architecture](#1-app-router-architecture)
2. [Server Components vs Client Components](#2-server-components-vs-client-components)
3. [Rendering Strategies](#3-rendering-strategies)
4. [Data Fetching Patterns](#4-data-fetching-patterns)
5. [Caching Mechanisms](#5-caching-mechanisms)
6. [Server Actions](#6-server-actions)
7. [Route Handlers (API Routes)](#7-route-handlers-api-routes)
8. [Layouts & Nested Layouts](#8-layouts--nested-layouts)
9. [Loading UI & Streaming](#9-loading-ui--streaming)
10. [Error Handling](#10-error-handling)
11. [Parallel Routes](#11-parallel-routes)
12. [Intercepting Routes](#12-intercepting-routes)
13. [Dynamic Routes & generateStaticParams](#13-dynamic-routes--generatestaticparams)
14. [Metadata & SEO](#14-metadata--seo)
15. [Image Optimization](#15-image-optimization)
16. [Font Optimization](#16-font-optimization)
17. [Middleware](#17-middleware)
18. [Edge Runtime](#18-edge-runtime)
19. [Performance Features](#19-performance-features)
20. [TypeScript Integration](#20-typescript-integration)

---

## 1. App Router Architecture

### What It Is
The App Router (introduced in Next.js 13) is a new routing paradigm that uses the `app/` directory and leverages React Server Components by default. It replaces the Pages Router's file-system based routing with a more powerful, nested approach.

### Key Concepts

**File-System Based Routing:**
- `page.tsx` → Defines a route segment (renders at that URL)
- `layout.tsx` → Wraps pages and nested layouts (persists across navigations)
- `loading.tsx` → Instant loading UI with React Suspense
- `error.tsx` → Error boundary for the segment
- `not-found.tsx` → Custom 404 page
- `route.ts` → API endpoint (Route Handler)

**Example File Structure:**
```
app/
├── layout.tsx          # Root layout (wraps entire app)
├── page.tsx            # Home page (/)
├── loading.tsx         # Loading state for /
├── recipes/
│   ├── page.tsx        # /recipes
│   ├── [id]/
│   │   ├── page.tsx    # /recipes/:id (dynamic)
│   │   ├── loading.tsx # Loading state for recipe page
│   │   └── error.tsx   # Error boundary for recipe page
│   └── (browse)/       # Route group (doesn't affect URL)
│       ├── layout.tsx  # Layout for browse section
│       ├── @list/      # Parallel route slot
│       └── @preview/   # Parallel route slot
└── api/
    └── enhance/
        └── route.ts    # POST /api/enhance
```

### Benefits
1. **Colocated Files**: Keep components, tests, and styles next to routes
2. **Nested Layouts**: UI that persists across navigations (no re-renders)
3. **Instant Loading States**: Native Suspense integration
4. **Granular Error Handling**: Error boundaries at any level
5. **Server Components by Default**: Better performance, smaller bundles

---

## 2. Server Components vs Client Components

### Server Components (Default)

Server Components run **only on the server**. They can:
- Fetch data directly (no API layer needed)
- Access backend resources (databases, file system)
- Keep sensitive logic server-side (API keys, auth)
- Send zero JavaScript to the client

**Real Example - Recipe Page (Server Component):**
```tsx
// app/recipes/[id]/page.tsx
import { getCachedRecipe } from '@/lib/kv';
import { notFound } from 'next/navigation';

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipe = await getCachedRecipe(id);  // Direct database access

  if (!recipe) {
    notFound();  // Triggers not-found.tsx
  }

  return (
    <div>
      <h1>{recipe.title}</h1>
      {/* This component ships ZERO JS to the client */}
    </div>
  );
}
```

### Client Components

Add `'use client'` directive to components that need:
- Event handlers (`onClick`, `onChange`)
- Hooks (`useState`, `useEffect`, `useContext`)
- Browser APIs (`window`, `localStorage`)
- Third-party libraries that use these

**Real Example - Interactive Form (Client Component):**
```tsx
// components/add-recipe-form.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function AddRecipeForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveRecipeAction({ ... });
      if (result.success) {
        router.push(`/recipes/${result.id}`);
      }
    });
  };

  return (
    <Input value={url} onChange={(e) => setUrl(e.target.value)} />
  );
}
```

### Composition Pattern

Server Components can import Client Components, but NOT vice versa. Pass Server Component content as `children`:

```tsx
// Server Component
import { ClientWrapper } from './client-wrapper';
import { ServerData } from './server-data';

export default function Page() {
  return (
    <ClientWrapper>
      <ServerData />  {/* Server Component passed as children */}
    </ClientWrapper>
  );
}
```

### Benefits
| Server Components | Client Components |
|-------------------|-------------------|
| Zero bundle size impact | Interactive UI |
| Direct backend access | Browser APIs |
| Secure (keys stay server-side) | React hooks |
| Automatic code splitting | Real-time updates |

---

## 3. Rendering Strategies

### Static Rendering (Default)

Routes are rendered at **build time**. HTML is cached and reused for every request.

```tsx
// This page is statically rendered by default
export default async function RecipesPage() {
  const recipes = await getRecipes();  // Fetched at build time
  return <RecipeGrid recipes={recipes} />;
}
```

### Dynamic Rendering

Routes are rendered at **request time** when you:
- Use dynamic functions (`cookies()`, `headers()`, `searchParams`)
- Opt out of caching with `cache: 'no-store'`

```tsx
export default async function Page({ searchParams }) {
  const { q } = await searchParams;  // Dynamic: depends on request
  const results = await search(q);
  return <Results data={results} />;
}
```

### Incremental Static Regeneration (ISR)

Statically generate pages but revalidate after a time period:

```tsx
// Revalidate every 60 seconds
export const revalidate = 60;

export default async function Page() {
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 60 }
  });
}
```

### Streaming with Suspense

Progressively render UI, showing content as it becomes available:

```tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <div>
      <Header />  {/* Renders immediately */}
      <Suspense fallback={<GraphSkeleton />}>
        <InteractiveRecipe recipe={recipe} />  {/* Streams when ready */}
      </Suspense>
    </div>
  );
}
```

---

## 4. Data Fetching Patterns

### Server Component Data Fetching

Fetch data directly in async Server Components:

```tsx
// No useEffect, no loading states to manage manually
export default async function RecipePage({ params }) {
  const { id } = await params;
  const recipe = await getCachedRecipe(id);
  
  return <RecipeDetails recipe={recipe} />;
}
```

### Parallel Data Fetching

Fetch multiple resources simultaneously:

```tsx
export default async function Page() {
  // These run in parallel, not sequentially
  const [recipes, categories, featured] = await Promise.all([
    getRecipes(),
    getCategories(),
    getFeaturedRecipes()
  ]);
  
  return <Dashboard recipes={recipes} categories={categories} featured={featured} />;
}
```

### Request Memoization

Next.js automatically deduplicates identical `fetch` requests in a single render pass:

```tsx
// layout.tsx
const user = await getUser();  // Request 1

// page.tsx (child of layout)
const user = await getUser();  // Uses cached result from Request 1
```

### Sequential Data Fetching

When one request depends on another:

```tsx
export default async function Page({ params }) {
  const artist = await getArtist(params.id);
  const albums = await getAlbums(artist.id);  // Needs artist.id
  
  return <ArtistPage artist={artist} albums={albums} />;
}
```

---

## 5. Caching Mechanisms

Next.js has **four caching layers**:

### 1. Request Memoization
- **Where**: Server, during single render
- **What**: Deduplicates identical fetch requests
- **Duration**: Single request lifecycle

### 2. Data Cache
- **Where**: Server
- **What**: Persists fetch results across requests
- **Duration**: Until revalidated

```tsx
// Cached indefinitely (default)
fetch('https://api.example.com/data');

// Revalidate after 1 hour
fetch('https://api.example.com/data', {
  next: { revalidate: 3600 }
});

// No caching
fetch('https://api.example.com/data', {
  cache: 'no-store'
});

// Tag-based revalidation
fetch('https://api.example.com/recipes', {
  next: { tags: ['recipes'] }
});
```

### 3. Full Route Cache
- **Where**: Server
- **What**: Caches rendered HTML and RSC payload
- **Duration**: Until revalidated

### 4. Router Cache
- **Where**: Client (browser memory)
- **What**: Caches RSC payloads during navigation
- **Duration**: Session, or 30s for dynamic routes

### Revalidation Strategies

**Time-based:**
```tsx
export const revalidate = 60;  // Revalidate every 60 seconds
```

**On-demand:**
```tsx
import { revalidatePath, revalidateTag } from 'next/cache';

// Revalidate a specific path
revalidatePath('/recipes');

// Revalidate all data with a specific tag
revalidateTag('recipes');
```

**Real Example - On-Demand Revalidation:**
```tsx
// lib/actions.ts
'use server';

import { revalidateTag, revalidatePath } from 'next/cache';

export async function saveRecipeAction(input: RecipeInput) {
  await saveRecipe(recipe);
  
  // Invalidate caches so new recipe appears
  revalidateTag('recipes');
  revalidatePath('/');
  revalidatePath('/recipes');
  revalidatePath(`/recipes/${id}`);
  
  return { success: true, id };
}
```

---

## 6. Server Actions

Server Actions allow you to define server-side functions that can be called directly from Client Components. They're perfect for form submissions and mutations.

### Defining Server Actions

```tsx
// lib/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function saveRecipeAction(
  input: RecipeInput
): Promise<SaveRecipeResult> {
  try {
    // Validate input
    if (!input.title?.trim()) {
      return { success: false, error: 'Title is required' };
    }

    // Save to database
    const recipe = { id, ...input, createdAt: Date.now() };
    await saveRecipe(recipe);

    // Revalidate caches
    revalidatePath('/recipes');
    
    return { success: true, id };
  } catch (error) {
    return { success: false, error: 'Failed to save recipe' };
  }
}
```

### Using in Client Components

```tsx
'use client';

import { saveRecipeAction } from '@/lib/actions';

export function RecipeForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await saveRecipeAction({ title, ingredients, steps });
      if (result.success) {
        router.push(`/recipes/${result.id}`);
      }
    });
  };

  return (
    <button onClick={handleSubmit} disabled={isPending}>
      {isPending ? 'Saving...' : 'Save Recipe'}
    </button>
  );
}
```

### Benefits of Server Actions
1. **Type Safety**: Full TypeScript support, shared types between client/server
2. **Progressive Enhancement**: Works without JavaScript (with forms)
3. **No API Layer**: Direct function calls, no REST/GraphQL boilerplate
4. **Automatic Revalidation**: Built-in cache invalidation
5. **Security**: Server-side validation, no exposed endpoints

---

## 7. Route Handlers (API Routes)

Route Handlers let you create API endpoints using Web Request and Response APIs.

### Basic Route Handler

```tsx
// app/api/enhance/route.ts
import { streamObject } from 'ai';

export async function POST(req: Request) {
  try {
    const { url, existingRecipe } = await req.json();

    if (!url || typeof url !== 'string') {
      return Response.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Process and stream response
    const result = streamObject({
      model: gateway('openai/gpt-4'),
      schema: RecipeSchema,
      prompt: `Extract recipe from: ${url}`
    });

    return result.toTextStreamResponse();
  } catch (error) {
    return Response.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
```

### HTTP Methods

```tsx
export async function GET(request: Request) { }
export async function POST(request: Request) { }
export async function PUT(request: Request) { }
export async function PATCH(request: Request) { }
export async function DELETE(request: Request) { }
export async function HEAD(request: Request) { }
export async function OPTIONS(request: Request) { }
```

### Dynamic Route Handlers

```tsx
// app/api/recipes/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  return Response.json(recipe);
}
```

### Streaming Responses

```tsx
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of data) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise(r => setTimeout(r, 100));
      }
      controller.close();
    }
  });
  
  return new Response(stream);
}
```

---

## 8. Layouts & Nested Layouts

Layouts are UI that wraps pages and persists across navigations.

### Root Layout (Required)

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forked Recipes",
  description: "Visualize cooking as a dependency graph",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <Nav />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
```

### Nested Layouts

```tsx
// app/recipes/(browse)/layout.tsx
export default function RecipesBrowseLayout({
  list,
  preview,
}: {
  list: React.ReactNode;
  preview: React.ReactNode;
}) {
  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">{list}</div>
      <aside className="hidden lg:block w-[420px]">
        {preview}
      </aside>
    </div>
  );
}
```

### Benefits of Layouts
1. **State Preservation**: Layouts don't remount on navigation
2. **Partial Rendering**: Only page content re-renders
3. **Colocated UI**: Keep shared UI close to routes
4. **Nested Composition**: Build complex UIs incrementally

### Route Groups

Use `(folder)` syntax to organize without affecting URLs:

```
app/
├── (marketing)/     # Doesn't add /marketing to URL
│   ├── about/
│   └── blog/
├── (dashboard)/     # Doesn't add /dashboard to URL
│   ├── settings/
│   └── profile/
```

---

## 9. Loading UI & Streaming

### Instant Loading States

Create `loading.tsx` to show immediately while content loads:

```tsx
// app/recipes/(browse)/@list/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function ListLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Search skeleton */}
      <Skeleton className="h-10 w-full" />

      {/* Recipe Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Streaming with Suspense

Wrap slow components in Suspense boundaries:

```tsx
import { Suspense } from 'react';
import { GraphSkeleton } from '@/components/graph-skeleton';

export default async function RecipePage({ params }) {
  const recipe = await getCachedRecipe(id);

  return (
    <div className="space-y-8">
      {/* Fast content renders immediately */}
      <h1>{recipe.title}</h1>
      <IngredientsList ingredients={recipe.ingredients} />

      {/* Slow content streams in when ready */}
      <Suspense fallback={<GraphSkeleton />}>
        <InteractiveRecipe recipe={recipe} />
      </Suspense>
    </div>
  );
}
```

### Benefits
1. **Improved TTFB**: Send HTML shell immediately
2. **Progressive Loading**: Show content as it becomes available
3. **Better UX**: No blank screens, instant feedback
4. **SEO Friendly**: Crawlers see loading states, then content

---

## 10. Error Handling

### Error Boundaries

Create `error.tsx` to catch and handle errors gracefully:

```tsx
// app/recipes/[id]/error.tsx
'use client';  // Error components MUST be Client Components

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RecipeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <h2 className="text-xl font-semibold">Failed to load recipe</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/recipes">Back to recipes</Link>
        </Button>
      </div>
    </div>
  );
}
```

### Error Boundary Nesting

```
app/
├── error.tsx           # Catches errors from entire app
├── recipes/
│   ├── error.tsx       # Catches errors from /recipes/*
│   └── [id]/
│       └── error.tsx   # Catches errors only from /recipes/:id
```

### Not Found Handling

```tsx
// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div>
      <h2>Recipe Not Found</h2>
      <p>Could not find the requested recipe.</p>
      <Link href="/recipes">View all recipes</Link>
    </div>
  );
}

// Trigger programmatically
import { notFound } from 'next/navigation';

export default async function RecipePage({ params }) {
  const recipe = await getRecipe(params.id);
  if (!recipe) notFound();  // Renders not-found.tsx
}
```

### Global Error Handling

```tsx
// app/global-error.tsx
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

---

## 11. Parallel Routes

Parallel routes allow you to render multiple pages in the same layout simultaneously. They're defined using the `@folder` convention.

### Defining Parallel Routes

```
app/recipes/(browse)/
├── layout.tsx          # Receives @list and @preview as props
├── @list/
│   ├── page.tsx        # Renders in the list slot
│   ├── loading.tsx     # Loading state for list
│   └── default.tsx     # Fallback when slot has no match
├── @preview/
│   ├── page.tsx        # Renders in the preview slot
│   ├── default.tsx     # Fallback when slot has no match
│   └── preview/
│       └── [id]/
│           ├── page.tsx    # /recipes/preview/:id
│           └── loading.tsx
```

### Layout Receiving Slots

```tsx
// app/recipes/(browse)/layout.tsx
export default function RecipesBrowseLayout({
  list,      // @list slot
  preview,   // @preview slot
}: {
  list: React.ReactNode;
  preview: React.ReactNode;
}) {
  return (
    <div className="flex gap-6">
      {/* Main list area */}
      <div className="flex-1 min-w-0">{list}</div>
      
      {/* Preview panel - sticky sidebar */}
      <aside className="hidden lg:block w-[420px] shrink-0 sticky top-24">
        {preview}
      </aside>
    </div>
  );
}
```

### Default Files

`default.tsx` provides fallback content when a parallel route slot doesn't match:

```tsx
// app/recipes/(browse)/@preview/default.tsx
export default function PreviewDefault() {
  return (
    <Card className="h-full min-h-[400px] flex items-center justify-center">
      <CardContent className="text-center">
        <h3 className="font-semibold">Select a Recipe</h3>
        <p className="text-muted-foreground">
          Click on any recipe to preview its details here.
        </p>
      </CardContent>
    </Card>
  );
}
```

### Use Cases
1. **Dashboards**: Multiple widgets that load independently
2. **Master-Detail Views**: List + detail pane (like email apps)
3. **Modals**: Overlay routes that preserve background content
4. **Split Views**: Side-by-side content with different data sources

### Benefits
1. **Independent Loading**: Each slot has its own loading state
2. **Independent Errors**: Errors in one slot don't affect others
3. **Conditional Rendering**: Show/hide slots based on state
4. **URL-Driven**: Each slot can respond to different URL segments

---

## 12. Intercepting Routes

Intercepting routes let you load a route from another part of your application within the current layout. Useful for modals that can also be accessed directly.

### Convention

- `(.)` - Match segments on the **same level**
- `(..)` - Match segments **one level above**
- `(..)(..)` - Match segments **two levels above**
- `(...)` - Match segments from the **root**

### Example: Recipe Preview Modal

```
app/recipes/(browse)/
├── @preview/
│   └── preview/
│       └── [id]/
│           └── page.tsx    # Intercepts /recipes/preview/:id, shows in sidebar
├── preview/
│   └── [id]/
│       └── page.tsx        # Direct access shows full page
```

When clicking a recipe card that links to `/recipes/preview/:id`:
- Within the browse layout: Shows preview in the sidebar slot
- Direct navigation: Shows full preview page

### Use Cases
1. **Modals**: Instagram-style photo modals
2. **Preview Panels**: Quick view without full navigation
3. **Edit Forms**: Inline editing that can also be a full page
4. **Cart Sidebars**: Shopping cart as modal or full page

---

## 13. Dynamic Routes & generateStaticParams

### Dynamic Route Segments

```tsx
// app/recipes/[id]/page.tsx
interface RecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipe = await getCachedRecipe(id);
  
  if (!recipe) notFound();
  
  return <RecipeDetails recipe={recipe} />;
}
```

### generateStaticParams

Pre-render dynamic routes at build time:

```tsx
// app/recipes/[id]/page.tsx

// Generate static params for pre-rendering
export async function generateStaticParams() {
  const recipes = await getCachedRecipes();
  return recipes.map((recipe) => ({
    id: recipe.id,
  }));
}

export default async function RecipePage({ params }: RecipePageProps) {
  // This page is statically generated for each recipe
}
```

### Catch-All Segments

```tsx
// app/docs/[...slug]/page.tsx
// Matches /docs/a, /docs/a/b, /docs/a/b/c, etc.

export default function DocsPage({ 
  params 
}: { 
  params: Promise<{ slug: string[] }> 
}) {
  const { slug } = await params;
  // slug = ['a', 'b', 'c'] for /docs/a/b/c
}
```

### Optional Catch-All

```tsx
// app/docs/[[...slug]]/page.tsx
// Also matches /docs (slug = undefined)
```

---

## 14. Metadata & SEO

### Static Metadata

```tsx
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forked Recipes',
  description: 'Visualize cooking as a dependency graph',
  openGraph: {
    title: 'Forked Recipes',
    description: 'Visualize cooking as a dependency graph',
    images: ['/og-image.png'],
  },
};
```

### Dynamic Metadata

```tsx
// app/recipes/[id]/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ 
  params 
}: RecipePageProps): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getCachedRecipe(id);
  
  if (!recipe) {
    return { title: 'Recipe Not Found | Forked Recipes' };
  }

  return {
    title: `${recipe.title} | Forked Recipes`,
    description: recipe.description,
    openGraph: {
      title: recipe.title,
      description: recipe.description,
      images: recipe.imageUrl ? [recipe.imageUrl] : [],
    },
  };
}
```

### Dynamic OG Images

```tsx
// app/recipes/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { getCachedRecipe } from '@/lib/kv';

export const runtime = 'edge';
export const alt = 'Recipe preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const recipe = await getCachedRecipe(id);

  return new ImageResponse(
    (
      <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #f97316, #fbbf24)',
      }}>
        <div style={{ fontSize: 64, fontWeight: 'bold', color: 'white' }}>
          {recipe?.title}
        </div>
        <div style={{ fontSize: 28, color: '#78350f' }}>
          {recipe?.description}
        </div>
      </div>
    ),
    { ...size }
  );
}
```

### Sitemap Generation

```tsx
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { getCachedRecipes } from '@/lib/kv';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const recipes = await getCachedRecipes();
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/recipes`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...recipes.map((recipe) => ({
      url: `${baseUrl}/recipes/${recipe.id}`,
      lastModified: new Date(recipe.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
```

### robots.txt

```tsx
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: 'https://example.com/sitemap.xml',
  };
}
```

---

## 15. Image Optimization

### next/image Component

```tsx
import Image from 'next/image';

export function RecipeImage({ src, alt, priority }: RecipeImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill                      // Fill parent container
      className="object-cover"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
      priority={priority}       // Preload above-fold images
      onError={() => setHasError(true)}
    />
  );
}
```

### Configuration

```tsx
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',  // Allow all HTTPS images
      },
    ],
    // Or be specific:
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.example.com',
        pathname: '/recipes/**',
      },
    ],
  },
};
```

### Benefits
1. **Automatic Optimization**: WebP/AVIF conversion, resizing
2. **Lazy Loading**: Images load as they enter viewport
3. **Layout Stability**: Prevents Cumulative Layout Shift (CLS)
4. **Responsive**: Automatic srcset generation
5. **Blur Placeholders**: Smooth loading experience

### Sizes Attribute Best Practices

```tsx
// Full-width hero
<Image sizes="100vw" ... />

// Responsive grid
<Image sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" ... />

// Fixed sidebar
<Image sizes="300px" ... />
```

---

## 16. Font Optimization

### next/font/google

```tsx
// app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
```

### Benefits
1. **Zero Layout Shift**: Font files are hosted with your deployment
2. **Self-Hosted**: No external requests to Google Fonts
3. **Automatic Subsetting**: Only load characters you need
4. **CSS Variables**: Easy theming with CSS custom properties

### Local Fonts

```tsx
import localFont from 'next/font/local';

const myFont = localFont({
  src: './my-font.woff2',
  display: 'swap',
  variable: '--font-my-font',
});
```

---

## 17. Middleware

Middleware runs before a request is completed, allowing you to modify the response by rewriting, redirecting, or modifying headers.

### Basic Middleware

```tsx
// middleware.ts (root of project)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname
  const { pathname } = request.nextUrl;
  
  // Redirect old URLs
  if (pathname.startsWith('/old-recipes')) {
    return NextResponse.redirect(
      new URL('/recipes', request.url)
    );
  }
  
  // Add custom headers
  const response = NextResponse.next();
  response.headers.set('x-custom-header', 'my-value');
  
  return response;
}

// Configure which paths middleware runs on
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Authentication Example

```tsx
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  const { pathname } = request.nextUrl;
  
  // Protect dashboard routes
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(
      new URL('/login', request.url)
    );
  }
  
  return NextResponse.next();
}
```

### Geolocation & Localization

```tsx
export function middleware(request: NextRequest) {
  const country = request.geo?.country || 'US';
  const response = NextResponse.next();
  
  // Pass geo data to pages
  response.headers.set('x-user-country', country);
  
  // Or redirect based on locale
  if (country === 'DE' && !request.nextUrl.pathname.startsWith('/de')) {
    return NextResponse.redirect(new URL('/de' + request.nextUrl.pathname, request.url));
  }
  
  return response;
}
```

### Benefits
1. **Runs at the Edge**: Ultra-low latency (global execution)
2. **Before Cached Content**: Modify requests before hitting cache
3. **Authentication**: Protect routes without client-side checks
4. **A/B Testing**: Route users to different variants
5. **Geolocation**: Personalize by region

---

## 18. Edge Runtime

### Edge vs Node.js Runtime

| Feature | Edge Runtime | Node.js Runtime |
|---------|--------------|-----------------|
| Cold Start | ~0ms | ~250ms |
| Bundle Size | Limited (< 4MB) | Unlimited |
| APIs | Web APIs only | Full Node.js |
| Use Case | Simple, fast responses | Complex processing |

### Using Edge Runtime

```tsx
// app/api/fast/route.ts
export const runtime = 'edge';

export async function GET() {
  return Response.json({ message: 'Hello from the edge!' });
}
```

### Edge-Compatible OG Images

```tsx
// app/recipes/[id]/opengraph-image.tsx
export const runtime = 'edge';  // Runs at the edge for fast OG image generation

export default async function Image({ params }) {
  return new ImageResponse(/* ... */);
}
```

### When to Use Edge
- **Authentication checks**: Fast token validation
- **Redirects**: URL routing logic
- **A/B testing**: Quick variant assignment
- **Geolocation**: Region-based responses
- **Simple APIs**: JSON responses, no heavy computation

### When to Use Node.js
- **Database connections**: Most DB drivers need Node.js
- **File system**: Reading/writing files
- **Heavy computation**: Complex data processing
- **Legacy packages**: Many npm packages need Node.js APIs

---

## 19. Performance Features

### Automatic Code Splitting

Next.js automatically splits code by route:

```
/recipes → loads only recipes page code
/add → loads only add page code
```

### Dynamic Imports

Load components only when needed:

```tsx
import dynamic from 'next/dynamic';

// Load heavy component only on client
const RecipeGraph = dynamic(
  () => import('@/components/recipe-graph'),
  { 
    loading: () => <GraphSkeleton />,
    ssr: false  // Skip server-side render
  }
);
```

### Bundle Analyzer

```bash
npm install @next/bundle-analyzer
```

```tsx
// next.config.ts
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
```

### Script Optimization

```tsx
import Script from 'next/script';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Script 
        src="https://analytics.example.com/script.js"
        strategy="lazyOnload"  // Load after page is interactive
      />
    </>
  );
}
```

### Prefetching

Next.js automatically prefetches linked routes:

```tsx
import Link from 'next/link';

// This prefetches /recipes when link is in viewport
<Link href="/recipes">View Recipes</Link>

// Disable prefetching
<Link href="/recipes" prefetch={false}>View Recipes</Link>
```

---

## 20. TypeScript Integration

### First-Class Support

Next.js has built-in TypeScript support with zero configuration:

```bash
# Automatically sets up TypeScript
npx create-next-app@latest --typescript
```

### Typed Route Params

```tsx
interface RecipePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function RecipePage({ params, searchParams }: RecipePageProps) {
  const { id } = await params;
  const { q } = await searchParams;
}
```

### Typed Metadata

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Page',
  description: 'Page description',
};
```

### Typed Route Handlers

```tsx
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({ id });
}
```

### Strict Type Checking

```tsx
// next.config.ts
const nextConfig = {
  typescript: {
    // Fail build on type errors
    ignoreBuildErrors: false,
  },
};
```

---

## Interview Tips

### Common Questions & Talking Points

1. **"Why Next.js over plain React?"**
   - Server Components reduce client bundle size
   - Built-in routing, caching, image optimization
   - Hybrid rendering (static + dynamic + streaming)
   - Zero-config deployment on Vercel

2. **"Explain Server vs Client Components"**
   - Server: Data fetching, secure logic, zero JS shipped
   - Client: Interactivity, hooks, browser APIs
   - Pattern: Server by default, add 'use client' when needed

3. **"How does caching work?"**
   - Four layers: Request Memoization → Data Cache → Route Cache → Router Cache
   - Revalidation: Time-based (`revalidate`) or on-demand (`revalidatePath`)

4. **"What are Server Actions?"**
   - RPC-style mutations, type-safe, progressive enhancement
   - Replace API routes for form submissions
   - Built-in security (encrypted action IDs)

5. **"Explain the App Router"**
   - File-system routing with special files (page, layout, loading, error)
   - Nested layouts that persist across navigations
   - Parallel routes for complex UIs
   - Server Components by default

### Key Differentiators to Highlight

1. **Performance**: Automatic code splitting, streaming, Edge runtime
2. **DX**: Hot reload, TypeScript, error overlays
3. **SEO**: Built-in metadata, sitemap, OG images
4. **Deployment**: Vercel's global edge network, automatic HTTPS
5. **Ecosystem**: Huge community, extensive documentation, active development

---

## Quick Reference

### File Conventions
| File | Purpose |
|------|---------|
| `page.tsx` | Route segment UI |
| `layout.tsx` | Shared UI wrapper |
| `loading.tsx` | Suspense loading UI |
| `error.tsx` | Error boundary |
| `not-found.tsx` | 404 page |
| `route.ts` | API endpoint |
| `default.tsx` | Parallel route fallback |
| `opengraph-image.tsx` | Dynamic OG image |

### Data Fetching
```tsx
// Server Component (default)
const data = await fetch(url);

// Cached (default)
fetch(url);

// Revalidate
fetch(url, { next: { revalidate: 60 } });

// No cache
fetch(url, { cache: 'no-store' });

// Tagged
fetch(url, { next: { tags: ['recipes'] } });
```

### Revalidation
```tsx
// Time-based
export const revalidate = 60;

// On-demand
revalidatePath('/recipes');
revalidateTag('recipes');
```

### Navigation
```tsx
// Client-side
import { useRouter } from 'next/navigation';
const router = useRouter();
router.push('/recipes');
router.replace('/recipes');
router.refresh();

// Server-side
import { redirect, notFound } from 'next/navigation';
redirect('/login');
notFound();
```

---

Good luck with your interview! Remember to speak confidently about the concepts and provide concrete examples from your experience.
