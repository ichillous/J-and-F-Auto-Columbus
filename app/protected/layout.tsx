import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="page-shell min-h-screen">
      <div className="shell-container flex min-h-screen flex-col gap-14 py-6">
        <nav className="flex h-16 items-center justify-between rounded-full border border-white/8 bg-white/[0.03] px-5 text-sm">
          <div className="flex items-center gap-5 font-semibold text-white">
            <Link href={"/"}>J&F Auto</Link>
            <div className="flex items-center gap-2">
              <DeployButton />
            </div>
          </div>
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense>
              <AuthButton />
            </Suspense>
          )}
        </nav>
        <div className="flex-1">
          {children}
        </div>
        <footer className="border-t border-white/8 pt-8 text-center text-xs uppercase tracking-[0.24em] text-brand-dim">
          Protected workspace
        </footer>
      </div>
    </main>
  );
}
