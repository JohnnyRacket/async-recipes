import { Metadata } from 'next';
import { getCachedRecipes } from '@/lib/kv';
import { RecipeGrid } from '@/components/recipe-grid';

export const metadata: Metadata = {
  title: 'All Recipes | Async Recipes',
  description: 'Browse all recipes with dependency graph visualization.',
};

export default async function RecipesPage() {
  const recipes = await getCachedRecipes();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">All Recipes</h1>
        <p className="text-muted-foreground">
          {recipes.length} recipes available. Click any recipe to see its dependency graph.
        </p>
      </div>
      <RecipeGrid recipes={recipes} />
    </div>
  );
}
