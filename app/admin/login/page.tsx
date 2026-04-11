import { LoginForm } from '@/components/login-form';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If already logged in and has profile, redirect to admin
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      redirect('/admin');
    }
  }

  return (
    <AuthShell
      eyebrow="Operations access"
      title="Admin Login"
      description="Sign in to manage inventory, leads, dealership settings, and profile data from the restyled admin console."
    >
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </AuthShell>
  );
}
