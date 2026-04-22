import Link from 'next/link';
import { Menu } from 'lucide-react';

import { ClientOnly } from '@/components/client-only';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface PublicHeaderProps {
  currentPath?: string;
}

const links = [
  { href: '/', label: 'Home' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/contact', label: 'Contact' },
];

export function PublicHeader({ currentPath = '/' }: PublicHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#05070a]/88 backdrop-blur-xl">
      <div className="shell-container flex h-24 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <Logo size="lg" />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((link) => {
            const active = currentPath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-brand-silver transition hover:text-white',
                  'after:absolute after:-bottom-3 after:left-0 after:h-px after:w-full after:bg-accent after:transition-opacity',
                  active ? 'text-white after:opacity-100' : 'after:opacity-0',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="accent" size="default" className="hidden min-w-[120px] sm:inline-flex">
            <Link href="/contact">Contact</Link>
          </Button>
          <ClientOnly
            fallback={(
              <Button variant="outline" size="icon" className="lg:hidden" disabled aria-hidden="true">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Open navigation</span>
              </Button>
            )}
          >
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[22rem]">
                <SheetHeader className="mb-8">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-3">
                  {links.map((link) => {
                    const active = currentPath === link.href;
                    return (
                      <Button
                        key={link.href}
                        asChild
                        variant={active ? 'accent' : 'secondary'}
                        className="justify-start rounded-2xl px-5 text-left"
                        size="lg"
                      >
                        <Link href={link.href}>{link.label}</Link>
                      </Button>
                    );
                  })}
                  <Button asChild variant="outline" size="lg" className="mt-4 justify-start rounded-2xl px-5">
                    <Link href="/contact">Get in Touch</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </ClientOnly>
        </div>
      </div>
    </header>
  );
}
