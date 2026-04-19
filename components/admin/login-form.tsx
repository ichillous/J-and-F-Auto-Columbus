'use client';

import { useState, useTransition } from 'react';
import { AlertCircle, Lock, Mail } from 'lucide-react';

import { loginAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl lg:text-3xl">Welcome Back</CardTitle>
        <CardDescription>Sign in with your Cognito admin credentials.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await loginAction(formData);
              if (result?.error) setError(result.error);
            });
          }}
          className="flex flex-col gap-6"
        >
          <div className="grid gap-2">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email
            </Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password" className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Password
            </Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>

          {error ? (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Button type="submit" className="w-full" variant="accent" size="lg" disabled={isPending}>
            {isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
