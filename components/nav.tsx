import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export function Nav() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🍴</span>
            <span className="text-xl font-bold">Parallel Recipes</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <Link 
              href="/recipes" 
              className="text-muted-foreground hover:text-foreground transition-colors text-sm sm:text-base"
            >
              <span className="hidden sm:inline">All Recipes</span>
              <span className="sm:hidden">Recipes</span>
            </Link>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <Link 
              href="/add" 
              className="bg-gradient-to-r from-purple-500 to-purple-400 text-white px-3 py-2 sm:px-4 rounded-full font-medium hover:from-purple-600 hover:to-purple-500 transition-all hover:scale-105 shadow-md text-sm sm:text-base whitespace-nowrap"
            >
              <span className="hidden sm:inline">✨ Fork a Recipe</span>
              <span className="sm:hidden">✨ Fork</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
