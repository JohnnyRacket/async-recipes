import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCachedRecipe } from '@/lib/kv';
import { RecipeGraph } from '@/components/recipe-graph';
import { GraphSkeleton } from '@/components/graph-skeleton';
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

  return (
    <Card className="overflow-hidden">
      {/* Hero Image */}
      {recipe.imageUrl && (
        <div className="relative w-full h-48">
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            className="object-cover"
            sizes="420px"
          />
        </div>
      )}

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
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="secondary">{recipe.steps.length} steps</Badge>
          <Badge variant="outline">{recipe.ingredients.length} ingredients</Badge>
          {parallelSteps > 1 && (
            <Badge variant="default" className="bg-green-600">
              {parallelSteps} parallel starts
            </Badge>
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
              <RecipeGraph steps={recipe.steps} compact />
            </Suspense>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
