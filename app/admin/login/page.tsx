import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/admin/login-form';
import { getSession } from '@/lib/auth';

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) redirect('/admin');

  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <p className="section-kicker">Operations access</p>
          <h1 className="font-display text-4xl text-white">Admin Login</h1>
          <p className="text-sm text-brand-dim">
            Sign in to manage inventory, leads, and dealership settings.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
