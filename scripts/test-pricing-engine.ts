import assert from "node:assert/strict";
import {
  calculateDocumentPricing,
  calculateLineSubtotalCents,
  formatCurrency,
} from "../src/lib/pricing/engine";

// 1. Decimal precision test (classic 0.1 + 0.2 floating-point pitfall)
const decimalSummary = calculateDocumentPricing({
  items: [
    { name: "Item A", pricingMethod: "fixed", quantity: 1, unitPrice: 0.1, isTaxable: false },
    { name: "Item B", pricingMethod: "fixed", quantity: 1, unitPrice: 0.2, isTaxable: false },
  ],
  defaultTaxRate: 0,
});
assert.equal(decimalSummary.subtotal, 0.3, "0.1 + 0.2 must equal exact 0.30");
assert.equal(decimalSummary.total, 0.3);

// 2. Hourly + Materials + Tax (Construction basement renovation)
const renovation = calculateDocumentPricing({
  items: [
    {
      name: "Renovation Labour",
      category: "labour",
      pricingMethod: "hourly",
      quantity: 80,
      unitPrice: 45,
      isTaxable: true,
    },
    {
      name: "Materials",
      category: "material",
      pricingMethod: "material",
      quantity: 1,
      unitPrice: 4500,
      markupPercent: 0,
      isTaxable: true,
    },
  ],
  defaultTaxRate: 0.05,
});
assert.equal(renovation.labourTotal, 3600);
assert.equal(renovation.materialsTotal, 4500);
assert.equal(renovation.subtotal, 8100);
assert.equal(renovation.taxTotal, 405);
assert.equal(renovation.total, 8505);

// 3. Material markup + minimum charge + distance + square_foot + percentage
assert.equal(
  calculateLineSubtotalCents({
    name: "Turf with 20% markup",
    pricingMethod: "material",
    quantity: 10,
    unitPrice: 25,
    markupPercent: 20,
  }),
  30000
);

assert.equal(
  calculateLineSubtotalCents({
    name: "Short trip with min charge",
    pricingMethod: "distance",
    quantity: 5,
    unitPrice: 2.5,
    baseFee: 25,
    minCharge: 75,
  }),
  7500
);

assert.equal(
  calculateLineSubtotalCents({
    name: "Flooring sq ft",
    pricingMethod: "square_foot",
    quantity: 800,
    unitPrice: 3,
  }),
  240000
);

assert.equal(
  calculateLineSubtotalCents({
    name: "Management fee 15%",
    pricingMethod: "percentage",
    quantity: 1,
    unitPrice: 15,
    percentageBaseAmount: 2000,
  }),
  30000
);

// 4. Discount + document tax override
const discounted = calculateDocumentPricing({
  items: [
    {
      name: "Consulting",
      category: "labour",
      pricingMethod: "hourly",
      quantity: 10,
      unitPrice: 100,
      isTaxable: true,
    },
  ],
  discountType: "percent",
  discountValue: 10,
  defaultTaxRate: 0.05,
  documentTaxRateOverride: 0.1,
});
assert.equal(discounted.discountAmount, 100);
assert.equal(discounted.subtotal, 900);
assert.equal(discounted.taxTotal, 90);
assert.equal(discounted.total, 990);

// 5. Fixed discount + mixed taxable / non-taxable + per-item tax override
const mixedTax = calculateDocumentPricing({
  items: [
    {
      name: "Taxable Service",
      pricingMethod: "fixed",
      quantity: 1,
      unitPrice: 200,
      isTaxable: true,
      taxRateOverride: 0.13,
    },
    {
      name: "Exempt Permit",
      pricingMethod: "fixed",
      quantity: 1,
      unitPrice: 100,
      isTaxable: false,
    },
  ],
  discountType: "fixed",
  discountValue: 30, // 10% of 300 gross
  defaultTaxRate: 0.05,
});
assert.equal(mixedTax.discountAmount, 30);
assert.equal(mixedTax.subtotal, 270);
assert.equal(mixedTax.taxTotal, 23.4); // 200 * 0.13 * 0.9 = 23.40
assert.equal(mixedTax.total, 293.4);

// 6. Half-up rounding on fractional quantity * rate
assert.equal(
  calculateLineSubtotalCents({
    name: "Fractional hours",
    pricingMethod: "hourly",
    quantity: 1.335,
    unitPrice: 10,
  }),
  1335 // $13.35
);

// 7. Currency formatting
assert.equal(formatCurrency(1234.5, "USD"), "$1,234.50");
assert.ok(formatCurrency(1234.5, "EUR").includes("1,234.50"));

console.log("ALL_PRICING_ENGINE_TESTS_PASSED");
