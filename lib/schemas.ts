import { z } from 'zod';

export const RecipeStepSchema = z.object({
  id: z.string().describe('Unique identifier for this step (e.g., "step1", "step2")'),
  text: z.string().describe('The instruction text for this cooking step'),
  dependsOn: z.array(z.string()).describe('Array of step IDs that must complete before this step can begin. Empty array means this step can start immediately or in parallel with other independent steps.'),
});

export const RecipeSchema = z.object({
  title: z.string().describe('The name of the recipe'),
  description: z.string().describe('A brief description of the dish (1-2 sentences)'),
  ingredients: z.array(z.string()).describe('List of ingredients with quantities'),
  steps: z.array(RecipeStepSchema).describe('Ordered cooking steps with dependency information for parallelization. Analyze which steps can run in parallel (e.g., prep work) vs which must wait for others (e.g., cannot add sauce until onions are sautéed).'),
});

export type RecipeInput = z.infer<typeof RecipeSchema>;
