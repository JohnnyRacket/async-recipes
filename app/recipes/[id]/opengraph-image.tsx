import { ImageResponse } from 'next/og';
import { getCachedRecipe } from '@/lib/kv';

export const alt = 'Recipe preview';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getCachedRecipe(id);

  if (!recipe) {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fef3c7',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ fontSize: 48, fontWeight: 'bold', color: '#92400e' }}>
            Recipe Not Found
          </div>
        </div>
      ),
      { ...size }
    );
  }

  // Calculate stats
  const totalTime = recipe.steps.reduce((sum, step) => sum + (step.duration || 0), 0);
  const parallelSteps = recipe.steps.filter((s) => s.dependsOn.length === 0).length;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fffbeb',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header with gradient */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '48px 64px',
            background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
            color: 'white',
          }}
        >
          <div style={{ fontSize: 24, opacity: 0.9, marginBottom: 8 }}>
            Forked Recipes
          </div>
          <div style={{ fontSize: 64, fontWeight: 'bold', lineHeight: 1.1 }}>
            {recipe.title}
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            padding: '32px 64px',
            gap: 48,
          }}
        >
          {/* Description */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontSize: 28,
                color: '#78350f',
                lineHeight: 1.4,
                maxHeight: 160,
                overflow: 'hidden',
              }}
            >
              {recipe.description}
            </div>

            {/* Stats */}
            <div
              style={{
                display: 'flex',
                gap: 32,
                marginTop: 32,
                fontSize: 22,
                color: '#92400e',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{recipe.steps.length} steps</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{recipe.ingredients.length} ingredients</span>
              </div>
              {totalTime > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>~{totalTime} min</span>
                </div>
              )}
              {parallelSteps > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{parallelSteps} parallel</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            padding: '24px 64px',
            backgroundColor: '#fef3c7',
            fontSize: 20,
            color: '#92400e',
          }}
        >
          Visualize cooking as a dependency graph
        </div>
      </div>
    ),
    { ...size }
  );
}
