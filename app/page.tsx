import Link from 'next/link';
import { getCachedFeaturedRecipes, getRecipeCount } from '@/lib/kv';
import { RecipeGrid } from '@/components/recipe-grid';
import { Button } from '@/components/ui/button';

export default async function Home() {
  // Parallel data fetching - both requests run simultaneously
  const [featuredRecipes, totalCount] = await Promise.all([
    getCachedFeaturedRecipes(),
    getRecipeCount(),
  ]);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Async Recipes
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Recipes for engineers: visualize cooking as a dependency graph to maximize parallelism.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button asChild size="lg">
            <Link href="/recipes">
              Browse {totalCount} Recipes
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/add">
              Add from URL
            </Link>
          </Button>
        </div>
      </section>

      {/* Featured Recipes */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            Featured Recipes
          </h2>
          <Link 
            href="/recipes" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all →
          </Link>
        </div>
        <RecipeGrid recipes={featuredRecipes} />
      </section>

      {/* How It Works */}
      <section className="space-y-6 py-8 border-t">
        <h2 className="text-2xl font-semibold tracking-tight text-center">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="text-4xl">📊</div>
            <h3 className="font-semibold">Dependency Graph</h3>
            <p className="text-sm text-muted-foreground">
              Each recipe shows which steps depend on others, visualized as an interactive graph.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-4xl">⚡</div>
            <h3 className="font-semibold">Parallel Steps</h3>
            <p className="text-sm text-muted-foreground">
              Identify which tasks can run in parallel to cook more efficiently.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-4xl">🤖</div>
            <h3 className="font-semibold">AI Extraction</h3>
            <p className="text-sm text-muted-foreground">
              Paste any recipe URL and AI extracts the steps with dependency analysis.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
