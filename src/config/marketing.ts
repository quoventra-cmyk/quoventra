import type { SubscriptionTier } from "@/types";

export interface PricingPlan {
  id: SubscriptionTier;
  name: string;
  priceMonthly: number;
  description: string;
  highlighted?: boolean;
  ctaLabel: string;
  features: string[];
}

export interface IndustryItem {
  slug: string;
  name: string;
  category: "Trades & Home Services" | "Property & Field" | "Professional & Creative";
  summary: string;
  pricingDrivers: string[];
  exampleJob: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  highlights: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ResourceArticle {
  slug: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
}

export const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/industries", label: "Industries" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Resources" },
] as const;

export const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    description: "For solo operators getting started with structured estimates.",
    ctaLabel: "Start Free",
    features: [
      "Limited monthly estimates",
      "Basic quotations",
      "Basic PDF exports",
      "Limited customer records",
      "Starter AI usage allowance",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 19,
    description: "For growing small businesses sending regular client quotes.",
    ctaLabel: "Choose Starter",
    features: [
      "Higher monthly estimate volume",
      "Full customer management",
      "Professional document templates",
      "Branded PDF downloads",
      "Basic business analytics",
      "Ad-free workspace",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    priceMonthly: 49,
    highlighted: true,
    description: "For established teams automating estimates, quotes, and invoices.",
    ctaLabel: "Choose Professional",
    features: [
      "Full AI estimate generation",
      "Expanded AI usage allowance",
      "Quotations with client approval links",
      "Invoice conversion & tracking",
      "Email delivery",
      "Advanced document customization",
      "Business analytics",
    ],
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 99,
    description: "For multi-member teams needing scale, branding, and automation.",
    ctaLabel: "Choose Business",
    features: [
      "Highest usage limits",
      "Multiple team members & roles",
      "Advanced reporting",
      "Custom business branding",
      "Automated follow-ups & reminders",
      "Priority support",
    ],
  },
];

export const coreFeatures: FeatureItem[] = [
  {
    id: "ai-estimates",
    title: "AI Estimate Generation",
    description:
      "Describe a job in plain language and receive a structured estimate draft with separated labour, materials, assumptions, and missing-info prompts.",
    highlights: [
      "Uses your saved business rates—never invents pricing",
      "Flags missing quantities or rates for your review",
      "Every line item stays fully editable before sending",
    ],
  },
  {
    id: "quotations",
    title: "Quotation Creation & Client Approval",
    description:
      "Convert approved estimates into polished quotations with shareable customer links where clients can accept, reject, or request revisions.",
    highlights: [
      "Immutable pricing snapshots preserve document accuracy",
      "Timestamped acceptance and revision history",
      "One-click conversion to invoice after approval",
    ],
  },
  {
    id: "invoicing",
    title: "Invoice Generation & Payment Tracking",
    description:
      "Turn accepted quotations into invoices or create them directly, track partial and full payments, and monitor overdue balances.",
    highlights: [
      "Decimal-safe financial calculations",
      "Partial payment and balance-due tracking",
      "Clear status lifecycle from Draft to Paid",
    ],
  },
  {
    id: "customers",
    title: "Customer Management (CRM)",
    description:
      "Organize individual and commercial clients with complete histories of estimates, quotations, invoices, notes, and outstanding balances.",
    highlights: [
      "Supports both individuals and business accounts",
      "Unified timeline of all client documents",
      "Tenant-isolated per business workspace",
    ],
  },
  {
    id: "pricing-engine",
    title: "Flexible Pricing Configuration",
    description:
      "Configure reusable services, products, and multi-method pricing rules tailored to how your industry actually quotes work.",
    highlights: [
      "Fixed, hourly, square-foot, distance, material, and custom rates",
      "Jurisdiction-aware tax configuration with overrides",
      "Centralized backend calculation engine",
    ],
  },
  {
    id: "documents",
    title: "Document Customization & Branded PDFs",
    description:
      "Export clean, client-ready PDF estimates, quotations, and invoices featuring your logo, brand colors, terms, and contact details.",
    highlights: [
      "Consistent document numbering and dates",
      "Discounts, taxes, and custom terms & conditions",
      "Instant preview and PDF download",
    ],
  },
  {
    id: "ai-assistant",
    title: "Guided AI Estimating Assistant",
    description:
      "Work alongside an AI assistant that understands trade workflows, clarifies scope gaps, and drafts clear client-facing line descriptions.",
    highlights: [
      "Supports OpenAI and Anthropic Claude backends",
      "Full AI generation history and usage visibility",
      "Business owner always retains final pricing control",
    ],
  },
];

export const industriesList: IndustryItem[] = [
  {
    slug: "construction-renovation",
    name: "Construction & Renovation",
    category: "Trades & Home Services",
    summary:
      "Break down multi-stage builds and remodels into clear labour, materials, and subcontractor line items.",
    pricingDrivers: ["Labour hours", "Material quantities", "Equipment costs"],
    exampleJob: "500 sq ft basement renovation with 80 labour hours and materials.",
  },
  {
    slug: "plumbing-hvac-electrical",
    name: "Plumbing, Electrical & HVAC",
    category: "Trades & Home Services",
    summary:
      "Quote service calls, installations, and system upgrades with standardized parts and hourly rates.",
    pricingDrivers: ["Hourly labour", "Per-item parts", "Call-out fees"],
    exampleJob: "Panel upgrade or HVAC condenser replacement with parts and labour.",
  },
  {
    slug: "painting-roofing-handyman",
    name: "Painting, Roofing & Handyman",
    category: "Trades & Home Services",
    summary:
      "Estimate surface area, prep work, materials, and multi-task punch lists in minutes.",
    pricingDrivers: ["Square footage", "Materials", "Fixed task rates"],
    exampleJob: "Interior 3-room repaint including primer, paint, and trim.",
  },
  {
    slug: "cleaning",
    name: "Cleaning Services",
    category: "Property & Field",
    summary:
      "Standardize residential and commercial cleaning quotes by room count, property size, and hours.",
    pricingDrivers: ["Number of rooms", "Property size", "Cleaning hours"],
    exampleJob: "Deep clean for a 3-bedroom, 2-bathroom home (~5 hours).",
  },
  {
    slug: "landscaping",
    name: "Landscaping & Lawn Care",
    category: "Property & Field",
    summary:
      "Calculate turf, soil, mulch, hardscape materials, and crew hours from site measurements.",
    pricingDrivers: ["Square footage", "Bulk materials", "Crew labour"],
    exampleJob: "1,000 sq ft new lawn installation with soil, sod, and labour.",
  },
  {
    slug: "moving",
    name: "Moving & Logistics",
    category: "Property & Field",
    summary:
      "Combine crew size, hourly rates, truck fees, and travel distance into transparent moving quotes.",
    pricingDrivers: ["Crew size", "Hourly rates", "Distance & vehicle fees"],
    exampleJob: "Local 2-bedroom move with 3 movers, truck fee, and 25 km travel.",
  },
  {
    slug: "automotive-maintenance",
    name: "Automotive Repair & Maintenance",
    category: "Property & Field",
    summary:
      "Itemize diagnostic time, OEM/aftermarket parts, and shop labour clearly for vehicle owners.",
    pricingDrivers: ["Shop labour hours", "Parts per item", "Shop supplies"],
    exampleJob: "Brake pad and rotor replacement with diagnostic inspection.",
  },
  {
    slug: "consulting-agencies",
    name: "Consultants, Freelancers & Agencies",
    category: "Professional & Creative",
    summary:
      "Turn discovery notes into structured retainers, milestone proposals, and hourly project scopes.",
    pricingDrivers: ["Hourly rates", "Fixed project fees", "Deliverable packages"],
    exampleJob: "20-hour strategy consulting engagement or website redesign.",
  },
  {
    slug: "photography-events",
    name: "Photography & Event Services",
    category: "Professional & Creative",
    summary:
      "Package coverage hours, base packages, travel, and post-production add-ons cleanly.",
    pricingDrivers: ["Base packages", "Coverage hours", "Editing add-ons"],
    exampleJob: "8-hour wedding photography package with album and extra editing.",
  },
  {
    slug: "it-fitness",
    name: "IT Services & Fitness Coaching",
    category: "Professional & Creative",
    summary:
      "Quote managed IT rollouts, hardware setups, or recurring coaching packages with clarity.",
    pricingDrivers: ["Per-seat / per-session", "Setup fees", "Monthly packages"],
    exampleJob: "Office network setup or 12-week personal training program.",
  },
];

export const howItWorksSteps = [
  {
    step: "01",
    title: "Configure your business & pricing",
    description:
      "Select your industry, upload your logo, set your tax defaults, and add your reusable services, labour rates, and materials.",
  },
  {
    step: "02",
    title: "Describe the job in plain language",
    description:
      "Enter project details—measurements, hours, materials, or client notes—and let Quoventra AI structure the draft estimate.",
  },
  {
    step: "03",
    title: "Review, refine, and export",
    description:
      "Inspect AI assumptions, fill in any flagged missing rates, adjust line items, and preview your branded PDF.",
  },
  {
    step: "04",
    title: "Send quotation, get approval, and invoice",
    description:
      "Share a secure quotation link for client acceptance, then convert the approved quote into an invoice in one click.",
  },
];

export const faqItems: FaqItem[] = [
  {
    question: "Does Quoventra AI make up prices on its own?",
    answer:
      "No. Quoventra AI uses the rates and services you save in your business catalog or the numbers you provide in the prompt. When pricing or quantities are missing, it flags them for you instead of inventing figures.",
  },
  {
    question: "Can I use Quoventra for my specific industry?",
    answer:
      "Yes. Quoventra supports fixed pricing, hourly rates, square-footage, distance, materials, per-item, percentage, and custom pricing rules—making it adaptable across trades, field services, agencies, and consultants.",
  },
  {
    question: "Do my customers need an account to approve a quotation?",
    answer:
      "No. You can generate a secure shareable quotation link so your customer can review line items, read terms, and accept or request changes with verification—without registering an account.",
  },
  {
    question: "Is my business data isolated from other companies?",
    answer:
      "Yes. Quoventra is built as a multi-tenant platform with database-level row security so every business workspace stays strictly isolated.",
  },
  {
    question: "Can I start for free and upgrade later?",
    answer:
      "Yes. You can begin on the Free plan and upgrade to Starter, Professional, or Business as your estimate volume, team size, and automation needs grow.",
  },
];

export const resourceArticles: ResourceArticle[] = [
  {
    slug: "how-to-separate-labour-and-materials",
    title: "Why Separating Labour and Materials Wins More Client Approvals",
    category: "Estimating Best Practices",
    readTime: "4 min read",
    summary:
      "Transparent line-item breakdowns build trust with homeowners and commercial buyers while protecting your margins.",
  },
  {
    slug: "estimate-vs-quotation-vs-invoice",
    title: "Estimate vs. Quotation vs. Invoice: When to Use Each Document",
    category: "Business Operations",
    readTime: "5 min read",
    summary:
      "A practical guide to moving smoothly from an initial cost estimate to a binding quotation and final invoice.",
  },
  {
    slug: "pricing-rules-for-service-businesses",
    title: "Choosing the Right Pricing Model: Hourly, Fixed, or Square-Foot",
    category: "Pricing Strategy",
    readTime: "6 min read",
    summary:
      "How contractors, cleaners, landscapers, and consultants structure pricing rules to quote faster without undercharging.",
  },
];

