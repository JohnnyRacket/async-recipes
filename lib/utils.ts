import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { IngredientCategory } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Color mappings for ingredient categories
 */
const INGREDIENT_CATEGORY_COLORS: Record<IngredientCategory, { bg: string; text: string }> = {
  meat: { bg: 'bg-red-100', text: 'text-red-700' },
  seafood: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  vegetable: { bg: 'bg-green-100', text: 'text-green-700' },
  dairy: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  grain: { bg: 'bg-amber-100', text: 'text-amber-700' },
  sauce: { bg: 'bg-orange-100', text: 'text-orange-700' },
  spice: { bg: 'bg-purple-100', text: 'text-purple-700' },
  chocolate: { bg: 'bg-stone-200', text: 'text-stone-700' },
  other: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

/**
 * Fallback keyword matching for recipes without AI-inferred categories
 */
const CATEGORY_KEYWORDS: Record<Exclude<IngredientCategory, 'other'>, string[]> = {
  meat: ['beef', 'chicken', 'pork', 'steak', 'bacon', 'pancetta', 'guanciale', 'lamb', 'turkey', 'sausage', 'meat', 'ham', 'prosciutto'],
  seafood: ['fish', 'salmon', 'shrimp', 'tuna', 'cod', 'lobster', 'crab', 'scallop', 'mussel', 'clam', 'anchovy'],
  vegetable: ['onion', 'garlic', 'tomato', 'pepper', 'carrot', 'celery', 'potato', 'broccoli', 'spinach', 'lettuce', 'cucumber', 'zucchini', 'mushroom', 'asparagus', 'peas', 'beans', 'corn', 'cabbage', 'kale', 'leek', 'shallot', 'ginger', 'snap peas'],
  dairy: ['butter', 'milk', 'cream', 'cheese', 'parmesan', 'pecorino', 'mozzarella', 'cheddar', 'yogurt', 'egg', 'yolk'],
  grain: ['flour', 'bread', 'pasta', 'rice', 'noodle', 'spaghetti', 'oat', 'quinoa', 'couscous', 'tortilla'],
  sauce: ['sauce', 'soy', 'vinegar', 'oil', 'sesame', 'mayo', 'ketchup', 'mustard', 'dressing', 'broth', 'stock', 'wine'],
  spice: ['salt', 'pepper', 'cumin', 'paprika', 'oregano', 'basil', 'thyme', 'rosemary', 'cinnamon', 'vanilla', 'sugar', 'honey', 'syrup'],
  chocolate: ['chocolate', 'cocoa', 'chips'],
};

/**
 * Infer ingredient category using keyword matching (fallback for recipes without AI-inferred categories)
 */
function inferCategoryFromKeywords(ingredient: string): IngredientCategory {
  const lower = ingredient.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return category as IngredientCategory;
    }
  }
  return 'other';
}

/**
 * Get colors for an ingredient based on its category.
 * Uses AI-inferred category from ingredientCategories map if available,
 * otherwise falls back to keyword matching.
 * 
 * @param ingredient - The ingredient name (short name used in steps)
 * @param ingredientCategories - Optional map of ingredient names to categories (from AI inference)
 */
export function getIngredientColors(
  ingredient: string,
  ingredientCategories?: Record<string, IngredientCategory>
): { bg: string; text: string } {
  // Try to find category from AI-inferred map (case-insensitive lookup)
  if (ingredientCategories) {
    const lower = ingredient.toLowerCase();
    for (const [name, category] of Object.entries(ingredientCategories)) {
      if (name.toLowerCase() === lower) {
        return INGREDIENT_CATEGORY_COLORS[category];
      }
    }
  }
  
  // Fall back to keyword matching
  const category = inferCategoryFromKeywords(ingredient);
  return INGREDIENT_CATEGORY_COLORS[category];
}
