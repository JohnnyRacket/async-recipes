import { Suspense } from 'react';
import { getCachedSearchRecipes } from '@/lib/kv';
import { RecipeSearchInput } from '@/components/recipe-search-input';
import { RecipeInfiniteList } from '@/components/recipe-infinite-list';
import { Skeleton } from '@/components/ui/skeleton';

interface ListPreviewPageProps {
  searchParams: Promise<{ q?: string }>;
}

// List slot content when viewing /recipes/preview/[id]
export default async function ListPreviewPage({ searchParams }: ListPreviewPageProps) {
  const { q: query } = await searchParams;
  
  const initialData = await getCachedSearchRecipes({
    query,
    limit: 9,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">All Recipes</h1>
        <p className="text-muted-foreground">
          {initialData.totalCount} recipes available.
          {' '}
          <span className="hidden lg:inline">Click any recipe to preview, or view the full page.</span>
          <span className="lg:hidden">Click any recipe to see its dependency graph.</span>
        </p>
      </div>

      <RecipeSearchInput defaultValue={query} />

      <Suspense key={query || 'all'} fallback={<RecipeGridSkeleton />}>
        <RecipeInfiniteList
          initialRecipes={initialData.recipes}
          initialCursor={initialData.nextCursor}
          searchQuery={query}
          totalCount={initialData.totalCount}
        />
      </Suspense>
    </div>
  );
}

function RecipeGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-lg" />
      ))}
    </div>
  );
}
