import Link from 'next/link';
import { getCachedRecentRecipes, getCachedRecipeCount } from '@/lib/kv';
import { RecipeGrid } from '@/components/recipe-grid';
import { Button } from '@/components/ui/button';
import { ABTracker } from '@/components/ab-tracker';

export function generateStaticParams() {
  return [{ variant: 'a' }, { variant: 'b' }];
}

export default async function Home({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;

  // Parallel data fetching - both requests run simultaneously
  const [recentRecipes, totalCount] = await Promise.all([
    getCachedRecentRecipes(3),
    getCachedRecipeCount(),
  ]);

  const heroSection = (
    <section className="text-center py-12 space-y-4">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        🍴 Forked Recipes
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        Fork recipes. Cook in parallel with friends. Share your favorite recipes.
      </p>
      <div className="flex justify-center gap-4 pt-4">
        <Button asChild size="lg">
          <Link href="/recipes">
            Browse {totalCount} Recipes
          </Link>
        </Button>
        <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500 shadow-md">
          <Link href="/add">
            ✨ Fork a Recipe
          </Link>
        </Button>
      </div>
    </section>
  );

  const recipesSection = (
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
      <RecipeGrid recipes={recentRecipes} />
    </section>
  );

  const howItWorksSection = (
    <section className="space-y-8 py-12 border-t">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          How It Works
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Fork any recipe in one click. Our AI does the heavy lifting so you can cook smarter.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-2xl transform group-hover:scale-105 transition-transform" />
          <div className="relative p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center text-2xl shadow-lg">
              🔗
            </div>
            <h3 className="font-semibold text-lg">1. Paste Any Recipe URL</h3>
            <p className="text-sm text-muted-foreground">
              Found a recipe you love? Just copy the link from any cooking website.
            </p>
          </div>
        </div>
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-2xl transform group-hover:scale-105 transition-transform" />
          <div className="relative p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center text-2xl shadow-lg">
              ✨
            </div>
            <h3 className="font-semibold text-lg">2. One Click to Fork</h3>
            <p className="text-sm text-muted-foreground">
              Hit the button and watch AI extract ingredients, steps, timing, and build your dependency graph instantly.
            </p>
          </div>
        </div>
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-2xl transform group-hover:scale-105 transition-transform" />
          <div className="relative p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center text-2xl shadow-lg">
              ⚡
            </div>
            <h3 className="font-semibold text-lg">3. Cook in Parallel</h3>
            <p className="text-sm text-muted-foreground">
              See which tasks can run simultaneously. Prep veggies while the oven preheats!
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="space-y-12">
      <ABTracker variant={variant} />
      {variant === 'b' ? (
        <>
          {recipesSection}
          {heroSection}
          {howItWorksSection}
        </>
      ) : (
        <>
          {heroSection}
          {recipesSection}
          {howItWorksSection}
        </>
      )}
    </div>
  );
}
