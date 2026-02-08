import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HeroSection({ totalCount }: { totalCount: number }) {
  return (
    <section className="text-center py-12 space-y-4">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        🍴 Forked Recpes
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
}
