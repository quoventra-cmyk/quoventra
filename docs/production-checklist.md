# Quoventra — Production Readiness Checklist

## 1. Environment Variables (`.env.local` / Vercel Project Settings)
- **App:** `NEXT_PUBLIC_APP_NAME="Quoventra"`, `NEXT_PUBLIC_APP_URL="https://yourdomain.com"`
- **InsForge:** `NEXT_PUBLIC_INSFORGE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY`, `INSFORGE_SERVICE_ROLE_KEY` (server-only)
- **AI (OpenRouter default):** `AI_PROVIDER="openrouter"`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL="openai/gpt-4o-mini"` (or `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`)
- **Stripe:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Email (Resend):** `RESEND_API_KEY`, `EMAIL_FROM="Quoventra <noreply@yourdomain.com>"`
- **Analytics (Optional):** `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

## 2. Database & Security
- Verify all `public` tables have `rowsecurity = true` and tenant isolation policies (`business_id`).
- Ensure `public.admin_users` contains at least one authorized `super_admin` user ID:
  ```sql
  INSERT INTO public.admin_users (user_id, role)
  VALUES ('<auth-user-uuid>', 'super_admin');
  ```
- Enable automated daily database backups in InsForge (`npx -y @insforge/cli backups create`).
- Confirm Stripe webhook endpoint `https://yourdomain.com/api/webhooks/stripe` is registered in Stripe Dashboard.
- Verify custom sending domain SPF/DKIM records in Resend.

## 3. Domain, SSL & Compliance
- Configure custom domain and automatic HTTPS/SSL on Vercel.
- Review `/privacy` and `/terms` legal copy with counsel and update contact emails (`support@quoventra.com`, `privacy@quoventra.com`, `legal@quoventra.com`).
- Keep `ads_enabled: false` in `platform_settings` until ad provider approval and consent banners are verified.

