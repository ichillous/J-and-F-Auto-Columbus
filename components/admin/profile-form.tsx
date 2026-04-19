'use client';

import { useState, useTransition } from 'react';
import { User as UserIcon, Mail, Shield, CheckCircle, AlertCircle } from 'lucide-react';

import { updateProfileAction } from '@/lib/actions/auth';
import type { AdminSession } from '@/lib/aws/cognito';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProfileFormProps {
  session: AdminSession;
}

export function ProfileForm({ session }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fullName, setFullName] = useState(session.fullName ?? '');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-accent" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={(formData) => {
              setError(null);
              setSuccess(false);
              startTransition(async () => {
                const result = await updateProfileAction(formData);
                if (result?.error) {
                  setError(result.error);
                } else if (result?.success) {
                  setSuccess(true);
                  setTimeout(() => setSuccess(false), 3000);
                }
              });
            }}
            className="space-y-6"
          >
            <div>
              <Label htmlFor="full_name" className="flex items-center gap-1.5">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </Label>
              <Input id="email" type="email" value={session.email} disabled className="bg-muted/50" />
              <p className="text-sm text-muted-foreground mt-2">
                Email cannot be changed here. Contact an administrator if you need to change your email.
              </p>
            </div>

            <div>
              <Label className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Role
              </Label>
              <div className="mt-2">
                <Badge
                  variant={session.role === 'admin' ? 'accent' : 'secondary'}
                  size="default"
                  className="capitalize"
                >
                  {session.role}
                </Badge>
              </div>
            </div>

            {error && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p className="font-medium">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {success && (
              <Card className="border-green-500/50 bg-green-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <p className="font-medium">Profile updated successfully!</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} variant="accent" size="lg">
                {isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
