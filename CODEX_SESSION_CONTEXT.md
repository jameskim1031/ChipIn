# ChipIn Codex Session Context

Updated: 2026-03-07

## Quick Resume Prompt (Copy/Paste)
```text
Project: ChipIn (Express backend + Next frontend + Supabase)
Date context: March 7, 2026

Current status:
- Staging backend is live on Railway: https://chipin-api-staging.up.railway.app
- Staging frontend is live on Vercel
- Supabase auth with bearer tokens is implemented end-to-end
- Resend send + webhook ingestion + email telemetry tables are implemented

Current branch/worktree:
- Branch: authentication
- Local uncommitted auth/frontend/backend changes exist

When you start:
1) Read CODEX_SESSION_CONTEXT.md fully
2) Review git status and recent commits
3) Confirm auth flow + route protection + migration state
4) Propose next steps before editing files

Priority next tasks:
- RLS/grant hardening for invitee/session/email tables
- Decide policy for public test endpoint /api/test/send-checkout-link
- Continue staging validation and release readiness checks
```

## Codex Collaboration Rules (Approval-First)
- Do not modify any file until I explicitly approve the specific change.
- Before each edit, show:
  - files to change
  - a short summary of exact changes
  - why the change is needed
- Before each edit, show the exact patch/diff content that will be applied.
- Wait for my approval every time before applying edits.
- After edits, summarize exactly what changed and what commands/tests were run.
- If additional edits are needed, ask for approval again before making them.

## Project Snapshot
- Monorepo:
  - Backend: Express + TypeScript (`/src`) on port `3001` locally
  - Frontend: Next.js (`/web`) on port `3000` locally
  - DB/Migrations: Supabase (`/supabase`)
- Live staging:
  - Backend (Railway): `https://chipin-api-staging.up.railway.app`
  - Frontend (Vercel): deployed (staging web is live)

## Current Functional State
- Bearer-token auth is implemented end-to-end.
  - Frontend signs in/up/out with Supabase Auth.
  - Frontend sends `Authorization: Bearer <access_token>` on protected API calls.
  - Backend verifies token via Supabase and attaches `req.authUser`.
- Gift flows implemented:
  - Create gift, list gifts, gift detail, invitation link generation.
  - Join flow (`/join/:token`) supports RSVP yes/no.
  - Lock-and-send:
    - Locks split
    - Creates checkout sessions
    - Reuses existing unpaid session (no duplicate email)
- Email flow implemented:
  - Sends via Resend.
  - Logs `email_send_attempt`.
  - Receives Resend webhooks at `/api/email/resend/webhook`.
  - Logs `email_event` and suppression records.

## Key Backend Auth/Route Notes
- Protected routes use `requireAuth`:
  - `/api/test/gifts*` and lock/send path are auth-protected.
- Public routes:
  - Join endpoints are public by design.
  - `POST /api/test/send-checkout-link` is still unauthenticated (test endpoint).

## Database / Migration Notes
- Important migrations:
  - `20260224034449_auth_profile_and_rls.sql`
  - `20260224123000_add_email_delivery_tables.sql`
- RLS currently enabled for:
  - `public.user_profile`
  - `public.gift`
- Risk to address:
  - Legacy schema migration grants broad privileges (`anon`/`authenticated`) on several tables.
  - `gift_invitee`, `stripe_checkout_session`, and email telemetry tables need hardening review.

## Frontend Integration Notes
- Next rewrite:
  - `/backend/:path*` -> `${API_BASE_URL}/api/test/:path*`
- Frontend auth helper:
  - `web/lib/authed-fetch.ts` injects bearer token from Supabase session.

## Environment Notes
- Backend env includes:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`
  - `STRIPE_SECRET_KEY`
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - `RESEND_WEBHOOK_SECRET`
  - `APP_BASE_URL`
- Frontend env includes:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `API_BASE_URL`

## Stripe Webhook Setup Notes (Important)
- `stripe listen --forward-to localhost:3001/api/stripe/webhook` is local-only.
  - It does not affect Railway/Vercel.
  - In deployed environments, Stripe must call Railway directly.
- For staging, use Stripe test mode in the correct account/workbench (ChipIn sandbox).
  - Expected pairing:
    - `STRIPE_SECRET_KEY=sk_test_...`
    - `STRIPE_WEBHOOK_SECRET=whsec_...` from that same test webhook endpoint
- Create Stripe webhook destination:
  1. Developers -> Webhooks -> Add destination
  2. Destination type: Webhook endpoint
  3. Scope: `Your account` (not connected accounts)
  4. URL: `https://chipin-api-staging.up.railway.app/api/stripe/webhook`
  5. Event: `checkout.session.completed` (required)
  6. Copy signing secret (`whsec_...`) into Railway `STRIPE_WEBHOOK_SECRET`
  7. Redeploy/restart backend
- Suggested naming:
  - Staging: `chipin-staging-railway-stripe-webhook`
  - Prod: `chipin-prod-railway-stripe-webhook`
- Verification after setup:
  1. Complete a fresh test checkout
  2. Confirm Stripe delivery is `2xx`
  3. Confirm DB rows update:
    - `stripe_checkout_session.status -> paid`
    - `gift_invitee.status -> paid`

## Stripe Mode Clarification
- Dashboard view can show Live while your app is still using Test keys.
- Keep all Stripe pieces aligned by environment:
  - Staging: test keys + test webhook endpoint/secret
  - Prod: live keys + live webhook endpoint/secret

## Deployment/Release Flow (Current Practice)
1. Build locally (backend + frontend).
2. If schema changed, add migration and test locally.
3. PR to staging branch.
4. Backend deploys to Railway staging.
5. Run Supabase migrations against linked hosted project.
6. Verify:
   - `/health`
   - end-to-end gift -> lock/send
   - webhook delivery
   - `email_send_attempt` + `email_event` rows
7. Promote staging -> prod after signoff.

## Immediate Next Priorities
1. Security hardening:
   - Add/verify RLS policies for `gift_invitee`, `gift_invitation_link`, `stripe_checkout_session`.
   - Restrict table grants for `anon` and `authenticated`.
   - Re-check email table access model.
2. Decide on test endpoint policy:
   - Protect, gate by environment, or remove `/api/test/send-checkout-link` in staging/prod.
3. Auth UX polish:
   - Session persistence edge cases and protected-route redirects.

## Repo State Reminder
- Active branch observed: `authentication`
- There are local uncommitted changes (auth-related and frontend pages).
