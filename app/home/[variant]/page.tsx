import { getCachedRecentRecipes, getCachedRecipeCount } from '@/lib/kv';
import { ABTracker } from '@/components/ab-tracker';
import { HeroSection } from '../_components/hero-section';
import { RecentlyForked } from '../_components/recently-forked';
import { HowItWorks } from '../_components/how-it-works';

export function generateStaticParams() {
  return [{ variant: 'a' }, { variant: 'b' }];
}

export default async function Home({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;

  const [recentRecipes, totalCount] = await Promise.all([
    getCachedRecentRecipes(3),
    getCachedRecipeCount(),
  ]);

  return ( 
    <div className="space-y-12">
      <ABTracker variant={variant} />
      <HeroSection totalCount={totalCount} />
      {variant === 'b' ? (
        <>
          <HowItWorks />
          <RecentlyForked recipes={recentRecipes} />
        </>
      ) : (
        <>
          <RecentlyForked recipes={recentRecipes} />
          <HowItWorks />
        </>
      )}
    </div>
  );
}
