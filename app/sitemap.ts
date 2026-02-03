import { MetadataRoute } from 'next';
import { getCachedRecipes } from '@/lib/kv';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const recipes = await getCachedRecipes();
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/recipes`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/add`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...recipes.map((recipe) => ({
      url: `${baseUrl}/recipes/${recipe.id}`,
      lastModified: new Date(recipe.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
