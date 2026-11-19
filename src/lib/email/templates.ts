export type EmailTemplateKey =
  | "estimate_sent"
  | "quotation_sent"
  | "quotation_approved"
  | "quotation_rejected"
  | "invoice_sent"
  | "payment_recorded"
  | "invoice_reminder";

export interface DefaultTemplate {
  key: EmailTemplateKey;
  label: string;
  subject: string;
  bodyText: string;
}

export const DEFAULT_EMAIL_TEMPLATES: DefaultTemplate[] = [
  {
    key: "estimate_sent",
    label: "Estimate Sent",
    subject: "Estimate {{document_number}} from {{business_name}}",
    bodyText:
      "Hello {{customer_name}},\n\nPlease find your estimate {{document_number}} ({{total}}) from {{business_name}}.\n\nIf you have any questions, simply reply to this email.",
  },
  {
    key: "quotation_sent",
    label: "Quotation Sent",
    subject: "Quotation {{document_number}} from {{business_name}}",
    bodyText:
      "Hello {{customer_name}},\n\nYour quotation {{document_number}} for {{total}} is ready for review.\n\nView and respond online: {{link}}\n\nThank you,\n{{business_name}}",
  },
  {
    key: "quotation_approved",
    label: "Quotation Approved",
    subject: "Quotation {{document_number}} Approved",
    bodyText:
      "Hello,\n\n{{customer_name}} has approved quotation {{document_number}} ({{total}}).\n\nReview in Quoventra: {{link}}",
  },
  {
    key: "quotation_rejected",
    label: "Quotation Declined",
    subject: "Quotation {{document_number}} Declined",
    bodyText:
      "Hello,\n\n{{customer_name}} has declined quotation {{document_number}}.\n\nReview details in Quoventra: {{link}}",
  },
  {
    key: "invoice_sent",
    label: "Invoice Sent",
    subject: "Invoice {{document_number}} from {{business_name}}",
    bodyText:
      "Hello {{customer_name}},\n\nPlease find invoice {{document_number}} for {{total}} from {{business_name}}.\n\nThank you for your business.",
  },
  {
    key: "payment_recorded",
    label: "Payment Recorded",
    subject: "Payment Received for Invoice {{document_number}}",
    bodyText:
      "Hello {{customer_name}},\n\nWe have recorded your payment for invoice {{document_number}}. Thank you!\n\n{{business_name}}",
  },
  {
    key: "invoice_reminder",
    label: "Invoice Due Reminder",
    subject: "Reminder: Invoice {{document_number}} from {{business_name}}",
    bodyText:
      "Hello {{customer_name}},\n\nThis is a friendly reminder regarding invoice {{document_number}} ({{total}}).\n\nPlease reach out if you have any questions.\n\n{{business_name}}",
  },
];

export function renderTemplateString(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return variables[key] ?? "";
  });
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function textToSimpleHtml(text: string): string {
  const safe = escapeHtml(text).replaceAll("\n", "<br />");
  return `<div style="font-family:sans-serif;line-height:1.6;color:#0f172a;max-width:600px">${safe}</div>`;
}

