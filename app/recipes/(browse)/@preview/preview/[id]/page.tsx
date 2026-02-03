import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCachedRecipe } from '@/lib/kv';
import { RecipeGraph } from '@/components/recipe-graph';
import { GraphSkeleton } from '@/components/graph-skeleton';
import { RecipeImage } from '@/components/recipe-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Icon components
function StepsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function IngredientsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  );
}

function ParallelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 6v6l4 2" />
    </svg>
  );
}

function CaloriesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  );
}

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const recipe = await getCachedRecipe(id);

  if (!recipe) {
    notFound();
  }

  const parallelSteps = recipe.steps.filter((s) => s.dependsOn.length === 0).length;
  const totalTime = recipe.steps.reduce((sum, step) => sum + (step.duration || 0), 0);

  return (
    <Card className="overflow-hidden pt-0">
      {/* Hero Image */}
      <div className="relative w-full h-48">
        <RecipeImage
          src={recipe.imageUrl}
          alt={recipe.title}
          sizes="420px"
        />
        {!recipe.imageUrl && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="text-xs opacity-75">No image</Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex gap-2 mb-2">
          <Button asChild className="flex-1">
            <Link href={`/recipes/${recipe.id}`}>View Full Recipe</Link>
          </Button>
          {recipe.sourceUrl && (
            <Button variant="outline" asChild>
              <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                Source
              </a>
            </Button>
          )}
        </div>
        <CardTitle className="text-xl line-clamp-2">{recipe.title}</CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {recipe.description}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <StepsIcon className="w-4 h-4 text-blue-500" />
            <span>{recipe.steps.length} steps</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IngredientsIcon className="w-4 h-4 text-green-500" />
            <span>{recipe.ingredients.length} ingredients</span>
          </span>
          {totalTime > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4 text-orange-500" />
              <span>{totalTime} min</span>
            </span>
          )}
          {recipe.calories && (
            <span className="inline-flex items-center gap-1.5">
              <CaloriesIcon className="w-4 h-4 text-red-500" />
              <span>{recipe.calories} cal</span>
            </span>
          )}
          {parallelSteps > 1 && (
            <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
              <ParallelIcon className="w-4 h-4" />
              <span>{parallelSteps} parallel</span>
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Ingredients Preview */}
        <div>
          <h4 className="font-semibold text-sm mb-2">Key Ingredients</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {recipe.ingredients.slice(0, 5).map((ingredient, i) => (
              <li key={i} className="truncate">• {ingredient}</li>
            ))}
            {recipe.ingredients.length > 5 && (
              <li className="text-xs">+{recipe.ingredients.length - 5} more...</li>
            )}
          </ul>
        </div>

        <Separator />

        {/* Mini Dependency Graph */}
        <div>
          <h4 className="font-semibold text-sm mb-2">Dependency Graph</h4>
          <div className="h-[250px] -mx-2">
            <Suspense fallback={<GraphSkeleton compact />}>
              <RecipeGraph steps={recipe.steps} ingredientCategories={recipe.ingredientCategories} compact />
            </Suspense>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
