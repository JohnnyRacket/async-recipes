import { streamText, Output, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { gateway } from '@ai-sdk/gateway';
import { RecipeSchema, RecipeInput } from '@/lib/schemas';
import { ValidationError, isAppError, errorResponse, toAppError } from '@/lib/errors';
import { sanitizeUrl, fetchRecipePage, extractImageUrls, stripHtml, validateImageUrl } from '@/lib/utils';

// Note: Edge runtime removed as it's incompatible with cacheComponents.
// Node.js runtime still provides good streaming performance.

export async function POST(req: Request) {
  try {
    const { url: rawUrl, existingRecipe } = await req.json() as { 
      url: string; 
      existingRecipe: Partial<RecipeInput>;
    };

    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new ValidationError('URL is required', 'MISSING_URL');
    }

    if (!existingRecipe) {
      throw new ValidationError('Existing recipe data is required', 'MISSING_RECIPE_DATA');
    }

    // Sanitize the URL to prevent SSRF
    const url = sanitizeUrl(rawUrl.trim());

    // Fetch the recipe page content (server-side to avoid CORS)
    const html = await fetchRecipePage(url);

    // Extract potential image URLs before stripping HTML
    const imageUrls = extractImageUrls(html, 10); // Keep top 10 potential images for enhancement pass

    // Strip HTML tags for cleaner input (basic cleanup)
    const textContent = stripHtml(html);

    // Use AI SDK to stream structured recipe enhancement
    // Using streamText with Output.object() (streamObject is deprecated in AI SDK 6)
    const result = streamText({
      model: gateway('openai/gpt-oss-20b'),
      output: Output.object({ schema: RecipeSchema }),
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
      prompt: `You are FIXING and IMPROVING an existing recipe extraction. The initial extraction often has problems:
- Missing steps (only captured some of the instructions)
- Wrong or missing step dependencies
- Missing ingredients
- Missing metadata (duration, temperature, etc.)

EXISTING RECIPE DATA (starting point - may have errors):
${JSON.stringify(existingRecipe, null, 2)}

YOUR TASK: Compare the existing data against the ORIGINAL WEBPAGE and fix any issues.

=== FIELDS TO PRESERVE (keep unless clearly wrong) ===

TITLE: "${existingRecipe.title || ''}" - Keep this exact title.

IMAGE URL: ${existingRecipe.imageUrl ? `KEEP "${existingRecipe.imageUrl}" - This is already set and MUST appear in your output.` : `MISSING - You have a validateImageUrl tool to verify image URLs work. Use it to validate a candidate before including it.`}
${!existingRecipe.imageUrl ? `Available images to validate: ${imageUrls.join(', ')}` : ''}

DESCRIPTION: ${existingRecipe.description && existingRecipe.description.length >= 20 ? `Keep: "${existingRecipe.description}"` : 'MISSING - Write a 1-2 sentence description.'}

=== FIELDS TO ACTIVELY FIX AND IMPROVE ===

INGREDIENTS - Check the webpage for the COMPLETE ingredient list:
- Current extraction has ${existingRecipe.ingredients?.length || 0} ingredients
- Look for ANY missing ingredients in the webpage
- Include exact quantities (e.g., "2 cups flour", "1 lb chicken")

STEPS - THIS IS CRITICAL - The initial extraction often misses steps:
- Current extraction has ${existingRecipe.steps?.length || 0} steps
- Read the webpage carefully and extract ALL cooking steps
- Common issues: steps merged together, prep steps skipped, final steps omitted
- If the webpage has more steps than the current extraction, ADD THEM
- Number steps sequentially: step1, step2, step3, etc.

STEP DEPENDENCIES - Re-analyze from scratch:
- Don't just copy existing dependsOn - evaluate what makes sense
- Steps that can start immediately = empty dependsOn []
- Steps requiring previous completion = list those step IDs
- Look for parallel opportunities: prep work, preheating, boiling water
- Look for sequences: can't add to pan before heating it

For EACH step, include metadata:
1. DURATION (minutes): Explicit times or infer (chopping: 2-5, sautéing: 5-8, baking: as stated)
2. IS PASSIVE: true = hands-off (simmering, baking), false = active (chopping, stirring)  
3. NEEDS TIMER: true = precise timing needed ("bake 25 min"), false = visual cues ("until golden")
4. INGREDIENTS: Short names for THIS step (e.g., ["chicken", "salt"])
5. TEMPERATURE: If mentioned (e.g., "375°F", "medium-high heat")

INGREDIENT CATEGORIES: Map each short ingredient name to:
- "meat": beef, chicken, pork, bacon, lamb, turkey, sausage
- "seafood": fish, salmon, shrimp, tuna, lobster
- "vegetable": onion, garlic, tomato, pepper, carrot, potato, mushroom
- "dairy": butter, milk, cream, cheese, egg
- "grain": flour, bread, pasta, rice, noodle
- "sauce": sauce, soy sauce, vinegar, oil, broth, wine
- "spice": salt, pepper, cumin, paprika, oregano, basil, sugar, honey
- "chocolate": chocolate, cocoa
- "other": anything else

CALORIES (REQUIRED - always provide):
You MUST always provide a calories estimate. This is a required field.
- FIRST: Look for explicit calorie information on the page (e.g., "350 calories", "450 kcal per serving", "nutrition facts", "calories per serving")
- If found, use that exact number
- If NOT found, estimate based on ingredients and typical serving sizes:
  * Main ingredients (meat/protein: ~200-300 cal, carbs/grains: ~150-200 cal, vegetables: ~50-100 cal per serving)
  * Cooking method (fried adds more calories than baked/grilled)
  * Typical serving sizes
  * Dish type: pasta dishes: 400-600, salads: 200-400, desserts: 300-500, meat dishes: 500-800, soups: 150-300, sandwiches: 400-600
- ALWAYS provide a reasonable estimate even if not explicitly stated (aim for accuracy within 100-200 calories)
- Round to the nearest 10-50 calories (e.g., 425, 350, 580)

=== FINAL VALIDATION ===
Before outputting, verify:
✓ title is set
✓ imageUrl - ${existingRecipe.imageUrl ? `use "${existingRecipe.imageUrl}"` : 'OMIT this field entirely if no valid image URL was found (do NOT use placeholder strings like "NONE" or "null")'}
✓ description is set
✓ ingredients array has ALL ingredients from webpage
✓ steps array has ALL steps from webpage (not just what was in existing data)
✓ each step has: id, text, dependsOn (array)
✓ calories is set (extract from webpage or estimate based on ingredients)

ORIGINAL WEBPAGE CONTENT (source of truth for steps and ingredients):
${textContent}`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    // Handle known application errors
    if (isAppError(error)) {
      return errorResponse(error);
    }
    
    // Log unexpected errors for debugging
    console.error('Enhance error:', error);
    
    // Convert unknown errors to a generic AppError
    const appError = toAppError(error, 'Failed to enhance recipe');
    return errorResponse(appError);
  }
}
