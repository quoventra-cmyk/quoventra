import { notFound } from "next/navigation";
import {
  PublicQuotationView,
  type PublicQuotationPayload,
} from "@/components/quotations/public-quotation-view";
import { requireInsForgeClient } from "@/lib/database/insforge";

export const dynamic = "force-dynamic";

export default async function PublicQuotationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const insforge = requireInsForgeClient();

  const { data, error } = await insforge.database.rpc("get_public_quotation", {
    p_token: token,
  });

  if (error || !data) {
    notFound();
  }

  return (
    <PublicQuotationView
      token={token}
      quotation={data as PublicQuotationPayload}
    />
  );
}

