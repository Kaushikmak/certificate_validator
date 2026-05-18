// components/Navbar.tsx
import Link from "next/link";
import { ShieldCheck, FileSignature, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur dark:bg-zinc-950/95">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight">HederaNotary</span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <FileSignature className="h-4 w-4" />
              <span className="hidden sm:inline">Register Document</span>
              <span className="sm:hidden">Register</span>
            </Button>
          </Link>
          
          <Link href="/verify">
            <Button variant="default" size="sm" className="gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Verify Document</span>
              <span className="sm:hidden">Verify</span>
            </Button>
          </Link>
        </nav>
        
      </div>
    </header>
  );
}