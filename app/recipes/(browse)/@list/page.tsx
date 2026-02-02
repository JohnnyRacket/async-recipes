import { Suspense } from 'react';
import { Metadata } from 'next';
import { getCachedSearchRecipes } from '@/lib/kv';
import { RecipeSearchInput } from '@/components/recipe-search-input';
import { RecipeInfiniteList } from '@/components/recipe-infinite-list';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'All Recipes | Async Recipes',
  description: 'Browse all recipes with dependency graph visualization.',
};

interface RecipesListPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function RecipesListPage({ searchParams }: RecipesListPageProps) {
  const { q: query } = await searchParams;
  
  // Initial fetch with search params
  const initialData = await getCachedSearchRecipes({
    query,
    limit: 9,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">All Recipes</h1>
        <p className="text-muted-foreground">
          {initialData.totalCount} recipes available. 
          {' '}
          <span className="hidden lg:inline">Click any recipe to preview, or view the full page.</span>
          <span className="lg:hidden">Click any recipe to see its dependency graph.</span>
        </p>
      </div>

      {/* Search */}
      <RecipeSearchInput defaultValue={query} />

      {/* Recipe Grid with Infinite Scroll */}
      <Suspense 
        key={query || 'all'} 
        fallback={<RecipeGridSkeleton />}
      >
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
