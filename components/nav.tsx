import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export function Nav() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🍴</span>
            <span className="text-xl font-bold">Forked Recipes</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link 
              href="/recipes" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              All Recipes
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <Link 
              href="/add" 
              className="bg-gradient-to-r from-orange-500 to-amber-400 text-white px-4 py-2 rounded-full font-medium hover:from-orange-600 hover:to-amber-500 transition-all hover:scale-105 shadow-md"
            >
              ✨ Fork a Recipe
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
