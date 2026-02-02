import { streamObject } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { RecipeSchema, RecipeInput } from '@/lib/schemas';

// Note: Edge runtime removed as it's incompatible with cacheComponents.
// Node.js runtime still provides good streaming performance.

export async function POST(req: Request) {
  try {
    const { url, existingRecipe } = await req.json() as { 
      url: string; 
      existingRecipe: Partial<RecipeInput>;
    };

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!existingRecipe) {
      return new Response(JSON.stringify({ error: 'Existing recipe data is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the recipe page content (server-side to avoid CORS)
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AsyncRecipes/1.0)',
      },
    });

    if (!pageResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch URL: ${pageResponse.status}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const html = await pageResponse.text();

    // Extract potential image URLs before stripping HTML
    const imageMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
    const imageUrls = imageMatches
      .map((img) => {
        const match = img.match(/src=["']([^"']+)["']/i);
        return match ? match[1] : null;
      })
      .filter((imgUrl): imgUrl is string => imgUrl !== null && imgUrl.startsWith('http'))
      .slice(0, 10); // Keep top 10 potential images for enhancement pass

    // Strip HTML tags for cleaner input (basic cleanup)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000); // Limit to avoid token limits

    // Use AI SDK to stream structured recipe enhancement
    const result = streamObject({
      model: gateway('openai/gpt-oss-20b'),
      schema: RecipeSchema,
      prompt: `You are IMPROVING an existing recipe extraction. The initial extraction may have missing or incomplete data.

EXISTING RECIPE DATA (use as your starting point - keep what's good, improve what's missing):
${JSON.stringify(existingRecipe, null, 2)}

YOUR TASK: Review the existing data against the original webpage content and fill in ANY missing or incomplete fields.

REVIEW AND FILL IN ANY MISSING DATA:

1. IMAGE URL: ${!existingRecipe.imageUrl ? 'MISSING - find the main recipe photo from the images below' : 'Already set, but verify it looks correct'}
   Available images on page:
   ${imageUrls.join('\n   ')}
   Choose the one that looks like the main recipe photo (not ads, logos, author photos, or icons).

2. DESCRIPTION: ${!existingRecipe.description || existingRecipe.description.length < 20 ? 'MISSING or too short - write a compelling 1-2 sentence description' : 'Looks good, keep it'}

3. INGREDIENTS LIST: Verify the full list is captured with exact quantities. Add any missing ingredients.

FOCUS ESPECIALLY ON STEP METADATA (often incomplete in first pass):

For EACH step, ensure these fields are filled in:

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

3. NEEDS TIMER: Set to true ONLY if the step requires precise timing:
   - NEEDS TIMER (true): "bake for 25 minutes", "simmer for 10 minutes", "boil pasta 8-10 minutes"
   - NO TIMER (false): "chop onions", "sauté until golden", "stir until combined"
   Key question: Does the cook need an alarm, or can they tell by looking/tasting/touching?

4. INGREDIENTS: List short ingredient names used in THIS step only (e.g., ["chicken", "salt", "pepper"])

5. TEMPERATURE: Include cooking temp if mentioned (e.g., "375°F", "medium-high heat")

6. DEPENDS ON: Analyze step dependencies carefully for parallel cooking opportunities:
   - Steps that can start immediately should have empty dependsOn arrays
   - Steps requiring other steps to complete first should list those step IDs
   - Look for: "once the X is done", "after", "when", "while"
   - Parallel: prep work, preheating, marinating can happen simultaneously
   - Sequential: can't add ingredients to a pan before heating it

INGREDIENT CATEGORIES: Create a complete ingredientCategories object mapping each unique short ingredient name to one of these categories:
- "meat": beef, chicken, pork, steak, bacon, pancetta, lamb, turkey, sausage, ham, prosciutto
- "seafood": fish, salmon, shrimp, tuna, cod, lobster, crab, scallop, mussel, clam, anchovy
- "vegetable": onion, garlic, tomato, pepper, carrot, celery, potato, broccoli, spinach, lettuce, mushroom, asparagus, peas, beans, corn, cabbage, kale, ginger
- "dairy": butter, milk, cream, cheese (parmesan, pecorino, mozzarella, cheddar), yogurt, egg, yolk
- "grain": flour, bread, pasta, rice, noodle, spaghetti, oat, quinoa, couscous, tortilla
- "sauce": sauce, soy sauce, vinegar, oil, sesame oil, mayo, ketchup, mustard, dressing, broth, stock, wine
- "spice": salt, pepper, cumin, paprika, oregano, basil, thyme, rosemary, cinnamon, vanilla, sugar, honey, syrup, baking powder, baking soda
- "chocolate": chocolate, cocoa, chocolate chips
- "other": anything that doesn't fit above categories

IMPORTANT: Keep the same step IDs (step1, step2, etc.) and step text from the existing data. Only enhance the metadata fields.

Original webpage content for reference:
${textContent}`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Enhance error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to enhance recipe' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
