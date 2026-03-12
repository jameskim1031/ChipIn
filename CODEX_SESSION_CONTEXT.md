# ChipIn Codex Session Context

Updated: 2026-03-11 (end-of-day)

## Session Update (March 11, 2026)
- Main landing auth-nav behavior:
  - Added signed-in `Sign out` action on `/` (in addition to `Go to Gifts`).
- Built an isolated design playground route:
  - Added `/design-lab` with 3 concept explorations.
  - Iterated Concept C into preferred direction:
    - Neon/fun visual language (A-like palette),
    - left-column gifts toggle (`Upcoming gifts` / `Past gifts`),
    - persistent right-column `Events`,
    - image-aware card treatment using placeholder gradients.
- Applied Concept C direction to real product routes:
  - `/gifts` now uses the creative two-column board/timeline structure.
  - Left side: toggle-controlled gift list with timeline card UI + placeholder image blocks.
  - Right side: persistent events column with action affordance.
  - Header now greets authenticated user by name:
    - uses `user_metadata.full_name` first,
    - falls back to email local-part,
    - fallback `"there"` if unavailable.
- Refined `/gifts` interaction/layout polish:
  - Moved toggle row above bordered cards as requested.
  - Removed duplicate labels and removed wrapper border around toggle container.
  - Updated hero copy and reduced overly “corporate” tone across page.
- Extended the same playful visual language across onboarding + creation routes:
  - `/` landing hero copy and styling refreshed to match the new aesthetic.
  - `/login` and `/signup` updated with expressive headings/kickers and matching style treatment.
  - `/gifts/new` redesigned to match the new shell and visual system.
- `/gifts/new` UX cleanup:
  - Removed decorative bubble chips.
  - Improved field readability/contrast.
  - Tightened panel/form width to remove excessive empty space.
  - Added non-functional image upload input (`accept="image/*"`) with “preview-only” helper note.
- Build status:
  - Frontend build passes after all styling/layout updates (`cd web && npm run build`).

## Current UI Direction (Active)
- Product visual direction is now intentionally playful/creative:
  - high-energy neon accents,
  - sticker-like button shapes,
  - mixed dashed/glass card textures,
  - expressive hero typography,
  - timeline/event board framing for gift management.

## Session Update (March 9, 2026)
- Split onboarding into separate routes:
  - `/` = marketing landing page
  - `/login` = login flow (email -> continue -> password)
  - `/signup` = signup wizard
- Reworked landing page into a full-screen metallic dark theme:
  - Navbar with logo on left, `Log in` + `Sign up` on right
  - Hero CTA: `Start a group gift now` (routes to `/login`)
  - Updated messaging:
    - `Group gifts, made easy and memorable`
    - `One gift. One link. Everyone chips in.`
- Signup flow improved:
  - True wizard behavior:
    - Step 1: email only
    - Step 2: password only
    - Step 3: name + DOB + consent only
  - Back arrow on signup now goes to previous step (not landing)
  - Post-signup success state added:
    - `Check your email` confirmation screen
    - masked email display
    - resend verification email action
    - back-to-login action
- Login/signup action spacing improved:
  - Added semantic + visual separation (`or`) between primary and secondary actions.
- Build status:
  - Frontend build passes after all onboarding/landing changes (`npm run build`).
- Local auth confirmation note:
  - In local Supabase config, `auth.email.enable_confirmations = false`, so local signup auto-confirms by default.
  - To test verification-link flow locally, set it to `true` and use Inbucket (`http://127.0.0.1:54324`).

## Quick Resume Prompt (Copy/Paste)
```text
Project: ChipIn (Express backend + Next frontend + Supabase)
Date context: March 7, 2026

Current status:
- Staging backend is live on Railway: https://chipin-api-staging.up.railway.app
- Staging frontend is live on Vercel
- Supabase auth with bearer tokens is implemented end-to-end
- Resend send + webhook ingestion + email telemetry tables are implemented
- Stripe webhook delivery/payment status updates verified (paid transitions confirmed)
- Security hardening changes were implemented (new RLS + grant tightening + test-route gating)

Current branch/worktree:
- Current branch may vary (worked across `authentication`, `security_hardening`, and `main` during this session)
- Check `git status` first before making assumptions

When you start:
1) Read CODEX_SESSION_CONTEXT.md fully
2) Review git status and recent commits
3) Confirm auth flow + route protection + migration state
4) Propose next steps before editing files

Priority next tasks:
- Ensure hardening migrations are applied to the intended hosted project(s)
- Keep release notes/validation evidence with timestamp + key IDs
- Optional follow-up: investigate remaining `npm audit` high severity item in `web/`
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
  - `POST /api/test/send-checkout-link` is now gated to `NODE_ENV=development`.

## Database / Migration Notes
- Important migrations:
  - `20260224034449_auth_profile_and_rls.sql`
  - `20260224123000_add_email_delivery_tables.sql`
  - `20260307130000_add_rls_for_gift_related_tables.sql`
  - `20260307143000_harden_table_grants.sql`
- RLS currently enabled for:
  - `public.user_profile`
  - `public.gift`
- Risk to address:
  - Legacy broad grants were tightened via migration, but ensure this was applied to each hosted environment.

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
1. Verify deployment state:
   - Confirm both new hardening migrations are applied on hosted environments.
2. Ops hygiene:
   - Record/retain validation evidence (timestamps + Stripe/session IDs + DB confirmation).
3. Optional follow-up:
   - Investigate remaining `npm audit` high severity item in `web/`.

## Repo State Reminder
- Active branch can differ from prior context; check with `git branch --show-current`.
- This context file should be re-read at session start.
