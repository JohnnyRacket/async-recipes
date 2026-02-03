import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Beaker, Clock, Flame, Zap } from 'lucide-react';
import { getCachedRecipe } from '@/lib/kv';
import { RecipeGraph } from '@/components/recipe-graph';
import { GraphSkeleton } from '@/components/graph-skeleton';
import { RecipeImage } from '@/components/recipe-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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
            <ClipboardList className="w-4 h-4 text-blue-500" />
            <span>{recipe.steps.length} steps</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Beaker className="w-4 h-4 text-green-500" />
            <span>{recipe.ingredients.length} ingredients</span>
          </span>
          {totalTime > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>{totalTime} min</span>
            </span>
          )}
          {recipe.calories && (
            <span className="inline-flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-500" />
              <span>{recipe.calories} cal</span>
            </span>
          )}
          {parallelSteps > 1 && (
            <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
              <Zap className="w-4 h-4" />
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
