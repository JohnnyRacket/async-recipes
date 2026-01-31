export type RecipeStep = {
  id: string;
  text: string;
  dependsOn: string[]; // array of step ids that must complete first (empty = can start immediately)
};

export type Recipe = {
  id: string;
  title: string;
  description: string;
  sourceUrl?: string;
  imageUrl?: string;
  ingredients: string[];
  steps: RecipeStep[];
  createdAt: number;
  featured?: boolean;
};
