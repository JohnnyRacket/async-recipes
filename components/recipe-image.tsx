'use client';

import { useState } from 'react';
import Image from 'next/image';

interface RecipeImageProps {
  src?: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

function Placeholder() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-950 dark:to-amber-900 flex items-center justify-center">
      <svg
        className="w-16 h-16 text-orange-300 dark:text-orange-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    </div>
  );
}

export function RecipeImage({ src, alt, sizes, priority, className }: RecipeImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <Placeholder />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={`object-cover ${className || ''}`}
      sizes={sizes}
      priority={priority}
      onError={() => setHasError(true)}
    />
  );
}
