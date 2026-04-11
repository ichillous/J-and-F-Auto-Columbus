import { UpdatePasswordForm } from "@/components/update-password-form";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell
      eyebrow="Password update"
      title="Set A New Password"
      description="Complete the current reset flow and return to the authenticated application with the same protected routes."
    >
      <div className="w-full max-w-md">
        <UpdatePasswordForm />
      </div>
    </AuthShell>
  );
}
