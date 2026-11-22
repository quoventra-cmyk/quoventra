import path from "node:path";
import React from "react";
import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getActiveBusinessContext, getCurrentAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";
import {
  EstimatePdfDocument,
  type PdfBusinessInfo,
  type PdfLineItem,
} from "@/lib/pdf/estimate-document";

export async function GET(
  request: NextRequest,
  contextParams: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessContext = await getActiveBusinessContext(user.id);
  if (!businessContext) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const { id } = await contextParams.params;
  const insforge = await createInsForgeServerClient();

  const [{ data: quotation }, { data: items }] = await Promise.all([
    insforge.database
      .from("quotations")
      .select("*")
      .eq("id", id)
      .eq("business_id", businessContext.business.id)
      .maybeSingle(),
    insforge.database
      .from("quotation_items")
      .select("name, description, quantity, unit, unit_price, line_total")
      .eq("quotation_id", id)
      .eq("business_id", businessContext.business.id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

  const snapshot = (quotation.business_snapshot ?? {}) as PdfBusinessInfo;
  const defaultLogoPath = path.join(
    process.cwd(),
    "public",
    "quoventra-logo.png"
  );
  const rawLogo =
    snapshot.logo_url ?? businessContext.business.logo_url ?? null;
  const resolvedLogo =
    !rawLogo || rawLogo === "/quoventra-logo.png"
      ? defaultLogoPath
      : rawLogo.startsWith("/")
        ? path.join(process.cwd(), "public", rawLogo.replace(/^\//, ""))
        : rawLogo;

  const businessInfo: PdfBusinessInfo = snapshot.name
    ? { ...snapshot, logo_url: resolvedLogo }
    : {
        name: businessContext.business.name,
        email: businessContext.business.email,
        phone: businessContext.business.phone,
        website: businessContext.business.website,
        address: businessContext.business.address,
        city: businessContext.business.city,
        region: businessContext.business.region,
        country: businessContext.business.country,
        postal_code: businessContext.business.postal_code,
        logo_url: resolvedLogo,
        tax_registration_number:
          businessContext.business.tax_registration_number,
        brand_color: businessContext.settings?.brand_color ?? "#2563eb",
      };

  const pdfBuffer = await renderToBuffer(
    React.createElement(EstimatePdfDocument, {
      documentLabel: "Quotation",
      documentNumber: quotation.quotation_number,
      status: quotation.status,
      title: quotation.title,
      description: quotation.description,
      issueDate: quotation.issue_date,
      expiryDate: quotation.expiry_date,
      currency: quotation.currency,
      subtotal: Number(quotation.subtotal),
      discountAmount: Number(quotation.discount_amount),
      taxRate: Number(quotation.tax_rate),
      taxAmount: Number(quotation.tax_amount),
      total: Number(quotation.total),
      notes: quotation.notes,
      terms: quotation.terms,
      customerName: quotation.customer_name,
      customerEmail: quotation.customer_email,
      customerPhone: quotation.customer_phone,
      customerAddress: quotation.customer_address,
      business: businessInfo,
      items: (items ?? []) as PdfLineItem[],
    })
  );

  const download = request.nextUrl.searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${quotation.quotation_number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

