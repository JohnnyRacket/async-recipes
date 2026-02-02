import { z } from 'zod';

export const IngredientCategorySchema = z.enum([
  'meat',
  'seafood',
  'vegetable',
  'dairy',
  'grain',
  'sauce',
  'spice',
  'chocolate',
  'other',
]);

export const RecipeStepSchema = z.object({
  id: z.string().describe('Unique identifier for this step (e.g., "step1", "step2")'),
  text: z.string().describe('The instruction text for this cooking step'),
  dependsOn: z.array(z.string()).describe('Array of step IDs that must complete before this step can begin. Empty array means this step can start immediately or in parallel with other independent steps.'),
  duration: z.number().optional().describe('Estimated time in minutes for this step. Include both active and passive time. E.g., "simmer for 20 minutes" = 20, "chop vegetables" = 3-5 depending on complexity.'),
  isPassive: z.boolean().optional().describe('True if this step requires minimal attention and you can multitask (e.g., simmering, boiling water, marinating, resting meat, preheating oven, baking). False for active steps requiring constant attention (e.g., stirring, chopping, sautéing).'),
  needsTimer: z.boolean().optional().describe('True ONLY if the step requires precise timing that the cook needs to track (e.g., "bake for 25 minutes", "simmer for 10 minutes", "boil pasta 8-10 minutes", "rest meat for 5 minutes"). False for steps where time is just an estimate (e.g., "chop onions" ~3min, "sauté until golden" ~5min, "stir until combined" ~1min). Timer should alert the cook when time is up.'),
  ingredients: z.array(z.string()).optional().describe('Short names of ingredients used in this specific step (e.g., ["onion", "garlic"] not full quantities). Only include ingredients actively used in this step.'),
  temperature: z.string().optional().describe('Cooking temperature or heat level if applicable (e.g., "375°F", "medium-high heat", "350°F (175°C)", "high heat").'),
});

export const RecipeSchema = z.object({
  title: z.string().describe('The name of the recipe'),
  description: z.string().describe('A brief description of the dish (1-2 sentences)'),
  imageUrl: z.string().optional().describe('URL of the main recipe image if found on the page'),
  ingredients: z.array(z.string()).describe('Complete list of ingredients with EXACT quantities and measurements (e.g., "2 cups flour", "1 lb chicken breast", "3 tbsp olive oil"). Include preparation notes like "diced" or "minced". This is the shopping list.'),
  ingredientCategories: z.record(z.string(), IngredientCategorySchema).optional().describe('Maps each unique short ingredient name to its category for color-coding. Keys should match the short ingredient names used in steps.'),
  steps: z.array(RecipeStepSchema).describe('Ordered cooking steps with dependency information for parallelization. Analyze which steps can run in parallel (e.g., prep work) vs which must wait for others (e.g., cannot add sauce until onions are sautéed).'),
});

export type RecipeInput = z.infer<typeof RecipeSchema>;

// Schema for ingest API response - includes validation before recipe extraction
export const IngestResultSchema = z.object({
  isValidRecipe: z.boolean().describe('True if the page contains a legitimate cooking/food recipe. False for non-recipe content, spam, gibberish, or non-cooking instructions.'),
  invalidReason: z.string().optional().describe('If isValidRecipe is false, explain why (e.g., "Page contains a product listing, not a recipe", "Content is unrelated to cooking")'),
  recipe: RecipeSchema.optional().describe('The extracted recipe data. Only populate if isValidRecipe is true.'),
});

export type IngestResult = z.infer<typeof IngestResultSchema>;
