import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCachedRecipe, getCachedRecipes } from '@/lib/kv';
import { IngredientsList } from '@/components/ingredients-list';
import { StepsList } from '@/components/steps-list';
import { InteractiveRecipe } from '@/components/interactive-recipe';
import { GraphSkeleton } from '@/components/graph-skeleton';
import { RecipeImage } from '@/components/recipe-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

// Generate static params for pre-rendering seeded recipes
export async function generateStaticParams() {
  const recipes = await getCachedRecipes();
  return recipes.map((recipe) => ({
    id: recipe.id,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getCachedRecipe(id);
  
  if (!recipe) {
    return { title: 'Recipe Not Found | Async Recipes' };
  }

  return {
    title: `${recipe.title} | Async Recipes`,
    description: recipe.description,
  };
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipe = await getCachedRecipe(id);

  if (!recipe) {
    notFound();
  }

  // Count parallel steps (no dependencies)
  const parallelSteps = recipe.steps.filter((s) => s.dependsOn.length === 0).length;
  
  // Calculate total estimated time
  const totalTime = recipe.steps.reduce((sum, step) => sum + (step.duration || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/recipes">← Back to recipes</Link>
        </Button>
        
        {/* Hero Image */}
        <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-lg overflow-hidden">
          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.title}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            priority
          />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{recipe.title}</h1>
          <p className="text-lg text-muted-foreground">{recipe.description}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">{recipe.steps.length} steps</Badge>
            <Badge variant="secondary">{recipe.ingredients.length} ingredients</Badge>
            {totalTime > 0 && (
              <Badge variant="secondary">~{totalTime} min total</Badge>
            )}
            {parallelSteps > 1 && (
              <Badge variant="default" className="bg-green-600">
                {parallelSteps} steps can start in parallel
              </Badge>
            )}
            {recipe.sourceUrl && (
              <a 
                href={recipe.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View source →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ingredients - Sidebar on large screens */}
        <div className="lg:col-span-1">
          <IngredientsList ingredients={recipe.ingredients} />
        </div>

        {/* Steps - Main content */}
        <div className="lg:col-span-2">
          <StepsList steps={recipe.steps} ingredientCategories={recipe.ingredientCategories} />
        </div>
      </div>

      {/* Interactive Dependency Graph - Full width with Suspense boundary */}
      <Suspense fallback={<GraphSkeleton />}>
        <InteractiveRecipe recipe={recipe} />
      </Suspense>
    </div>
  );
}
