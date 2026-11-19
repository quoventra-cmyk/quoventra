import type { PricingMethod } from "@/types";

export const PRICING_METHODS: {
  value: PricingMethod;
  label: string;
  defaultUnit: string;
  description: string;
}[] = [
  {
    value: "fixed",
    label: "Fixed Price",
    defaultUnit: "lot",
    description: "Flat project or package rate regardless of hours.",
  },
  {
    value: "hourly",
    label: "Hourly Rate",
    defaultUnit: "hour",
    description: "Rate multiplied by labour or service hours.",
  },
  {
    value: "quantity",
    label: "Quantity-Based",
    defaultUnit: "unit",
    description: "Price per unit multiplied by quantity.",
  },
  {
    value: "material",
    label: "Material-Based",
    defaultUnit: "unit",
    description: "Material cost with optional percentage markup.",
  },
  {
    value: "square_foot",
    label: "Square-Foot",
    defaultUnit: "sq_ft",
    description: "Rate multiplied by measured area in square feet.",
  },
  {
    value: "distance",
    label: "Distance-Based",
    defaultUnit: "km",
    description: "Rate per kilometer or mile plus optional base fee.",
  },
  {
    value: "per_item",
    label: "Per-Item",
    defaultUnit: "item",
    description: "Count-based pricing per fixture, room, or item.",
  },
  {
    value: "percentage",
    label: "Percentage-Based",
    defaultUnit: "percent",
    description: "Percentage of a base amount (e.g. management or rush fee).",
  },
  {
    value: "custom",
    label: "Custom Formula",
    defaultUnit: "custom",
    description: "Base fee plus unit rate with optional minimum charge.",
  },
];

export const UNIT_TYPES = [
  "hour",
  "sq_ft",
  "km",
  "mile",
  "unit",
  "item",
  "room",
  "lot",
  "day",
  "percent",
  "custom",
] as const;

