import Link from 'next/link';
import { Car, LayoutDashboard, Mail, Menu, Settings, User } from 'lucide-react';

import { getCurrentProfile, getCurrentUser } from '@/lib/auth';

import { ClientOnly } from '@/components/client-only';
import { LogoutButton } from '@/components/logout-button';
import { Logo } from '@/components/logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const navLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/cars', label: 'Cars', icon: Car },
  { href: '/admin/leads', label: 'Leads', icon: Mail },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;

  if (!user || !profile) {
    return <>{children}</>;
  }

  const currentRole = profile.role === 'admin' ? 'accent' : 'secondary';

  return (
    <div className="page-shell min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#05070a]/88 backdrop-blur-xl">
        <div className="shell-container flex h-20 items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-3">
            <Logo size="lg" />
            <div className="hidden sm:block">
              <p className="section-kicker">Operations</p>
              <p className="font-display text-2xl text-white">Admin Console</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Button key={href} asChild variant="ghost">
                <Link href={href}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </Button>
            ))}
            {profile.role === 'admin' ? (
              <Button asChild variant="ghost">
                <Link href="/admin/settings">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost">
              <Link href="/admin/profile">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </Button>
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{profile.full_name || user.email}</p>
              <Badge variant={currentRole} size="sm" className="capitalize">
                {profile.role}
              </Badge>
            </div>
            <LogoutButton />
          </div>

          <ClientOnly
            fallback={(
              <Button variant="outline" size="icon" className="xl:hidden" disabled aria-hidden="true">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Open admin navigation</span>
              </Button>
            )}
          >
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="xl:hidden">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Open admin navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[22rem]">
                <SheetHeader className="mb-8">
                  <SheetTitle>Admin Console</SheetTitle>
                </SheetHeader>
                <div className="mb-6 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-sm font-semibold text-white">{profile.full_name || user.email}</p>
                  <Badge variant={currentRole} size="sm" className="mt-2 capitalize">
                    {profile.role}
                  </Badge>
                </div>
                <div className="flex flex-col gap-3">
                  {navLinks.map(({ href, label, icon: Icon }) => (
                    <Button key={href} asChild variant="secondary" className="justify-start rounded-2xl px-5" size="lg">
                      <Link href={href}>
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    </Button>
                  ))}
                  {profile.role === 'admin' ? (
                    <Button asChild variant="secondary" className="justify-start rounded-2xl px-5" size="lg">
                      <Link href="/admin/settings">
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="secondary" className="justify-start rounded-2xl px-5" size="lg">
                    <Link href="/admin/profile">
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                  </Button>
                  <div className="pt-3">
                    <LogoutButton />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </ClientOnly>
        </div>
      </header>

      <main className="shell-container py-8 lg:py-10">{children}</main>
    </div>
  );
}
