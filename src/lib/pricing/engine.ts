import type { PricingMethod } from "@/types";

/**
 * Decimal-safe centralized pricing calculation engine.
 * All monetary math uses scaled integers (1e4 micro-units per currency unit)
 * and rounds half-up to 2 decimal places (cents) to avoid floating-point drift.
 */

const SCALE = 10_000;

export type LineItemCategory = "labour" | "material" | "equipment" | "service" | "other";

export type DiscountType = "none" | "percent" | "fixed";

export interface PricingLineInput {
  id?: string;
  name: string;
  category?: LineItemCategory;
  pricingMethod: PricingMethod;
  quantity: number;
  unitPrice: number;
  baseFee?: number;
  minCharge?: number | null;
  markupPercent?: number | null;
  isTaxable?: boolean;
  taxRateOverride?: number | null;
  /** Required when pricingMethod === "percentage" to compute % of a base amount */
  percentageBaseAmount?: number;
}

export interface DocumentPricingInput {
  items: PricingLineInput[];
  additionalCharges?: number;
  discountType?: DiscountType;
  discountValue?: number;
  /** Business default tax rate as a decimal (e.g. 0.0825 for 8.25%) */
  defaultTaxRate: number;
  /** Optional document-level tax rate override as a decimal */
  documentTaxRateOverride?: number | null;
}

export interface CalculatedLineItem {
  id?: string;
  name: string;
  category: LineItemCategory;
  pricingMethod: PricingMethod;
  quantity: number;
  unitPrice: number;
  baseFee: number;
  lineSubtotal: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  isTaxable: boolean;
}

export interface DocumentPricingSummary {
  items: CalculatedLineItem[];
  labourTotal: number;
  materialsTotal: number;
  additionalCharges: number;
  discountAmount: number;
  subtotal: number;
  taxableSubtotal: number;
  taxTotal: number;
  total: number;
}

function toMicros(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * SCALE);
}

function microsToCents(micros: number): number {
  // Half-up rounding from 1e-4 to 1e-2 (divide by 100)
  if (micros >= 0) {
    return Math.floor((micros + 50) / 100);
  }
  return -Math.floor((-micros + 50) / 100);
}

function centsToNumber(cents: number): number {
  return cents / 100;
}

function roundCents(value: number): number {
  return Math.round(value * 100);
}

/**
 * Calculates a single line item's subtotal in integer cents using exact scaled math.
 */
export function calculateLineSubtotalCents(item: PricingLineInput): number {
  const qtyMicros = toMicros(Math.max(0, item.quantity));
  const priceMicros = toMicros(Math.max(0, item.unitPrice));
  const baseFeeMicros = toMicros(Math.max(0, item.baseFee ?? 0));

  let rawMicros = 0;

  switch (item.pricingMethod) {
    case "fixed": {
      rawMicros = priceMicros + baseFeeMicros;
      break;
    }
    case "percentage": {
      const baseAmountMicros = toMicros(Math.max(0, item.percentageBaseAmount ?? 0));
      // unitPrice represents the percentage (e.g. 15 for 15%)
      const pctMicros = priceMicros;
      rawMicros =
        Math.round((baseAmountMicros * pctMicros) / (100 * SCALE)) +
        baseFeeMicros;
      break;
    }
    case "material": {
      const baseCostMicros = Math.round((qtyMicros * priceMicros) / SCALE);
      const markupPct = Math.max(0, item.markupPercent ?? 0);
      const markupMicros = Math.round(
        (baseCostMicros * toMicros(markupPct)) / (100 * SCALE)
      );
      rawMicros = baseCostMicros + markupMicros + baseFeeMicros;
      break;
    }
    case "hourly":
    case "quantity":
    case "square_foot":
    case "distance":
    case "per_item":
    case "custom":
    default: {
      rawMicros = Math.round((qtyMicros * priceMicros) / SCALE) + baseFeeMicros;
      break;
    }
  }

  let cents = microsToCents(rawMicros);

  if (item.minCharge != null && Number.isFinite(item.minCharge)) {
    const minCents = roundCents(Math.max(0, item.minCharge));
    if (cents > 0 && cents < minCents) {
      cents = minCents;
    }
  }

  return cents;
}

/**
 * Centralized backend pricing calculation for estimates, quotations, and invoices.
 */
export function calculateDocumentPricing(
  input: DocumentPricingInput
): DocumentPricingSummary {
  const defaultRate = Math.max(
    0,
    input.documentTaxRateOverride ?? input.defaultTaxRate
  );

  let labourCents = 0;
  let materialsCents = 0;
  let itemsSubtotalCents = 0;

  const calculatedItems: CalculatedLineItem[] = input.items.map((item) => {
    const category: LineItemCategory = item.category ?? "service";
    const lineSubtotalCents = calculateLineSubtotalCents(item);
    const isTaxable = item.isTaxable ?? true;
    const effectiveRate = isTaxable
      ? Math.max(
          0,
          item.taxRateOverride ??
            input.documentTaxRateOverride ??
            input.defaultTaxRate
        )
      : 0;

    itemsSubtotalCents += lineSubtotalCents;
    if (category === "labour") {
      labourCents += lineSubtotalCents;
    } else if (category === "material") {
      materialsCents += lineSubtotalCents;
    }

    const lineTaxCents = isTaxable
      ? Math.round(lineSubtotalCents * effectiveRate)
      : 0;

    return {
      id: item.id,
      name: item.name,
      category,
      pricingMethod: item.pricingMethod,
      quantity: item.quantity,
      unitPrice: centsToNumber(roundCents(item.unitPrice)),
      baseFee: centsToNumber(roundCents(item.baseFee ?? 0)),
      lineSubtotal: centsToNumber(lineSubtotalCents),
      taxRate: effectiveRate,
      taxAmount: centsToNumber(lineTaxCents),
      lineTotal: centsToNumber(lineSubtotalCents + lineTaxCents),
      isTaxable,
    };
  });

  const additionalChargesCents = roundCents(
    Math.max(0, input.additionalCharges ?? 0)
  );
  const grossSubtotalCents = itemsSubtotalCents + additionalChargesCents;

  let discountCents = 0;
  const discountType = input.discountType ?? "none";
  const discountVal = Math.max(0, input.discountValue ?? 0);

  if (discountType === "percent") {
    const clampedPct = Math.min(100, discountVal);
    discountCents = Math.round((grossSubtotalCents * clampedPct) / 100);
  } else if (discountType === "fixed") {
    discountCents = Math.min(grossSubtotalCents, roundCents(discountVal));
  }

  const netSubtotalCents = Math.max(0, grossSubtotalCents - discountCents);

  // Proportionally apply discount to taxable items so tax reflects net taxable amount
  const taxableItemsRawCents = calculatedItems.reduce(
    (sum, item) => sum + (item.isTaxable ? roundCents(item.lineSubtotal) : 0),
    0
  );

  let taxableSubtotalCents = taxableItemsRawCents + additionalChargesCents;
  if (grossSubtotalCents > 0 && discountCents > 0) {
    const discountRatio = discountCents / grossSubtotalCents;
    taxableSubtotalCents = Math.max(
      0,
      Math.round(taxableSubtotalCents * (1 - discountRatio))
    );
  }

  // Sum per-item taxes (adjusted proportionally for any discount) + tax on additional charges
  let taxTotalCents = 0;
  if (grossSubtotalCents > 0) {
    const netFactor = 1 - discountCents / grossSubtotalCents;
    const itemTaxes = calculatedItems.reduce(
      (sum, item) => sum + roundCents(item.taxAmount),
      0
    );
    const additionalTax = Math.round(additionalChargesCents * defaultRate);
    taxTotalCents = Math.round((itemTaxes + additionalTax) * netFactor);
  }

  const totalCents = netSubtotalCents + taxTotalCents;

  return {
    items: calculatedItems,
    labourTotal: centsToNumber(labourCents),
    materialsTotal: centsToNumber(materialsCents),
    additionalCharges: centsToNumber(additionalChargesCents),
    discountAmount: centsToNumber(discountCents),
    subtotal: centsToNumber(netSubtotalCents),
    taxableSubtotal: centsToNumber(taxableSubtotalCents),
    taxTotal: centsToNumber(taxTotalCents),
    total: centsToNumber(totalCents),
  };
}

export function formatCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

