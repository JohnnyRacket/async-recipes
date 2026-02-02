'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RecipesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <h2 className="text-xl font-semibold">Failed to load recipes</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
