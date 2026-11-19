import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  href?: string;
  showTagline?: boolean;
  className?: string;
}

export function BrandLogo({
  href = "/",
  showTagline = false,
  className,
}: BrandLogoProps) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 group", className)}
    >
      <span className="relative flex h-9 w-11 shrink-0 items-center justify-center rounded-xl bg-white/95 p-1 shadow-xs ring-1 ring-border/70 transition-transform duration-200 group-hover:scale-105 dark:bg-slate-900">
        <Image
          src="/quoventra-logo.png"
          alt={`${siteConfig.name} logo`}
          width={40}
          height={28}
          className="h-7 w-auto object-contain"
          priority
        />
      </span>
      <span className="flex flex-col">
        <span className="text-xl font-extrabold tracking-tight text-foreground leading-none">
          {siteConfig.name}
        </span>
        {showTagline ? (
          <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">
            {siteConfig.tagline}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
