'use client';

import dynamic from 'next/dynamic';

export const AddRecipeFormWrapper = dynamic(
  () => import('@/components/add-recipe-form').then(m => ({ default: m.AddRecipeFormWrapper })),
  { ssr: false }
);
