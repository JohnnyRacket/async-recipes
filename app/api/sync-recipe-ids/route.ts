import { syncRecipeIds } from '@/lib/kv';

export async function POST() {
  try {
    const count = await syncRecipeIds();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        count,
        message: `Synced recipe IDs. Total recipes: ${count}` 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to sync recipe IDs',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
