export type RecipeStep = {
  id: string;
  text: string;
  dependsOn: string[]; // array of step ids that must complete first (empty = can start immediately)
  duration?: number; // estimated time in minutes
  isPassive?: boolean; // true = can multitask (simmering, resting, boiling)
  needsTimer?: boolean; // true = step requires precise timing (bake 25 min, simmer 10 min). false = just an estimate (~3 min to chop)
  ingredients?: string[]; // ingredients used in this step
  temperature?: string; // e.g., "375°F", "medium-high heat"
};

export type IngredientCategory =
  | 'meat'
  | 'seafood'
  | 'vegetable'
  | 'dairy'
  | 'grain'
  | 'sauce'
  | 'spice'
  | 'chocolate'
  | 'other';

export type Recipe = {
  id: string;
  title: string;
  description: string;
  sourceUrl?: string;
  imageUrl?: string;
  ingredients: string[];
  ingredientCategories?: Record<string, IngredientCategory>; // maps short ingredient names to their category
  steps: RecipeStep[];
  createdAt: number;
  featured?: boolean;
};
