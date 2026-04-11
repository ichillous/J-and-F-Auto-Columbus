import Link from 'next/link';
import { Globe, Menu } from 'lucide-react';

import { ClientOnly } from '@/components/client-only';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#05070a]/85 backdrop-blur-xl">
      <div className="shell-container flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <Logo size="lg" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const active = currentPath === link.href;
            return (
              <Button
                key={link.href}
                asChild
                variant="ghost"
                className={cn(
                  'rounded-full px-4 py-2 text-[0.68rem] tracking-[0.2em]',
                  active && 'border border-accent/25 bg-accent/10 text-accent',
                )}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden md:inline-flex">
            <Globe className="h-4 w-4" />
            <span className="sr-only">Location settings</span>
          </Button>
          <Button asChild variant="accent" size="sm" className="hidden sm:inline-flex">
            <Link href="/contact">Inquire</Link>
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
                  <SheetTitle>Navigate</SheetTitle>
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
                    <Link href="/contact">Start Concierge Inquiry</Link>
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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
