'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Recipe } from '@/lib/types';
import { loadMoreRecipes } from '@/lib/actions';
import { RecipeCard } from './recipe-card';
import { Skeleton } from '@/components/ui/skeleton';

interface RecipeInfiniteListProps {
  initialRecipes: Recipe[];
  initialCursor: string | null;
  searchQuery?: string;
  totalCount: number;
}

export function RecipeInfiniteList({
  initialRecipes,
  initialCursor,
  searchQuery,
  totalCount,
}: RecipeInfiniteListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset when search query changes
  useEffect(() => {
    setRecipes(initialRecipes);
    setCursor(initialCursor);
  }, [initialRecipes, initialCursor, searchQuery]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!cursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && cursor && !isPending) {
          startTransition(async () => {
            const result = await loadMoreRecipes({
              query: searchQuery,
              cursor,
              limit: 9,
            });
            setRecipes((prev) => [...prev, ...result.recipes]);
            setCursor(result.nextCursor);
          });
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [cursor, isPending, searchQuery, startTransition]);

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {searchQuery ? (
          <>
            No recipes found for &quot;{searchQuery}&quot;.{' '}
            <a href="/recipes" className="underline hover:text-foreground">
              Clear search
            </a>
          </>
        ) : (
          'No recipes found. Add your first recipe!'
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recipe Grid - 2 columns on desktop to leave room for preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} previewMode />
        ))}
      </div>

      {/* Load More Trigger */}
      {cursor && (
        <div ref={loadMoreRef} className="py-8">
          {isPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground text-sm">
              Scroll to load more...
            </p>
          )}
        </div>
      )}

      {/* End of List */}
      {!cursor && recipes.length > 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">
          Showing all {totalCount} recipes
        </p>
      )}
    </div>
  );
}
