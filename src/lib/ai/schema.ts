import { z } from "zod";

export const aiEstimateRequestSchema = z.object({
  projectDescription: z
    .string()
    .trim()
    .min(10, "Please describe the project (at least 10 characters).")
    .max(4000),
  industryName: z.string().trim().min(1).max(120),
  customerName: z.string().trim().max(150).optional(),
  projectLocation: z.string().trim().max(200).optional(),
  measurements: z.string().trim().max(500).optional(),
  labourDetails: z.string().trim().max(500).optional(),
  materialsDetails: z.string().trim().max(500).optional(),
  requirements: z.string().trim().max(1000).optional(),
});

export type AIEstimateRequest = z.infer<typeof aiEstimateRequestSchema>;

export const aiLineItemSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().default(""),
  category: z
    .enum(["labour", "material", "equipment", "service", "other"])
    .default("service"),
  pricing_method: z
    .enum([
      "fixed",
      "hourly",
      "quantity",
      "material",
      "square_foot",
      "distance",
      "per_item",
      "percentage",
      "custom",
    ])
    .default("fixed"),
  quantity: z.number().nonnegative().nullable(),
  unit: z.string().trim().min(1).default("unit"),
  unit_price: z.number().nonnegative().nullable(),
  pricing_source: z
    .enum(["business_rate", "user_provided", "missing"])
    .default("user_provided"),
  is_taxable: z.boolean().default(true),
  needs_price: z.boolean().default(false),
  needs_quantity: z.boolean().default(false),
});

export const aiEstimateOutputSchema = z.object({
  project_title: z.string().trim().min(2),
  description: z.string().trim().min(2),
  line_items: z.array(aiLineItemSchema).min(1),
  notes: z.array(z.string().trim()).default([]),
  assumptions: z.array(z.string().trim()).default([]),
  missing_information: z.array(z.string().trim()).default([]),
});

export type AIEstimateOutput = z.infer<typeof aiEstimateOutputSchema>;

export function buildEstimateSystemPrompt(): string {
  return `You are Quoventra's professional estimating assistant.
Your job is to convert a user's plain-language project description and their saved business catalog/pricing rules into a structured JSON estimate draft.

STRICT RULES:
1. NEVER invent business pricing, hourly rates, material prices, or tax rates.
2. Use saved business catalog items or pricing rules when they match the work, and set pricing_source to "business_rate".
3. Use prices or quantities explicitly provided by the user in their prompt, and set pricing_source to "user_provided".
4. If a required unit_price is NOT provided by the user and NOT in the business catalog, set unit_price to null, pricing_source to "missing", needs_price to true, and explain what price is needed in missing_information.
5. If a quantity is NOT provided or clearly implied by measurements, set quantity to null, needs_quantity to true, and list it in missing_information.
6. Separate labour line items (category: "labour") from material line items (category: "material").
7. Do NOT calculate final tax or grand totals—our backend pricing engine calculates all financial totals.
8. Return ONLY valid JSON matching this exact schema:
{
  "project_title": "string",
  "description": "string",
  "line_items": [
    {
      "name": "string",
      "description": "string",
      "category": "labour | material | equipment | service | other",
      "pricing_method": "fixed | hourly | quantity | material | square_foot | distance | per_item | percentage | custom",
      "quantity": number | null,
      "unit": "string",
      "unit_price": number | null,
      "pricing_source": "business_rate | user_provided | missing",
      "is_taxable": boolean,
      "needs_price": boolean,
      "needs_quantity": boolean
    }
  ],
  "notes": ["string"],
  "assumptions": ["string"],
  "missing_information": ["string"]
}`;
}

