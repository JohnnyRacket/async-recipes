import Link from 'next/link';
import { RecipeGrid } from '@/components/recipe-grid';
import type { Recipe } from '@/lib/types';

export function RecentlyForked({ recipes }: { recipes: Recipe[] }) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          🍴 Recently Forked
        </h2>
        <Link
          href="/recipes"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View all →
        </Link>
      </div>
      <RecipeGrid recipes={recipes} />
    </section>
  );
}
