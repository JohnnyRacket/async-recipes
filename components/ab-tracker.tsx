'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics';

export function ABTracker({ variant }: { variant: string }) {
  useEffect(() => {
    track('homepage-view', { variant });
  }, [variant]);
  return null;
}
