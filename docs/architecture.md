# Quoventra — Technical Architecture

**Product Name:** Quoventra  
**Tagline:** Estimate smarter. Grow faster.  
**Description:** AI-powered estimates, quotations and invoicing for modern businesses.  
**Architecture Style:** Modular Monolith (Multi-Tenant SaaS)

---

## 1. Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend Framework | Next.js (App Router), React, TypeScript | Full-stack web application, SSR/SSG for SEO, API routes |
| Styling & UI | Tailwind CSS, `shadcn/ui`, Lucide Icons | Responsive design system and accessible UI primitives |
| Backend & Database | InsForge, PostgreSQL | Relational data, authentication, file storage, row-level security |
| AI Integration | OpenAI / Anthropic Claude (Provider Abstraction) | Natural-language-to-structured-estimate generation |
| Payments | Stripe | Subscriptions, Checkout, Customer Portal, Webhooks |
| PDF Generation | React PDF | Branded estimates, quotations, and invoices |
| Transactional Email | Resend | Document delivery, notifications, automated reminders |
| Analytics | PostHog | Product and usage analytics |
| Hosting | Vercel (Frontend), InsForge (Backend) | Production deployment |

---

## 2. Application Areas

1. **Public Website (`src/app/(marketing)`, `src/app/(auth)`)**
   - SEO-friendly marketing pages, industry showcases, pricing, legal pages, public estimate/quotation preview, and authentication entry points.
2. **Business Dashboard (`src/app/dashboard`)**
   - Multi-tenant workspace for registered businesses: AI Estimate Generator, Estimates, Quotations, Invoices, Customers, Products & Services, Pricing Configuration, Document Templates, Team, Analytics, Subscription & Billing, and Settings.
3. **Platform Administration (`src/app/admin`)**
   - Restricted area for authorized platform administrators: user/business management, subscription & revenue analytics, AI usage monitoring, advertisement management, industry management, and audit logs.

---

## 3. Folder Structure

```text
src/
  app/
    (marketing)/        # Public website pages
    (auth)/             # Login, register, password recovery, verification
    dashboard/          # Multi-tenant business application
    admin/              # Platform administration
    api/                # Server-side API routes & webhooks
  components/
    ui/                 # shadcn/ui primitives & design system components
    layout/             # Navigation, sidebar, header, footer shells
    dashboard/          # Dashboard widgets & metrics
    estimates/          # Estimate builders & views
    quotations/         # Quotation & approval views
    invoices/           # Invoice & payment views
    customers/          # CRM components
    ai/                 # AI Estimate Generator & assistant components
  lib/
    auth/               # Authentication & session helpers
    database/           # InsForge client & database utilities
    ai/                 # OpenAI / Anthropic provider abstraction
    payments/           # Stripe & subscription entitlements
    email/              # Resend email client & templates
    pdf/                # React PDF document templates
    validation/         # Zod / schema validation
    permissions/        # RBAC & tenant/admin authorization guards
  services/
    estimates/          # Estimate domain logic
    quotations/         # Quotation domain logic
    invoices/           # Invoice domain logic
    customers/          # Customer domain logic
    subscriptions/      # Subscription & entitlement services
  types/                # Shared TypeScript interfaces & types
  hooks/                # Reusable React hooks
  config/               # Environment & application configuration
docs/
  architecture.md
  database.md
  development-progress.md
```

---

## 4. Core Architectural Principles

- **Multi-Tenant Isolation:** Every business-owned record is scoped by `business_id` and enforced at the database level via Row-Level Security (RLS).
- **Trusted Financial Calculations:** All monetary calculations are performed by backend decimal-safe logic, never by AI models or untrusted client inputs.
- **AI Provider Abstraction:** AI requests route through a server-side abstraction layer supporting OpenAI and Anthropic Claude, with strict JSON schema validation and token/usage tracking.
- **Security by Default:** Secrets and API keys are never exposed to client bundles. Public document links use secure tokens and never allow unauthenticated edits.

