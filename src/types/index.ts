export type SubscriptionTier = "free" | "starter" | "professional" | "business";

export type BusinessMemberRole = "owner" | "admin" | "member" | "viewer";

export type PlatformRole = "user" | "platform_admin";

export type EstimateStatus =
  | "draft"
  | "pending"
  | "sent"
  | "viewed"
  | "approved"
  | "rejected"
  | "expired"
  | "converted";

export type QuotationStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "expired"
  | "converted";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type PricingMethod =
  | "fixed"
  | "hourly"
  | "quantity"
  | "material"
  | "square_foot"
  | "distance"
  | "per_item"
  | "percentage"
  | "custom";

export interface HealthStatus {
  status: "ok";
  product: string;
  phase: string;
  insforgeConfigured: boolean;
  timestamp: string;
}

