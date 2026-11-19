MASTER PRODUCT KNOWLEDGE
AI ESTIMATE & QUOTATION GENERATOR
Product Vision, Architecture & Phase-by-Phase Development Plan
Document: knowledge.md
Product / Brand Name: Quoventra
Tagline: Estimate smarter. Grow faster.
Product Description: AI-powered estimates, quotations and invoicing for modern businesses.
Project Type: Multi-Tenant SaaS Web Application
Product Category: AI Business Software / Quotation & Estimation Management
Development Environment: Google Antigravity
Status: Development Blueprint
Version: 1.0
1. INSTRUCTIONS TO THE AI DEVELOPMENT AGENT
You are the lead software architect, senior full-stack developer, UI/UX designer, database engineer, and AI integration engineer responsible for building this product.

Your responsibility is to build a complete, production-quality SaaS platform based on this document.

This is not a simple quotation form or a basic AI chatbot. It is a commercial software product designed to serve multiple industries, generate recurring subscription revenue, and eventually become an independently scalable software business.
Critical development instructions
1. Read this entire knowledge.md before starting development.
2. Understand the complete product vision and architecture.
3. Build the application in the exact phases described below.
4. Do not attempt to implement all phases simultaneously.
5. Do not skip phases.
6. Do not replace functional features with placeholder buttons or mock interfaces.
7. Do not use hardcoded demonstration data as production functionality.
8. Use real database persistence, authentication, API integrations, and business logic.
9. Build reusable components and maintain clean, modular code.
10. Make the application responsive across desktop, tablet, and mobile.
11. Follow security best practices.
12. Test each phase before proceeding to the next.
13. Update project documentation as development progresses.
14. Maintain backward compatibility when modifying existing features.
15. Never expose API keys, secrets, or private credentials in frontend code.
If a feature requires an external service or API key that has not been provided, build the integration structure, document the required configuration, and clearly identify the missing dependency. Never pretend an integration is functional when it is not.

Important: This knowledge file is the source of truth for product requirements. If a development decision conflicts with this document, follow this document unless the project owner explicitly approves a change.
2. PRODUCT OVERVIEW
Official product brand
Product name: Quoventra

Tagline: Estimate smarter. Grow faster.

Brand description: AI-powered estimates, quotations and invoicing for modern businesses.

Use Quoventra as the product name throughout the public website, application interface, product documentation, and brand assets. Keep the brand broad enough to support future expansion into additional business software products and workflows. Do not introduce another temporary or competing product name unless the project owner explicitly approves a change.
Product concept
Build Quoventra as an AI-powered Estimate, Quotation, and Invoice Generation SaaS platform.

The application allows businesses and independent professionals to create professional estimates, quotations, and invoices using AI assistance and customizable pricing rules.

The platform must support multiple industries rather than being restricted to one business category.

A business should be able to register, select its industry, configure its services and pricing, customize its documents, manage customers, and generate professional estimates.

The AI should help users turn simple descriptions of jobs or projects into structured estimates.

Users must always retain control over final prices and documents.
Product mission
Make professional business estimating and quotation management accessible to businesses of all sizes.
Target customers
The platform should support:
- Construction companies
- Renovation businesses
- Moving companies
- Cleaning companies
- Landscaping businesses
- Plumbing companies
- Electrical contractors
- Painting businesses
- Roofing companies
- HVAC companies
- Handyman services
- Automotive repair businesses
- Freelancers
- fitness coach
- Consultants
- Marketing agencies
- Photography businesses
- Event service providers
- IT service providers
- Maintenance companies
- General service providers
- Other businesses that provide services or project-based work
The architecture must allow additional industries to be introduced without rebuilding the application.
Product positioning
An intelligent business tool that helps companies create estimates, quotations, and invoices faster while maintaining professional standards.
3. PRODUCT DESIGN PRINCIPLES
The application must follow these principles:
Simplicity
Users should be able to create a professional estimate without needing accounting or technical knowledge.
Flexibility
Different industries have different pricing methods. The application must support hourly rates, fixed prices, quantities, materials, square footage, distance, equipment, and custom calculations.
AI assistance
AI should reduce manual work, not remove business-owner control.
Professional documents
All generated estimates, quotations, and invoices must look professional and be suitable for sending to customers.
Scalability
The application must support multiple businesses, users, subscriptions, and industries.
Trust
AI must never silently invent prices, tax rates, materials, or business information.
Mobile responsiveness
The complete application must work properly on mobile devices, tablets, and desktops.
4. TECHNOLOGY STACK
Use the following recommended technology stack.
Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide icons
Use reusable components and a consistent design system.
Backend
- InsForge as the backend platform.
- PostgreSQL for relational data.
- InsForge authentication.
- InsForge storage for documents and business assets.
- Server-side API routes and secure backend functions.
Do not introduce a second backend platform without approval.
AI integration
Support an AI provider abstraction so the application can use:
- OpenAI API
- Anthropic Claude API
The AI provider must be configurable through secure environment variables.

Do not tie the entire application to one AI provider.
Payments
- Stripe for subscription billing.
- Stripe Checkout for subscription purchases.
- Stripe Customer Portal for subscription management.
- Stripe webhooks for subscription status synchronization.
PDF generation
Use a reliable PDF generation library, preferably React PDF.

Generated documents must support:
- Business branding
- Logo
- Business contact information
- Customer information
- Itemized pricing
- Taxes
- Discounts
- Terms and conditions
- Document numbers
- Document dates
Email
Use Resend or an equivalent transactional email service.
Deployment
- Vercel for frontend hosting.
- InsForge for backend services.
Analytics
Use PostHog or an equivalent analytics platform.
5. APPLICATION STRUCTURE
Build three main application areas.
A. Public website
Accessible without registration.

Pages:
1. Home
2. Features
3. Industries
4. Pricing
5. How It Works
6. About
7. Contact
8. Login
9. Register
10. Privacy Policy
11. Terms of Service
12. Public Estimate/Quotation Preview
13. Blog or Resources
The public website must be SEO-friendly.
B. Business application dashboard
Accessible to registered users.

Pages:
1. Dashboard
2. AI Estimate Generator
3. Estimates
4. Quotations
5. Invoices
6. Customers
7. Products & Services
8. Pricing Configuration
9. Document Templates
10. Business Profile
11. Team Management
12. Reports & Analytics
13. AI Assistant
14. Subscription & Billing
15. Settings
C. Platform administration
Accessible only to authorized platform administrators.

Pages:
1. Admin Dashboard
2. User Management
3. Business Management
4. Subscription Management
5. Revenue Analytics
6. AI Usage Monitoring
7. Advertisement Management
8. Industry Management
9. Platform Settings
10. System Activity Logs
The platform administrator must have a separate permission level from ordinary business users.
6. PHASE-BY-PHASE DEVELOPMENT PLAN
PHASE 0 — PROJECT FOUNDATION & ARCHITECTURE
Goal: Establish the project structure and technical foundation.

Tasks:
1. Initialize the Next.js project.
2. Configure TypeScript.
3. Configure Tailwind CSS.
4. Install and configure shadcn/ui.
5. Configure Lucide icons.
6. Establish the application folder structure.
7. Configure environment variables.
8. Connect InsForge.
9. Establish the database connection.
10. Configure Git and project documentation.
11. Establish reusable UI components.
12. Create the initial design system.
Suggested folder structure:
src/
  app/
    (marketing)/
    (auth)/
    dashboard/
    admin/
    api/

  components/
    ui/
    layout/
    dashboard/
    estimates/
    quotations/
    invoices/
    customers/
    ai/

  lib/
    auth/
    database/
    ai/
    payments/
    email/
    pdf/
    validation/
    permissions/

  services/
    estimates/
    quotations/
    invoices/
    customers/
    subscriptions/

  types/
  hooks/
  config/

docs/
  architecture.md
  database.md
  development-progress.md

knowledge.md
Acceptance criteria:
- Application runs locally.
- TypeScript works correctly.
- UI framework is configured.
- InsForge connection is established or its configuration requirements are documented.
- Environment variables are documented.
- Project structure is clean.
- No unnecessary dependencies are introduced.
Do not proceed until the foundation is working.
PHASE 1 — PUBLIC WEBSITE & BRAND IDENTITY
Goal: Build the public-facing website.

The design must look like a premium modern SaaS product.

Design direction:
- Clean and modern.
- Professional business-oriented appearance.
- Minimal visual clutter.
- High-quality typography.
- Consistent spacing.
- Subtle animations.
- Professional dashboard previews.
- Fully responsive layouts.
Use the approved product name Quoventra throughout the public-facing website and brand identity. Apply the tagline “Estimate smarter. Grow faster.” and the description “AI-powered estimates, quotations and invoicing for modern businesses.”

Pages:
Homepage
Include:
- Hero section.
- Clear product value proposition.
- Main call to action.
- Product dashboard preview.
- Feature overview.
- Supported industries.
- How it works.
- Pricing preview.
- Testimonials section when genuine testimonials exist.
- Frequently asked questions.
- Footer.
Features page
Explain:
- AI estimate generation.
- Quotation creation.
- Invoice generation.
- Customer management.
- Pricing configuration.
- Document customization.
- AI assistance.
Industries page
Display supported industries with relevant use cases.
Pricing page
Display Free, Starter, Professional, and Business plans.
Authentication pages
Create login, registration, password recovery, and email verification experiences.

Acceptance criteria:
- All public pages work.
- Navigation works.
- Forms validate correctly.
- Mobile layout works.
- SEO metadata is implemented.
- Authentication entry points are functional.
PHASE 2 — AUTHENTICATION & MULTI-TENANT DATABASE
Goal: Build secure authentication and business account management.

The platform is multi-tenant.

Each registered business must have its own isolated workspace.

Users must never be able to access another business's private information.
Authentication
Implement:
- Email registration.
- Login.
- Logout.
- Email verification.
- Password reset.
- Session management.
- Protected dashboard routes.
Business onboarding
After registration, guide the user through onboarding.

Collect:
- Business name.
- Owner name.
- Email.
- Phone.
- Business website (optional).
- Business address.
- Country.
- Currency.
- Industry.
- Business description.
- Logo (optional).
Allow users to complete onboarding and edit their information later.
Industry selection
Provide a searchable industry selector.

Include an Other option.

Store industry selection in the database.

Do not create a separate application for every industry.
Database foundation
Create tables for:
profiles
- id
- full_name
- email
- avatar_url
- created_at
- updated_at
businesses
- id
- owner_id
- name
- slug
- industry_id
- description
- email
- phone
- website
- address
- city
- region
- country
- postal_code
- currency
- logo_url
- tax_registration_number
- created_at
- updated_at
industries
- id
- name
- slug
- description
- is_active
business_members
- id
- business_id
- user_id
- role
- created_at
business_settings
- id
- business_id
- default_currency
- default_tax_rate
- document_prefix
- default_payment_terms
- default_expiry_days
- created_at
- updated_at
Use appropriate foreign keys, indexes, unique constraints, and timestamps.
Security
Implement database-level row security.

Every business-owned table must enforce tenant isolation.

Never rely only on frontend filtering for security.

Acceptance criteria:
- Registration works.
- Login works.
- Business onboarding works.
- Users can manage their business profile.
- Business data is isolated.
- Unauthorized access is blocked.
PHASE 3 — PRODUCTS, SERVICES & PRICING ENGINE
Goal: Build a flexible pricing system that supports different industries.

This is one of the most important parts of the platform.

Different businesses calculate prices differently.

Do not hardcode a single pricing formula.
Products and services management
Allow businesses to create reusable services and products.

Fields:
- Name.
- Description.
- Category.
- Unit type.
- Default price.
- Cost (optional).
- Taxable status.
- Active/inactive status.
Supported pricing methods
Implement:
1. Fixed price.
2. Hourly rate.
3. Quantity-based pricing.
4. Material-based pricing.
5. Square-foot pricing.
6. Distance-based pricing.
7. Per-item pricing.
8. Percentage-based pricing.
9. Custom pricing.
Examples:

Construction:
- Labour hours.
- Material quantities.
- Equipment costs.
Cleaning:
- Number of rooms.
- Property size.
- Cleaning hours.
Landscaping:
- Square footage.
- Materials.
- Labour.
Moving:
- Crew size.
- Hourly rates.
- Vehicle fees.
- Distance.
Consulting:
- Hourly rates.
- Fixed project fees.
Photography:
- Packages.
- Number of hours.
- Additional editing.
Pricing calculations
Create a centralized pricing calculation engine.

It must calculate:
- Quantity.
- Unit price.
- Labour.
- Materials.
- Additional charges.
- Discounts.
- Subtotal.
- Taxes.
- Total.
Use decimal-safe financial calculations. Do not rely on floating-point arithmetic for monetary accuracy.

Tax configuration must be business-specific and jurisdiction-aware.

Never assume every business charges the same tax rate.

Allow users to override tax rates when legally appropriate.

Acceptance criteria:
- Businesses can create products and services.
- Multiple pricing methods work.
- Calculations are accurate.
- Pricing rules can be edited.
- Different industries can use different pricing structures.
PHASE 4 — AI ESTIMATE GENERATOR
Goal: Build the core AI-powered feature.

This is the main selling point of the product.

The user should be able to describe a project in ordinary language and receive a structured estimate draft.
User experience
Create an AI Estimate Generator page.

Include:
- Project description field.
- Industry selector.
- Customer selector.
- Optional project location.
- Optional measurements.
- Optional labour details.
- Optional materials.
- Optional project requirements.
- Generate Estimate button.
Example user input:

"I need to renovate a 500-square-foot basement. Labour costs $45 per hour. Estimated labour time is 80 hours. Materials are expected to cost $4,500."

The AI should generate structured information:
- Project title.
- Project description.
- Line items.
- Quantity.
- Unit.
- Unit price.
- Labour.
- Materials.
- Additional charges.
- Subtotal.
- Applicable tax assumptions.
- Estimated total.
- Notes.
- Assumptions.
- Missing information.
AI rules
The AI must follow these rules:
1. Never invent business pricing.
2. Use saved business pricing when available.
3. If pricing is missing, ask the user or mark the item as requiring a price.
4. Never silently assume quantities.
5. Clearly identify estimated values.
6. Allow the user to edit all generated line items.
7. Separate labour from materials.
8. Explain assumptions.
9. Ask for clarification when essential project information is missing.
10. Never automatically send an estimate without user approval.
AI structured output
Require validated JSON output.

Suggested structure:
{
  "project_title": "Basement Renovation",
  "description": "Basement renovation project",
  "line_items": [
    {
      "name": "Labour",
      "description": "Renovation labour",
      "quantity": 80,
      "unit": "hours",
      "unit_price": 45,
      "amount": 3600,
      "pricing_source": "business_rate"
    },
    {
      "name": "Materials",
      "description": "Estimated materials",
      "quantity": 1,
      "unit": "lot",
      "unit_price": 4500,
      "amount": 4500,
      "pricing_source": "user_provided"
    }
  ],
  "subtotal": 8100,
  "tax": 405,
  "total": 8505,
  "assumptions": [],
  "missing_information": []
}
This is an illustrative schema, not permission to assume GST or any other tax.

Validate all AI responses against a strict schema.

The backend pricing engine, not the AI model, must calculate the final financial totals.
AI architecture
Build a provider abstraction:
- OpenAI provider.
- Claude provider.
Allow provider selection through server-side configuration.

Implement:
- Error handling.
- Token usage tracking.
- Request limits.
- Retry handling.
- AI generation history.
- Secure API key management.
Acceptance criteria:
- User can enter a job description.
- AI returns structured estimate data.
- Pricing is validated.
- Missing information is identified.
- User can edit generated results.
- Estimate can be saved.
- AI failures are handled gracefully.
PHASE 5 — ESTIMATE MANAGEMENT
Goal: Turn generated estimates into a complete business workflow.

Create an Estimates page.

Features:
- Create estimate manually.
- Create estimate using AI.
- Edit estimates.
- Duplicate estimates.
- Delete drafts.
- Search estimates.
- Filter by status.
- Sort by date.
- View estimate details.
Estimate statuses
- Draft.
- Pending.
- Sent.
- Viewed.
- Approved.
- Rejected.
- Expired.
- Converted.
Estimate document fields
- Estimate number.
- Business details.
- Customer details.
- Project title.
- Description.
- Line items.
- Quantities.
- Unit prices.
- Discounts.
- Taxes.
- Total.
- Notes.
- Terms.
- Issue date.
- Expiry date.
PDF generation
Generate professional branded PDF estimates.

Support:
- Business logo.
- Company colours.
- Business contact information.
- Customer information.
- Itemized pricing.
- Totals.
- Terms and conditions.
Allow PDF preview and download.
Database
Create estimates and estimate_items tables.

Each estimate must belong to a business and customer where applicable.

Preserve historical pricing in saved documents. Changes to the business's current service prices must not silently modify previously created estimates.

Acceptance criteria:
- Estimates can be created and saved.
- Documents can be edited.
- PDF generation works.
- Search and filters work.
- Historical document values remain unchanged.
PHASE 6 — QUOTATION GENERATOR & CUSTOMER APPROVAL
Goal: Allow businesses to turn estimates into professional quotations and receive customer approval.
Quotation generation
Allow users to:
- Create quotations manually.
- Convert an estimate into a quotation.
- Edit quotations.
- Duplicate quotations.
- Download quotation PDFs.
- Email quotations.
- Generate public customer links.
Customer quotation page
Create a secure, shareable quotation page.

Customers should be able to:
- View the quotation.
- Review pricing.
- Read terms and conditions.
- Accept the quotation.
- Reject the quotation.
- Leave comments.
- Request changes.
Require appropriate customer identification or verification for consequential actions.
Approval workflow
When a customer accepts:
- Update quotation status.
- Record acceptance time.
- Record relevant approval evidence.
- Notify the business.
- Make the quotation eligible for invoice conversion.
Never allow an unauthenticated public visitor to edit a quotation.

Acceptance criteria:
- Quotations can be generated.
- Public links work securely.
- Customer approval works.
- Rejection and revision requests work.
- Approval history is recorded.
PHASE 7 — INVOICE GENERATOR
Goal: Build invoice creation and management.

Users should be able to:
- Create invoices manually.
- Convert approved quotations into invoices.
- Edit draft invoices.
- Download PDF invoices.
- Email invoices.
- Track invoice statuses.
- Record payments manually.
Invoice statuses
- Draft.
- Sent.
- Viewed.
- Partially Paid.
- Paid.
- Overdue.
- Cancelled.
Invoice information
- Invoice number.
- Business information.
- Customer information.
- Related quotation.
- Line items.
- Taxes.
- Discounts.
- Total.
- Amount paid.
- Balance due.
- Issue date.
- Due date.
- Payment instructions.
Do not automatically mark invoices as paid simply because a customer viewed or approved a quotation.

Acceptance criteria:
- Invoice creation works.
- Conversion from quotation works.
- PDF generation works.
- Payment records work.
- Invoice balances are calculated correctly.
PHASE 8 — CUSTOMER CRM
Goal: Build customer relationship management.

Create a Customers module.

Features:
- Add customer.
- Edit customer.
- Delete customer subject to document-retention rules.
- Search customers.
- Customer details page.
- Customer communication history.
- Customer estimates.
- Customer quotations.
- Customer invoices.
- Outstanding balances.
Customer information:
- Name.
- Business name (optional).
- Email.
- Phone.
- Address.
- Notes.
- Created date.
Support both individuals and business customers.

Acceptance criteria:
- Customer management works.
- Documents can be associated with customers.
- Customer history is visible.
- Data is isolated by business.
PHASE 9 — EMAIL, NOTIFICATIONS & AUTOMATION
Goal: Reduce repetitive business administration.

Integrate transactional email.

Email notifications should include:
- Estimate sent.
- Quotation sent.
- Quotation approved.
- Quotation rejected.
- Invoice sent.
- Payment recorded.
- Invoice reminder.
Automation features
Allow businesses to configure:
- Automatic quotation reminders.
- Invoice due reminders.
- Expiry notifications.
- Follow-up reminders.
Provide sensible default settings.

Respect email consent and applicable anti-spam laws.

Prevent duplicate notifications.

All automation must be traceable and manageable by the business owner.

Acceptance criteria:
- Emails are delivered through the configured provider.
- Email templates are customizable where appropriate.
- Notification history is recorded.
- Automated reminders can be enabled or disabled.
PHASE 10 — BUSINESS DASHBOARD & ANALYTICS
Goal: Give business owners an overview of their operations.

Create a professional dashboard.
Dashboard metrics
- Total estimates.
- Total quotations.
- Approved quotations.
- Rejected quotations.
- Total invoices.
- Paid invoices.
- Outstanding invoices.
- Estimated revenue.
- Collected revenue.
- Approval rate.
Dashboard charts
- Revenue over time.
- Estimates created.
- Quotation approval trends.
- Invoice payment trends.
- Customer activity.
Provide date filters.

Make sure analytics use the current business's data only.

Clearly distinguish estimated revenue from actual collected revenue.

Acceptance criteria:
- Dashboard displays real database data.
- Metrics are correctly calculated.
- Charts respond to date filters.
- No fabricated statistics are shown.
PHASE 11 — SUBSCRIPTION & PAYMENT SYSTEM
Goal: Monetize the SaaS application.

Integrate Stripe.

The application must support recurring subscriptions.
Initial pricing structure
All prices should be configurable from the platform administration system.
FREE — $0/month
- Limited estimates.
- Basic quotations.
- Basic PDF exports.
- Limited customer records.
- AI usage allowance.
- Advertisements on eligible free-tier surfaces.
STARTER — $19/month
- More estimates.
- Customer management.
- Professional document templates.
- PDF downloads.
- Basic analytics.
PROFESSIONAL — $49/month
- AI estimate generation.
- More AI usage.
- Quotations and invoices.
- Email delivery.
- Advanced document customization.
- Business analytics.
BUSINESS — $99/month
- Higher usage limits.
- Multiple team members.
- Advanced reporting.
- Business branding.
- Automation.
- Priority support.
These are initial proposed prices, not fixed contractual values.
Stripe integration
Implement:
- Stripe Checkout.
- Subscription creation.
- Subscription upgrades.
- Subscription downgrades.
- Subscription cancellation.
- Billing portal.
- Webhook processing.
- Payment failure handling.
- Subscription status synchronization.
Never trust subscription status supplied by the frontend.

Verify webhook signatures and handle duplicate webhook events safely.
Feature limits
Build a centralized subscription entitlement system.

Do not hardcode plan restrictions throughout the application.

Examples:
- Monthly estimate limit.
- AI generation limit.
- Customer limit.
- Team member limit.
- Document customization.
- Automation access.
Provide clear upgrade prompts when a user reaches a limit.

Acceptance criteria:
- Users can subscribe.
- Subscription status updates correctly.
- Billing information is synchronized.
- Feature access follows subscription entitlements.
- Cancellation works.
PHASE 12 — ADVERTISEMENT MONETIZATION
Goal: Create a second revenue stream without damaging the user experience.

Advertising is a secondary monetization channel.

Subscription revenue remains the primary business model.
Advertising strategy
Initially display advertisements on:
- Eligible free-tier dashboard surfaces.
- Public resources pages.
- Free educational tools.
- Selected public pages.
Do not place intrusive advertisements inside:
- PDF estimates.
- PDF quotations.
- PDF invoices.
- Customer approval pages.
- Payment pages.
- Subscription checkout.
- Sensitive business data screens.
Paid subscribers should have an advertisement-free experience.
Advertisement management
Build an advertisement management module.

Features:
- Enable/disable advertisements.
- Advertisement placement configuration.
- Free and paid user eligibility.
- Impression tracking.
- Click tracking.
- Revenue reporting when supported by the advertising provider.
Advertising provider
Keep advertising integration modular.

Google AdSense can be evaluated for eligible public website inventory, subject to its approval and policies.

Do not assume AdSense will approve authenticated dashboard inventory.

Do not display advertisements until the advertising account, privacy requirements, consent requirements, and provider policies are satisfied.

Acceptance criteria:
- Advertisements can be enabled or disabled.
- Paid subscribers do not see ads.
- Ads do not interfere with business workflows.
- Tracking respects privacy and consent requirements.
PHASE 13 — PLATFORM ADMINISTRATION
Goal: Give the platform owner full control over the SaaS business.

Create a secure administrator dashboard.

Only authorized administrators can access this area.
Admin dashboard
Display:
- Total registered users.
- Total businesses.
- Active subscriptions.
- Free accounts.
- Monthly recurring revenue.
- Subscription cancellations.
- AI usage.
- Platform activity.
- Advertisement performance.
User management
Administrators can:
- Search users.
- View account status.
- Suspend accounts when justified.
- Review subscription status.
- View business account information.
- Review usage limits.
Subscription management
Administrators can:
- View subscriptions.
- View plan distribution.
- Review payment status.
- Manage plan configuration.
AI management
Administrators can:
- Monitor AI usage.
- Review token consumption.
- Configure AI provider settings.
- Configure usage limits.
- Monitor API failures.
Never expose private API credentials in the admin frontend.
Industry management
Administrators can:
- Add industries.
- Edit industries.
- Disable industries.
- Configure industry templates.
System monitoring
Provide audit logs and error monitoring.

Every sensitive administrative action must be recorded.

Acceptance criteria:
- Admin access is securely restricted.
- Dashboard uses real data.
- User and subscription management works.
- Sensitive actions are logged.
PHASE 14 — SECURITY, TESTING & PRODUCTION READINESS
Goal: Prepare the platform for real customers.
Security
Implement:
- Database row-level security.
- Secure authentication.
- Authorization checks.
- Server-side API validation.
- Input sanitization.
- Rate limiting.
- Secure file uploads.
- File access restrictions.
- API key protection.
- Webhook verification.
- Audit logging.
- Secure public document links.
Testing
Test:
- Registration.
- Login.
- Password recovery.
- Business onboarding.
- Tenant isolation.
- Pricing calculations.
- AI generation.
- Estimate creation.
- PDF generation.
- Quotation approval.
- Invoice conversion.
- Email delivery.
- Subscription payments.
- Plan restrictions.
- Mobile responsiveness.
- Admin permissions.
Financial accuracy
All financial calculations must be performed by trusted application code.

Test:
- Decimal precision.
- Discounts.
- Multiple tax rates.
- Tax-inclusive and tax-exclusive pricing where supported.
- Rounding.
- Partial payments.
- Currency formatting.
Production readiness
Before launch:
- Configure production environment variables.
- Configure domain and SSL.
- Configure database backups.
- Configure monitoring.
- Configure error reporting.
- Configure privacy policy.
- Configure terms of service.
- Configure support contact.
- Verify payment webhooks.
- Run end-to-end tests.
Do not launch with mock payments, fake AI responses, or placeholder customer records.
7. CORE DATABASE ARCHITECTURE
Design a normalized relational database.

The following is the proposed logical database structure.
User and business
- profiles
- businesses
- business_members
- business_settings
- industries
Products and services
- service_categories
- products_services
- pricing_rules
Customers
- customers
- customer_notes
- customer_communications
Estimates
- estimates
- estimate_items
- estimate_history
Quotations
- quotations
- quotation_items
- quotation_approvals
- quotation_history
Invoices
- invoices
- invoice_items
- invoice_payments
- invoice_history
AI
- ai_generation_history
- ai_usage_records
- ai_provider_settings
Subscription
- subscription_plans
- subscriptions
- subscription_usage
- stripe_customers
- stripe_webhook_events
Platform administration
- admin_users
- audit_logs
- platform_settings
- advertisements
- advertisement_events
Every business-owned record must include a business_id where appropriate.

Establish foreign keys and indexes.

Enforce tenant isolation at the database level.

Use immutable historical document snapshots where required so that previous financial documents remain accurate.
8. AI BEHAVIOUR & BUSINESS RULES
The AI assistant must behave as a professional estimating assistant.

It must understand different industries and different pricing methods.

It should be able to interpret natural language descriptions and convert them into structured estimates.

Examples:
Construction
"I need to install 800 square feet of flooring. Labour is $3 per square foot and materials cost $2,000."
Cleaning
"Clean a three-bedroom, two-bathroom house. It should take approximately five hours. Our rate is $45 per hour."
Landscaping
"Install a new lawn on a 1,000-square-foot property. Include labour, soil, and grass."
Consulting
"Prepare a consulting proposal for 20 hours at $100 per hour."
Photography
"Create a wedding photography quotation with eight hours of coverage and a $1,500 package."

The AI should:
- Understand the project.
- Identify relevant line items.
- Use available business pricing.
- Identify missing prices.
- Identify missing quantities.
- Calculate suggested values only when supported by provided inputs.
- Explain assumptions.
- Generate professional descriptions.
- Return validated structured data.
The AI must not:
- Invent business credentials.
- Invent customer information.
- Invent prices and present them as confirmed.
- Change saved business pricing without permission.
- Automatically send documents.
- Automatically approve quotations.
- Override user-entered values silently.
9. DESIGN SYSTEM & USER EXPERIENCE
Create a premium SaaS design.

The product should feel like a professional business tool rather than a generic AI-generated website.
Design requirements
- Modern dashboard layout.
- Collapsible sidebar.
- Responsive navigation.
- Consistent typography.
- Professional forms.
- Clear data tables.
- Attractive empty states.
- Consistent status badges.
- Accessible colour contrast.
- Clear confirmation dialogs.
- Loading states.
- Error states.
- Toast notifications.
Dashboard navigation
Suggested sidebar:
OVERVIEW
  Dashboard

WORKSPACE
  AI Estimate Generator
  Estimates
  Quotations
  Invoices
  Customers
  Products & Services

BUSINESS
  Pricing
  Templates
  Analytics
  Team

ACCOUNT
  Subscription
  Settings
  Help & Support
The dashboard should make the most important action obvious:

Create New Estimate
10. NON-FUNCTIONAL REQUIREMENTS
The application must:
- Load efficiently.
- Be responsive.
- Be accessible.
- Be SEO-friendly on public pages.
- Support multiple currencies.
- Support multiple countries.
- Support multiple industries.
- Support multiple businesses per user where appropriate.
- Be secure.
- Be maintainable.
- Be scalable.
- Support future integrations.
Do not build unnecessary microservices for the initial MVP.

Prefer a modular monolith with clear separation between application modules.

Do not implement native Android or iOS applications as part of the initial MVP. Build a responsive web application with a mobile-friendly experience first.
11. DEVELOPMENT PRIORITIES
Development must follow this order.
MVP — Required for first commercial launch
1. Project foundation.
2. Public website.
3. Authentication.
4. Business onboarding.
5. Multi-tenant database.
6. Industry selection.
7. Products and services.
8. Pricing engine.
9. AI estimate generation.
10. Estimate management.
11. PDF generation.
12. Quotation generation.
13. Customer approval.
14. Basic invoice generation.
15. Customer management.
16. Subscription integration.
17. Security and testing.
V1 — Commercial expansion
1. Email automation.
2. Invoice payment tracking.
3. Business analytics.
4. Team management.
5. Document customization.
6. Advanced AI assistance.
7. Industry-specific templates.
8. Advertisement management.
V2 — Advanced platform
1. Advanced business automation.
2. Accounting integrations.
3. Payment collection integrations.
4. Advanced analytics.
5. AI project cost analysis.
6. Additional industry-specific modules.
7. Mobile application development.
8. API access for external integrations.
9. Partner and affiliate marketplace.
Do not allow V1 or V2 features to delay the first commercial MVP.
12. PHASE COMPLETION PROTOCOL
At the end of every phase, provide a development report.

The report must contain:
1. Phase completed.
2. Features implemented.
3. Files created.
4. Files modified.
5. Database changes.
6. API integrations.
7. Tests performed.
8. Test results.
9. Known issues.
10. Required external configuration.
11. Remaining tasks.
Update:

docs/development-progress.md

Maintain a clear record of completed and pending work.
Important rules
- Do not claim a feature is complete unless it works.
- Do not skip tests.
- Do not silently change the architecture.
- Do not remove previously working features without approval.
- Do not create unnecessary duplicate components.
- Do not leave broken links or nonfunctional buttons.
- Do not hardcode customer or business information.
- Do not put secrets in source code.
- Do not move to the next phase when critical acceptance criteria fail.
If a requirement is ambiguous, identify the ambiguity and propose a sensible implementation before making a major architectural decision.
13. FIRST DEVELOPMENT TASK
Start with PHASE 0 only.

Your first task is to:
1. Inspect the current project directory.
2. Check whether an existing application is already present.
3. Review existing dependencies and architecture.
4. Identify reusable components.
5. Identify existing backend configuration.
6. Compare the existing project with this knowledge document.
7. Create a development plan for Phase 0.
8. Implement the foundation.
9. Test the application.
10. Report the results.
Do not start Phase 1 until Phase 0 has been completed and verified.
FINAL PRODUCT VISION
The objective is to build a serious, independent SaaS software business.

We are not simply creating an AI tool that produces text.

We are creating a business platform that allows companies across different industries to:
- Estimate project costs.
- Generate professional quotations.
- Create invoices.
- Manage customers.
- Configure pricing.
- Automate administrative workflows.
- Monitor business performance.
The application must provide real value to paying customers.

The long-term goal is to build a scalable, profitable software product with recurring subscription revenue, a growing customer base, and the potential to become an independently sellable software business.

Build for real businesses. Build for real customers. Build for long-term scalability.