'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';

interface RecipeSearchInputProps {
  defaultValue?: string;
}

export function RecipeSearchInput({ defaultValue = '' }: RecipeSearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with URL changes (but don't clear if we're on a recipe detail route)
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    // Only sync if we have a query param or if input is already empty
    if (urlQuery || value === '') {
      setValue(urlQuery);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle search with proper debounce
  const handleSearch = (term: string) => {
    setValue(term);

    // Clear any existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout - 500ms for a more comfortable typing experience
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (term.trim()) {
          params.set('q', term.trim());
        } else {
          params.delete('q');
        }
        router.push(`/recipes?${params.toString()}`, { scroll: false });
      });
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <Input
        type="search"
        placeholder="Search recipes by name, description, or ingredient..."
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full"
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}
    </div>
  );
}
