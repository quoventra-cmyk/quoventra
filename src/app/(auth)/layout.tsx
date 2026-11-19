import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-8">
        <BrandLogo showTagline />
      </div>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground underline-offset-4 hover:underline">
          ← Back to Quoventra home
        </Link>
      </p>
    </div>
  );
}
