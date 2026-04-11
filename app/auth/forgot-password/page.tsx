import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell
      eyebrow="Recovery"
      title="Reset Credentials"
      description="Send a password reset link through the existing Supabase flow without changing your underlying auth setup."
    >
      <div className="w-full max-w-md">
        <ForgotPasswordForm />
      </div>
    </AuthShell>
  );
}
