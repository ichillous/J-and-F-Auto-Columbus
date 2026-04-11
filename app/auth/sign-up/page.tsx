import { SignUpForm } from "@/components/sign-up-form";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell
      eyebrow="Account creation"
      title="Create Access"
      description="Provision a new account that can later be granted dealership roles inside the admin workspace."
    >
      <div className="w-full max-w-md">
        <SignUpForm />
      </div>
    </AuthShell>
  );
}
