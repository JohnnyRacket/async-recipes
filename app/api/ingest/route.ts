import { streamText, Output, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { gateway } from '@ai-sdk/gateway';
import { IngestResultSchema } from '@/lib/schemas';
import { ValidationError, isAppError, errorResponse, toAppError } from '@/lib/errors';
import { sanitizeUrl, fetchRecipePage, extractImageUrls, stripHtml, validateImageUrl } from '@/lib/utils';

// Note: Edge runtime removed as it's incompatible with cacheComponents.
// Node.js runtime still provides good streaming performance.

export async function POST(req: Request) {
  try {
    const { url: rawUrl, text: rawText } = await req.json();

    if (!rawUrl && !rawText) {
      throw new ValidationError('URL or text is required', 'MISSING_INPUT');
    }

    let textContent: string;
    let imageUrls: string[] = [];

    if (rawText && typeof rawText === 'string') {
      // Direct text input mode — use the pasted text as-is
      textContent = rawText.trim().substring(0, 15000);
    } else {
      if (!rawUrl || typeof rawUrl !== 'string') {
        throw new ValidationError('URL is required', 'MISSING_URL');
      }

      // Sanitize the URL to prevent SSRF
      const url = sanitizeUrl(rawUrl.trim());

      // Fetch the recipe page content (server-side to avoid CORS)
      const html = await fetchRecipePage(url);

      // Extract potential image URLs before stripping HTML
      imageUrls = extractImageUrls(html, 10); // Keep top 10 potential images for tool to validate

      // Strip HTML tags for cleaner input (basic cleanup)
      textContent = stripHtml(html);
    }

    // Use AI SDK to stream structured recipe extraction with validation
    // Using streamText with Output.object() (streamObject is deprecated in AI SDK 6)
    const result = streamText({
      model: gateway('deepseek/deepseek-v3.2'),
      output: Output.object({ schema: IngestResultSchema }),
      tools: {
        validateImageUrl: tool({
          description: 'Validate that an image URL is accessible and returns a valid image. Use this to verify a candidate image URL before including it as the recipe imageUrl. Returns whether the URL is valid and the content type.',
          inputSchema: z.object({
            url: z.string().url().describe('The image URL to validate'),
          }),
          execute: async ({ url }) => {
            return await validateImageUrl(url);
          },
        }),
      },
      stopWhen: stepCountIs(3), // Allow up to 3 steps: initial + tool call + final output
      prompt: `Analyze the following webpage and extract a recipe if one exists.

FIRST: Determine if this page contains a legitimate cooking/food recipe.
- Set isValidRecipe=true if it's a real recipe with ingredients and cooking instructions
- Set isValidRecipe=false if it's: spam, gibberish, a product page, non-cooking instructions, a joke submission, or missing key recipe elements (no ingredients or no cooking steps)
- If isValidRecipe=false, provide invalidReason explaining why (e.g., "Page contains a product listing, not a recipe", "Content is unrelated to cooking", "No cooking instructions found")

ONLY if isValidRecipe=true, extract the recipe data into the "recipe" field.

REQUIRED FIELDS (you MUST provide all of these if isValidRecipe=true):
- title: The recipe name (REQUIRED)
- description: A 1-2 sentence description (REQUIRED)
- ingredients: Array of ingredients with quantities (REQUIRED, must not be empty)
- steps: Array of cooking steps (REQUIRED, must not be empty)
- Each step MUST have: id (string like "step1"), text (the instruction), dependsOn (array, can be empty [])
- calories: Estimated calories per serving (REQUIRED - always provide an estimate). Extract from webpage if available (look for "calories", "kcal", "nutrition", "nutrition facts"). If not found, estimate based on ingredients and typical serving sizes. Provide a reasonable estimate (e.g., pasta dishes: 400-600, salads: 200-400, desserts: 300-500, meat dishes: 500-800 per serving).

OPTIONAL FIELDS (include if available):
- imageUrl: Main recipe photo URL
- ingredientCategories: Map of ingredient names to categories
- Step metadata: duration, isPassive, needsTimer, ingredients, temperature

INGREDIENTS LIST: Extract the FULL ingredient list with exact quantities and measurements as written in the recipe. 
- Include the amount, unit, and ingredient name (e.g., "2 cups all-purpose flour", "1 lb chicken breast", "3 cloves garlic, minced")
- Preserve any preparation notes (e.g., "diced", "softened", "room temperature")
- This is the complete shopping list - users need exact amounts to cook the recipe!

IMPORTANT: Analyze the cooking steps carefully to identify dependencies:
- Steps that can start immediately (like prep work, preheating) should have empty dependsOn arrays
- Steps that require other steps to complete first should list those step IDs in dependsOn
- Look for phrases like "once the X is done", "after", "when", "while" to identify dependencies
- Parallel opportunities: prep work, preheating, marinating can often happen simultaneously
- Sequential requirements: you can't add ingredients to a pan before heating it

Generate step IDs as "step1", "step2", etc.

Example dependency patterns:
- Boiling water (step1) and chopping vegetables (step2) can happen in parallel: both have empty dependsOn
- Adding pasta to boiling water (step3) depends on step1: dependsOn: ["step1"]
- Combining prepped vegetables with cooked pasta (step4) depends on both: dependsOn: ["step2", "step3"]

STEP METADATA - For each step, also extract:

1. DURATION (minutes): Estimate how long the step takes. Look for explicit times ("cook for 10 minutes", "bake 25-30 minutes") or infer reasonable times:
   - Chopping/prep: 2-5 min depending on amount
   - Boiling water: 8-10 min
   - Sautéing onions: 5-8 min
   - Simmering: as stated or 15-20 min typical
   - Baking: as stated in recipe
   - Resting meat: 5-10 min
   Use the longer time if a range is given.

2. IS PASSIVE: Set to true if the cook can walk away or multitask during this step:
   - Passive (true): boiling water, simmering, baking, roasting, marinating, resting, preheating oven, slow cooking
   - Active (false): chopping, stirring, flipping, sautéing, whisking, assembling, plating

3. NEEDS TIMER: Set to true ONLY if the step requires precise timing that the cook needs to track with a timer alert:
   - NEEDS TIMER (true): "bake for 25 minutes", "simmer for 10 minutes", "boil pasta 8-10 minutes", "rest meat for 5 minutes", "marinate for 30 minutes", "let rise for 1 hour"
   - NO TIMER (false): "chop onions" (~3 min - just an estimate), "sauté until golden" (~5 min - visual cue), "stir until combined", "season to taste", "bring to a boil" (visual cue)
   The key question: Does the cook need an alarm to know when this step is done, or can they tell by looking/tasting/touching?

4. INGREDIENTS: List short ingredient names used in THIS step only (e.g., ["chicken", "salt", "pepper"] not quantities)

5. TEMPERATURE: Include cooking temp if mentioned (e.g., "375°F", "medium-high heat", "350°F (175°C)")

INGREDIENT CATEGORIES: Create an ingredientCategories object that maps each unique short ingredient name (used in steps) to one of these categories:
- "meat": beef, chicken, pork, steak, bacon, pancetta, lamb, turkey, sausage, ham, prosciutto
- "seafood": fish, salmon, shrimp, tuna, cod, lobster, crab, scallop, mussel, clam, anchovy
- "vegetable": onion, garlic, tomato, pepper, carrot, celery, potato, broccoli, spinach, lettuce, mushroom, asparagus, peas, beans, corn, cabbage, kale, ginger
- "dairy": butter, milk, cream, cheese (parmesan, pecorino, mozzarella, cheddar), yogurt, egg, yolk
- "grain": flour, bread, pasta, rice, noodle, spaghetti, oat, quinoa, couscous, tortilla
- "sauce": sauce, soy sauce, vinegar, oil, sesame oil, mayo, ketchup, mustard, dressing, broth, stock, wine
- "spice": salt, pepper, cumin, paprika, oregano, basil, thyme, rosemary, cinnamon, vanilla, sugar, honey, syrup, baking powder, baking soda
- "chocolate": chocolate, cocoa, chocolate chips
- "other": anything that doesn't fit above categories

Example ingredientCategories:
{
  "chicken": "meat",
  "onion": "vegetable",
  "garlic": "vegetable",
  "soy sauce": "sauce",
  "butter": "dairy",
  "salt": "spice",
  "pepper": "spice"
}

IMAGE SELECTION:
You have access to a tool called "validateImageUrl" that checks if an image URL is accessible and returns a valid image.

Candidate image URLs found on the page:
${imageUrls.join('\n')}

INSTRUCTIONS:
1. Identify which URL(s) are most likely to be the main recipe photo (based on URL patterns - look for words like "recipe", "dish", "food", avoid "logo", "icon", "avatar", "ad", "banner")
2. Call the validateImageUrl tool with your best candidate URL to verify it works
3. If it returns isValid: true, use that URL as imageUrl
4. If it returns isValid: false, try another candidate
5. If no valid image is found, OMIT the imageUrl field entirely (do NOT use placeholder strings like "NONE", "null", or empty string)

CALORIES (REQUIRED - always provide):
You MUST always provide a calories estimate. This is a required field.
- FIRST: Look for explicit calorie information on the page (e.g., "350 calories", "450 kcal per serving", "nutrition facts", "calories per serving")
- If found, use that exact number
- If NOT found, estimate based on:
  * Main ingredients (meat/protein: ~200-300 cal, carbs/grains: ~150-200 cal, vegetables: ~50-100 cal per serving)
  * Cooking method (fried adds more calories than baked/grilled)
  * Typical serving sizes
  * Dish type: pasta dishes: 400-600, salads: 200-400, desserts: 300-500, meat dishes: 500-800, soups: 150-300, sandwiches: 400-600
- ALWAYS provide a reasonable estimate even if not explicitly stated (aim for accuracy within 100-200 calories)
- Round to the nearest 10-50 calories (e.g., 425, 350, 580)

FINAL VALIDATION CHECKLIST (if isValidRecipe=true):
Before outputting, verify your recipe object has:
✓ title - non-empty string
✓ description - non-empty string  
✓ ingredients - non-empty array of strings
✓ steps - non-empty array where EACH step has:
  - id: string (e.g., "step1")
  - text: string (the instruction)
  - dependsOn: array of step IDs (can be empty [])
✓ calories - number (estimated if not explicitly stated)

If any required field is missing or empty, set isValidRecipe=false instead.

Webpage content:
${textContent}`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    // Handle known application errors
    if (isAppError(error)) {
      return errorResponse(error);
    }
    
    // Log unexpected errors for debugging
    console.error('Ingest error:', error);
    
    // Convert unknown errors to a generic AppError
    const appError = toAppError(error, 'Failed to process recipe');
    return errorResponse(appError);
  }
}
