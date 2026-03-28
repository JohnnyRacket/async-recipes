import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Beaker, Clock, Flame, Zap, ExternalLink } from 'lucide-react';
import { getCachedRecipe, getCachedRecipes } from '@/lib/kv';
import { IngredientsList } from './_components/ingredients-list';
import { StepsList } from './_components/steps-list';
import { InteractiveRecipe } from './_components/interactive-recipe';
import { GraphSkeleton } from '@/components/graph-skeleton';
import { RecipeImage } from '@/components/recipe-image';
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
    return { title: 'Recipe Not Found | Parallel Recipes' };
  }

  return {
    title: `${recipe.title} | Parallel Recipes`,
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
        
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">{recipe.title}</h1>
          <p className="text-lg text-muted-foreground">{recipe.description}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <ClipboardList className="w-4 h-4 text-blue-500" />
              <span>{recipe.steps.length} steps</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Beaker className="w-4 h-4 text-green-500" />
              <span>{recipe.ingredients.length} ingredients</span>
            </span>
            {totalTime > 0 && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>~{totalTime} min total</span>
              </span>
            )}
            {recipe.calories && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Flame className="w-4 h-4 text-red-500" />
                <span>{recipe.calories} cal</span>
              </span>
            )}
            {parallelSteps > 1 && (
              <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
                <Zap className="w-4 h-4" />
                <span>{parallelSteps} steps can start in parallel</span>
              </span>
            )}
            {recipe.sourceUrl && (
              <a 
                href={recipe.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View source</span>
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
