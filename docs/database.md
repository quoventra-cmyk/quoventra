# Quoventra — Database Architecture

**Database Engine:** PostgreSQL (via InsForge)  
**Tenancy Model:** Multi-tenant with `business_id` scoping and Row-Level Security (RLS)  
**Status:** Planned in Phase 0; schema migrations will be implemented starting in Phase 2.

---

## 1. Design Principles

1. **Tenant Isolation:** Every business-owned table includes `business_id` with foreign key constraints, indexes, and database-level RLS policies.
2. **Immutable Historical Snapshots:** Saved estimates, quotations, and invoices preserve line-item prices, tax rates, and business/customer snapshots at creation/issuance time so future catalog edits never alter historical documents.
3. **Decimal-Safe Precision:** Monetary columns use exact numeric/decimal types (`NUMERIC` / `DECIMAL`), avoiding floating-point inaccuracies.
4. **Auditability:** Status transitions, customer approvals, payment records, and administrative actions are logged in dedicated history and audit tables.

---

## 2. Logical Table Groups

### User & Business (Phase 2)
- `profiles` — User profile metadata (`id`, `full_name`, `email`, `avatar_url`, timestamps)
- `industries` — Supported business industries (`id`, `name`, `slug`, `description`, `is_active`)
- `businesses` — Tenant business workspaces (`id`, `owner_id`, `name`, `slug`, `industry_id`, contact, address, `currency`, `logo_url`, `tax_registration_number`, timestamps)
- `business_members` — Team membership and roles (`id`, `business_id`, `user_id`, `role`, `created_at`)
- `business_settings` — Business defaults (`id`, `business_id`, `default_currency`, `default_tax_rate`, `document_prefix`, `default_payment_terms`, `default_expiry_days`, timestamps)

### Products, Services & Pricing (Phase 3)
- `service_categories`
- `products_services`
- `pricing_rules`

### Customers (Phase 8)
- `customers`
- `customer_notes`
- `customer_communications`

### Estimates (Phase 5)
- `estimates`
- `estimate_items`
- `estimate_history`

### Quotations (Phase 6)
- `quotations`
- `quotation_items`
- `quotation_approvals`
- `quotation_history`

### Invoices (Phase 7)
- `invoices`
- `invoice_items`
- `invoice_payments`
- `invoice_history`

### AI & Usage (Phase 4)
- `ai_generation_history`
- `ai_usage_records`
- `ai_provider_settings`

### Subscriptions & Billing (Phase 11)
- `subscription_plans`
- `subscriptions`
- `subscription_usage`
- `stripe_customers`
- `stripe_webhook_events`

### Platform Administration & Ads (Phases 12–13)
- `admin_users`
- `audit_logs`
- `platform_settings`
- `advertisements`
- `advertisement_events`

---

## 3. InsForge Connection Requirements

To connect and apply migrations in Phase 2+, configure the following environment variables in `.env.local`:
- `NEXT_PUBLIC_INSFORGE_URL`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`
- `INSFORGE_SERVICE_ROLE_KEY` (server-side only, when needed)

