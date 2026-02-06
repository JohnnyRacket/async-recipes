'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { track } from '@vercel/analytics';
import { ClipboardList, Beaker, Clock, Flame, Zap } from 'lucide-react';
import { getCookieValue, AB_HOMEPAGE_COOKIE } from '@/lib/ab';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { RecipeImage } from '@/components/recipe-image';
import { Recipe } from '@/lib/types';
import { getStartingSteps } from '@/lib/utils';

interface RecipeCardProps {
  recipe: Recipe;
  /** When true, clicking opens preview panel instead of navigating to full page */
  previewMode?: boolean;
}

export function RecipeCard({ recipe, previewMode = false }: RecipeCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile screen size (preview panel is hidden below lg breakpoint)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint is 1024px
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Count how many steps can start immediately (no dependencies)
  const parallelSteps = getStartingSteps(recipe.steps).length;
  
  // Calculate total time
  const totalTime = recipe.steps.reduce((sum, step) => sum + (step.duration || 0), 0);

  // Check if this recipe is currently being previewed
  const isActive = pathname === `/recipes/preview/${recipe.id}`;

  // Build URL - use /preview/[id] for preview mode on desktop, /[id] for full page
  // On mobile, always use full page since preview panel is hidden
  const getRecipeUrl = () => {
    // On mobile, always navigate to full recipe page
    if (isMobile) {
      return `/recipes/${recipe.id}`;
    }
    
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
    // A/B test tracking: only on homepage
    if (window.location.pathname === '/') {
      const variant = getCookieValue(AB_HOMEPAGE_COOKIE);
      if (variant) {
        track('recipe-click', { variant, recipeId: recipe.id });
      }
    }

    // On mobile, always navigate normally (no preview mode)
    if (isMobile) {
      return;
    }

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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
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
        </CardContent>
      </Card>
    </Link>
  );
}
