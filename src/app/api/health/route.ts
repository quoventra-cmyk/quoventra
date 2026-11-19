import { NextResponse } from "next/server";
import { isInsForgeConfigured } from "@/config/env";
import { siteConfig } from "@/config/site";
import type { HealthStatus } from "@/types";

export async function GET() {
  const payload: HealthStatus = {
    status: "ok",
    product: siteConfig.name,
    phase: "Phase 0 — Project Foundation & Architecture",
    insforgeConfigured: isInsForgeConfigured(),
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(payload);
}

