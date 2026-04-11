import { LoginForm } from "@/components/login-form";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell
      eyebrow="Customer and staff access"
      title="Secure Sign In"
      description="Access admin tools, update dealership content, and manage leads from the same authenticated workflow."
    >
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </AuthShell>
  );
}
