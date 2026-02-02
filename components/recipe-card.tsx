'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RecipeImage } from '@/components/recipe-image';
import { Recipe } from '@/lib/types';

interface RecipeCardProps {
  recipe: Recipe;
  /** When true, clicking opens preview panel instead of navigating to full page */
  previewMode?: boolean;
}

export function RecipeCard({ recipe, previewMode = false }: RecipeCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Count how many steps can start immediately (no dependencies)
  const parallelSteps = recipe.steps.filter((s) => s.dependsOn.length === 0).length;

  // Check if this recipe is currently being previewed
  const isActive = pathname === `/recipes/preview/${recipe.id}`;

  // Build URL - use /preview/[id] for preview mode, /[id] for full page
  const getRecipeUrl = () => {
    if (previewMode) {
      // Use preview route and preserve search query
      const query = searchParams.get('q');
      const baseUrl = `/recipes/preview/${recipe.id}`;
      if (query) {
        return `${baseUrl}?q=${encodeURIComponent(query)}`;
      }
      return baseUrl;
    }
    return `/recipes/${recipe.id}`;
  };

  // In preview mode on large screens, we update the URL to show the preview
  // On small screens (where preview panel is hidden), we navigate to full page
  const handleClick = (e: React.MouseEvent) => {
    if (previewMode) {
      e.preventDefault();
      router.push(getRecipeUrl(), { scroll: false });
    }
  };
  
  return (
    <Link 
      href={getRecipeUrl()}
      onClick={handleClick}
    >
      <Card className={`h-full hover:shadow-lg transition-all cursor-pointer overflow-hidden pt-0 ${
        isActive && previewMode ? 'ring-2 ring-primary shadow-lg' : ''
      }`}>
        <div className="relative w-full h-48">
          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.title}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <CardHeader>
          <CardTitle className="line-clamp-1">{recipe.title}</CardTitle>
          <CardDescription className="line-clamp-2">
            {recipe.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {recipe.steps.length} steps
            </Badge>
            <Badge variant="outline">
              {recipe.ingredients.length} ingredients
            </Badge>
            {parallelSteps > 1 && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                {parallelSteps} parallel starts
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
