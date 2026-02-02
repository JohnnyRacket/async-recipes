import { streamObject } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { RecipeSchema } from '@/lib/schemas';

// Note: Edge runtime removed as it's incompatible with cacheComponents.
// Node.js runtime still provides good streaming performance.

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
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
      .filter((url): url is string => url !== null && url.startsWith('http'))
      .slice(0, 5); // Keep top 5 potential images

    // Strip HTML tags for cleaner input (basic cleanup)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000); // Limit to avoid token limits

    // Use AI SDK to stream structured recipe extraction
    const result = streamObject({
      model: gateway('openai/gpt-oss-20b'),
      schema: RecipeSchema,
      prompt: `Extract a recipe from the following webpage content. 

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

rINGREDIENT CATEGORIES: Create an ingredientCategories object that maps each unique short ingredient name (used in steps) to one of these categories:
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

IMAGE: If any of these image URLs appears to be the main recipe photo (not an ad, logo, or unrelated image), include it as imageUrl:
${imageUrls.join('\n')}

Webpage content:
${textContent}`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Ingest error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process recipe' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
