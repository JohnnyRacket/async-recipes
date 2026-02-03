# Async Recipes: Progress Report

**Vercel Take-Home Assignment**  
**Report Date:** February 2, 2026  
**Next.js Version:** 16.1.6 | **React Version:** 19.2.3

---

## Executive Summary

This app was built to demonstrate comprehensive knowledge of Next.js and Vercel features. The goal was to use as many Next.js/Vercel concepts correctly as possible while building a functional recipe management application.

**Overall Assessment:** The app makes excellent use of Next.js features, with a particularly strong implementation of parallel routes, caching with `'use cache'`, server actions, and AI streaming. Several features initially marked as "missed opportunities" in planning have been implemented. Some areas still need attention.

---

## Table of Contents

1. [Planned vs Implemented](#1-planned-vs-implemented)
2. [What Changed Along the Way](#2-what-changed-along-the-way)
3. [Exhaustive Feature List](#3-exhaustive-feature-list)
4. [Issues & Bugs Found](#4-issues--bugs-found)
5. [Missed Opportunities](#5-missed-opportunities)
6. [Recommendations](#6-recommendations)

---

## 1. Planned vs Implemented

### Features Successfully Implemented

| Planned Feature | Status | Notes |
|-----------------|--------|-------|
| Server Components | ✅ Implemented | ~50% server components, proper split |
| Client Components | ✅ Implemented | Only where necessary (forms, graphs, interactivity) |
| `'use cache'` directive | ✅ Implemented | 6 cached functions in `lib/kv.ts` |
| `cacheTag()` | ✅ Implemented | All functions use `'recipes'` tag |
| `cacheLife()` | ✅ Implemented | 1-hour and 24-hour revalidation |
| `revalidateTag()` | ✅ Implemented | Uses v16 two-param syntax with `'max'` profile |
| `revalidatePath()` | ✅ Implemented | Invalidates specific routes |
| Server Actions | ✅ Implemented | `saveRecipeAction`, `deleteRecipeAction`, `loadMoreRecipes` |
| Loading States (`loading.tsx`) | ✅ Implemented | Root, `/recipes`, `/recipes/[id]`, parallel slots |
| Error Boundaries (`error.tsx`) | ✅ Implemented | Root, `/add`, `/recipes`, `/recipes/[id]` |
| Not Found (`not-found.tsx`) | ✅ Implemented | Custom 404 page |
| Dynamic Routes (`[id]`) | ✅ Implemented | `/recipes/[id]` with params |
| `generateStaticParams` | ✅ Implemented | Pre-renders known recipes |
| `generateMetadata` | ✅ Implemented | Dynamic SEO per recipe |
| Metadata Export | ✅ Implemented | Static metadata in layout, pages |
| Suspense Boundaries | ✅ Implemented | 5 boundaries across pages |
| Parallel Data Fetching | ✅ Implemented | `Promise.all()` on home page |
| API Route Handlers | ✅ Implemented | POST `/api/ingest`, `/api/enhance` |
| Streaming Responses | ✅ Implemented | `streamObject` + `toTextStreamResponse()` |
| Font Optimization | ✅ Implemented | Geist Sans/Mono via `next/font` |
| `useTransition` | ✅ Implemented | Non-blocking saves and searches |
| Parallel Routes | ✅ Implemented | `@list` and `@preview` slots |
| Route Groups | ✅ Implemented | `(browse)` for organization |
| `next/image` | ✅ Implemented | In `recipe-image.tsx` |
| `next/link` | ✅ Implemented | In `nav.tsx`, `recipe-card.tsx` |
| Vercel KV | ✅ Implemented | Full CRUD with `@upstash/redis` |
| AI SDK | ✅ Implemented | `streamObject`, `useObject`, Gateway |
| Rate Limiting | ✅ Implemented | In `proxy.ts` |
| Dark Mode Support | ✅ Implemented | CSS variables in `globals.css` |

### Features Planned but Not Implemented

| Planned Feature | Status | Reason |
|-----------------|--------|--------|
| Intercepting Routes | ❌ Not Implemented | Could add modal preview |
| PPR (Partial Prerendering) | ❌ Not Implemented | Could enable for instant shell |
| Draft Mode | ❌ Not Implemented | Not needed for current use case |
| Catch-all Routes | ❌ Not Implemented | No use case identified |
| Proxy (Next.js 16) | ✅ Implemented | Uses `proxy.ts` with correct export (middleware renamed in v16) |

---

## 2. What Changed Along the Way

### Major Additions (Not in Original Plan)

1. **Parallel Routes Implementation**
   - Originally listed as "missed opportunity"
   - Now fully implemented with `@list` and `@preview` slots
   - Provides split-view browsing experience on desktop

2. **Error Boundaries Added**
   - Originally listed as "missing"
   - Now has 4 error boundaries: root, `/add`, `/recipes`, `/recipes/[id]`
   - All include reset functionality

3. **Image Optimization**
   - Originally listed as "missing"
   - Now implemented in `recipe-image.tsx`
   - Uses `fill`, `sizes`, `priority`, and `onError` handling

4. **Cooking Mode Feature**
   - Not in original plan
   - Added interactive cooking experience with:
     - Step tracking
     - Timer management
     - Audio notifications (Web Audio API)
     - Keyboard navigation

5. **Infinite Scroll / Pagination**
   - Added `recipe-infinite-list.tsx`
   - Uses Intersection Observer
   - Server action for loading more

6. **Search with Debouncing**
   - Added `recipe-search-input.tsx`
   - URL-based search state
   - Debounced queries

7. **Two-Phase AI Processing**
   - Added `/api/enhance` route
   - Initial extraction + enhancement pass
   - Better metadata extraction (duration, isPassive, needsTimer)

### Next.js 16 Conventions (Correctly Implemented)

1. **Proxy (renamed from Middleware)**
   - Uses `proxy.ts` with `export function proxy()` - correct for Next.js 16
   - The `middleware` convention was renamed to `proxy` in v16 to better reflect its purpose at the network boundary
   - Rate limiting implementation follows best practices

2. **`revalidateTag` with Two Parameters**
   - Uses `revalidateTag('recipes', 'max')` - correct for Next.js 16
   - The second parameter `'max'` is the recommended profile using stale-while-revalidate semantics
   - Single-argument form is now deprecated in v16

### Architecture Evolution

1. **Proxy Implementation**
   - Correctly uses Next.js 16 `proxy.ts` convention
   - Rate limiting for AI endpoints (`/api/ingest`, `/api/enhance`)
   - Proper config matcher for targeted routes

2. **Route Structure**
   - Started with flat `/recipes/page.tsx`
   - Evolved to `(browse)` route group with parallel slots
   - Enables preview without full navigation

3. **Caching Strategy**
   - Maintained `'use cache'` directive approach
   - Uses Next.js 16 `revalidateTag(tag, 'max')` for stale-while-revalidate semantics
   - Consistent 1-hour TTL across most queries

---

## 3. Exhaustive Feature List

### App Router Features

| Feature | Location | Description |
|---------|----------|-------------|
| File-based Routing | `app/` | All routes defined via file system |
| Dynamic Routes | `app/recipes/[id]/` | Parameterized recipe pages |
| Route Groups | `app/recipes/(browse)/` | Organize without affecting URL |
| Parallel Routes | `@list/`, `@preview/` | Simultaneous route segments |
| Layouts | `app/layout.tsx`, `(browse)/layout.tsx` | Shared UI across routes |
| Loading UI | 4 `loading.tsx` files | Instant loading states |
| Error Boundaries | 4 `error.tsx` files | Graceful error recovery |
| Not Found | `app/not-found.tsx` | Custom 404 page |
| `notFound()` | `app/recipes/[id]/page.tsx` | Programmatic 404 |
| Default Pages | `@list/default.tsx`, `@preview/default.tsx` | Parallel route fallbacks |

### Data Fetching & Caching

| Feature | Location | Description |
|---------|----------|-------------|
| `'use cache'` directive | `lib/kv.ts` | 6 cached functions |
| `cacheTag()` | `lib/kv.ts` | Tag-based cache invalidation |
| `cacheLife()` | `lib/kv.ts` | Time-based revalidation (1h, 24h) |
| `revalidateTag()` | `lib/actions.ts` | On-demand tag invalidation (v16 two-param with `'max'`) |
| `revalidatePath()` | `lib/actions.ts` | On-demand path invalidation |
| Parallel Fetching | `app/page.tsx` | `Promise.all()` for concurrent data |
| `generateStaticParams` | `app/recipes/[id]/page.tsx` | Build-time static generation |

### Server Features

| Feature | Location | Description |
|---------|----------|-------------|
| Server Components | Most pages/components | Default rendering mode |
| Server Actions | `lib/actions.ts` | `'use server'` mutations |
| Route Handlers | `app/api/*/route.ts` | API endpoints |
| Streaming | `app/api/*/route.ts` | `toTextStreamResponse()` |

### Client Features

| Feature | Location | Description |
|---------|----------|-------------|
| `'use client'` | 10 components | Client-side interactivity |
| `useState` | Multiple components | Local state management |
| `useEffect` | Multiple components | Side effects, timers |
| `useTransition` | Form, search, list | Non-blocking updates |
| `useRouter` | Form, card | Programmatic navigation |
| `usePathname` | Card, search | Current path access |
| `useSearchParams` | Card, search | URL query params |
| `useCallback/useMemo` | Graph, cooking hook | Performance optimization |

### SEO & Metadata

| Feature | Location | Description |
|---------|----------|-------------|
| Static Metadata | `app/layout.tsx`, pages | Title, description |
| `generateMetadata` | `app/recipes/[id]/page.tsx` | Dynamic SEO per recipe |
| Viewport | Inherited from Next.js | Responsive viewport |

### Performance Optimizations

| Feature | Location | Description |
|---------|----------|-------------|
| `next/font` | `app/layout.tsx` | Self-hosted Geist fonts |
| `next/image` | `components/recipe-image.tsx` | Optimized images |
| `next/link` | `nav.tsx`, `recipe-card.tsx` | Prefetched navigation |
| Suspense | 5 boundaries | Streaming component loading |
| Code Splitting | Client components | Automatic per-component |

### Styling

| Feature | Location | Description |
|---------|----------|-------------|
| Tailwind CSS 4 | `globals.css` | Utility-first styling |
| CSS Variables | `globals.css` | Theme tokens |
| Dark Mode | `globals.css` | `.dark` variant support |
| tw-animate-css | `globals.css` | Animation utilities |
| shadcn/ui | `components/ui/` | Accessible components |
| Radix UI | Badge, Button, etc. | Primitive components |

### Third-Party Integrations

| Feature | Location | Description |
|---------|----------|-------------|
| Vercel KV | `lib/kv.ts` | Redis-compatible data store |
| AI SDK | Forms, API routes | Structured AI streaming |
| AI Gateway | API routes | Model routing (`openai/gpt-oss-20b`) |
| ReactFlow | `recipe-graph.tsx` | Interactive graph visualization |
| Dagre | `recipe-graph.tsx` | Automatic graph layout |
| Zod | `lib/schemas.ts` | Schema validation |

### Vercel Platform Features

| Feature | Location | Description |
|---------|----------|-------------|
| Vercel KV | `lib/kv.ts` | Serverless Redis |
| AI Gateway | API routes | Unified model access |
| Proxy (v16) | `proxy.ts` | Rate limiting at network boundary (renamed from middleware) |
| Edge Config Ready | `next.config.ts` | `remotePatterns` for images |

### Custom Hooks

| Feature | Location | Description |
|---------|----------|-------------|
| `useCookingState` | `hooks/use-cooking-state.ts` | Cooking mode state machine |

---

## 4. Issues & Bugs Found

### Medium Issues

1. **Server Component with `useSearchParams`**
   - **File:** `components/recipe-card.tsx`
   - **Issue:** Uses client hooks (`useRouter`, `usePathname`, `useSearchParams`) so must be client component
   - **Status:** Already has `'use client'` - correctly implemented

2. **Missing Error Boundary in Route Group**
   - **File:** `app/recipes/(browse)/`
   - **Issue:** No `error.tsx` inside the `(browse)` route group
   - **Impact:** Errors in parallel slots bubble up to parent
   - **Fix:** Add `app/recipes/(browse)/error.tsx`

3. **Inconsistent Cache TTLs**
   - **File:** `lib/kv.ts`
   - **Issue:** Individual recipe cache is 24h but list is 1h
   - **Impact:** After adding recipe, detail shows but list may be stale
   - **Note:** This might be intentional for reducing KV calls

### Minor Issues

4. **`step-timer.tsx` Unnecessary Client Directive**
   - **File:** `components/step-timer.tsx`
   - **Issue:** Marked as `'use client'` but doesn't use hooks
   - **Impact:** Small bundle size increase
   - **Fix:** Remove directive if only used in server context

5. **Image in Add Form Uses `<img>` Not `next/image`**
   - **File:** `components/add-recipe-form.tsx`
   - **Issue:** Uses regular `<img>` tag for preview
   - **Impact:** No optimization for preview images
   - **Fix:** Use `next/image` with `unoptimized` prop if needed

6. **No `fetchCache` Configuration**
   - **File:** `app/api/*/route.ts`
   - **Issue:** External fetches (recipe URLs) use default caching
   - **Impact:** May cache external recipe pages unnecessarily
   - **Fix:** Add `cache: 'no-store'` to external fetches

---

## 5. Missed Opportunities

### High Impact

1. **Partial Prerendering (PPR)**
   - **What:** Static shell + dynamic streaming
   - **Why:** Instant first paint, streaming content
   - **How:** Enable in `next.config.ts`:
   ```typescript
   experimental: {
     ppr: true,
   }
   ```

2. **Intercepting Routes for Modal Preview**
   - **What:** Show recipe preview as modal without full navigation
   - **Why:** E-commerce pattern, keeps context
   - **How:**
   ```
   app/
   ├── recipes/
   │   ├── page.tsx
   │   └── (.)[id]/     # Intercepting route
   │       └── page.tsx  # Modal content
   ```

3. **OpenGraph Images**
   - **What:** Dynamic social preview images
   - **Why:** Better social sharing, professional appearance
   - **How:** Add `app/recipes/[id]/opengraph-image.tsx`

### Medium Impact

4. **Route Segment Config**
   - **What:** `export const dynamic`, `export const revalidate`
   - **Why:** Fine-grained control per route
   - **How:**
   ```typescript
   // app/recipes/page.tsx
   export const revalidate = 3600; // 1 hour
   ```

5. **Streaming with Multiple Suspense Boundaries**
   - **What:** More granular Suspense for ingredients, steps separately
   - **Why:** Progressive rendering
   - **Current:** Only graph has Suspense boundary

6. **Edge Runtime for Read-Only Pages**
   - **What:** Edge runtime for recipe list/detail
   - **Why:** Lower latency globally
   - **Note:** Blocked by `cacheComponents: true` currently

7. **React `cache()` for Request Memoization**
   - **What:** `import { cache } from 'react'`
   - **Why:** Dedupe fetches within single request
   - **Current:** Not used, relying on `'use cache'` only

### Lower Impact

8. **`instrumentation.ts` for Monitoring**
   - **What:** Server-side instrumentation hook
   - **Why:** Performance monitoring, error tracking

9. **Parallel Route Modal Pattern**
   - **What:** `@modal` slot for overlays
   - **Why:** Full modal control without layout shift

10. **Sitemap Generation**
    - **What:** `app/sitemap.ts`
    - **Why:** SEO, search engine indexing
    - **How:**
    ```typescript
    export default async function sitemap() {
      const recipes = await getCachedRecipes();
      return recipes.map(recipe => ({
        url: `https://example.com/recipes/${recipe.id}`,
        lastModified: recipe.updatedAt,
      }));
    }
    ```

11. **Robots.txt**
    - **What:** `app/robots.ts`
    - **Why:** Control search engine crawling

---

## 6. Recommendations

### Must Fix Before Submission

1. **Add `error.tsx` to `(browse)` route group** for complete error handling

### Should Add for Completeness

1. **Enable PPR** in `next.config.ts`
2. **Add `sitemap.ts` and `robots.ts`** for SEO
3. **Add OpenGraph image generation** for social sharing

### Nice to Have

1. **Add intercepting route** for recipe preview modal
2. **Add more Suspense boundaries** on recipe detail page
3. **Add `instrumentation.ts`** for observability

### Documentation Points for Interview

When discussing this project, emphasize:

1. **Next.js 16 Conventions** - Uses `proxy.ts` (renamed from middleware) and `revalidateTag(tag, 'max')` two-param syntax
2. **Parallel Routes** - Advanced feature showing understanding of simultaneous route segments
3. **`'use cache'` + `cacheTag`** - Modern caching approach vs legacy `fetch` options
4. **`revalidateTag` with `'max'` profile** - Demonstrates understanding of stale-while-revalidate semantics in v16
5. **Server/Client Component Split** - Clear reasoning for each decision
6. **AI SDK Integration** - Streaming structured output with type safety
7. **Progressive Enhancement** - Works without JS for basic navigation
8. **Cooking Mode** - Shows understanding of complex client-side state management
9. **Performance** - Font optimization, image optimization, code splitting

---

## Feature Count Summary

| Category | Count |
|----------|-------|
| App Router Features | 10 |
| Data Fetching/Caching Features | 7 |
| Server Features | 4 |
| Client Features | 9 |
| SEO Features | 3 |
| Performance Features | 5 |
| Styling Features | 6 |
| Third-Party Integrations | 7 |
| Vercel Platform Features | 4 |
| **Total Distinct Features** | **55+** |

---

*This report was generated to assess the Async Recipes application for its use of Next.js and Vercel features as part of a take-home interview assignment.*
