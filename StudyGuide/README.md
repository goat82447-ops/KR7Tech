# StudyGuide

Visual study guides for Azure and CI/CD, C# and .NET, AI, CRM, system design,
and DSA. The static guides have no build step. The company interview question
bank uses Vercel Functions and Supabase for authenticated, server-authorized
question delivery and payment-backed access.

## Protected company interview question bank

The page previews five questions per topic. The remaining questions are stored
in Supabase, not in the HTML or browser JavaScript:

- L1, L2, and L3 each unlock questions tagged with that level for ₹500.
- Pro unlocks all question levels for ₹1,500.
- Razorpay and Stripe charge INR. PayPal prices must be explicitly configured
  in USD; no currency conversion is assumed.
- Access changes only after the backend validates a provider-signed webhook
  and matches the confirmed amount, currency, user, tier, and pending purchase.
- Administrators can grant or revoke a user's tier in the question page.

The deployed Vercel application protects the guide pages listed in
`vercel.json`. Direct requests are checked for a server-created HttpOnly session
cookie and an active Pro entitlement before the static HTML is returned.
Browser copy blocking reduces copying but does not replace server authorization
or absolute source secrecy. The Company Interview page also uses server-side
question delivery so answers never ship as premium browser source.

### 1. Create and configure Supabase

1. Create a Supabase project and enable email/password authentication.
2. In the Supabase SQL Editor, run `supabase/schema.sql`, then
   `supabase/seed.sql`. The seed is idempotent and defines five public preview
   questions per topic.
3. Copy the project URL, anon key, and service-role key to Vercel environment
   variables. The service-role key is server-only and must never be added to
   HTML, JavaScript, or a `NEXT_PUBLIC_` variable.
4. Create an initial admin account and set its UUID in `ADMIN_USER_IDS`, or
   grant admin status in the SQL Editor:

   ```sql
   update public.profiles
   set is_admin = true
   where id = 'YOUR-SUPABASE-AUTH-USER-UUID';
   ```

The schema enables RLS and grants table access only to Supabase's server-side
`service_role`. New Supabase Auth users receive a profile row through a
database trigger.

### 2. Configure Vercel

Import this directory as the Vercel project root. Use the **Other** framework
preset, no build command, and `.` as the output directory. Vercel automatically
deploys the functions in `api/`. `.vercelignore` excludes the schema, question
seed, and setup documentation from the deployment.

Set these Vercel environment variables:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public Supabase Auth key, used by server and browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only database access |
| `PUBLIC_APP_URL` | Canonical HTTPS URL of this Vercel deployment |
| `ADMIN_USER_IDS` | Optional comma-separated Supabase user UUIDs with admin access |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay checkout credentials |
| `RAZORPAY_WEBHOOK_SECRET` | Secret configured for the Razorpay webhook |
| `STRIPE_SECRET_KEY` | Stripe checkout credential |
| `STRIPE_WEBHOOK_SECRET` | Stripe endpoint signing secret |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | PayPal API credentials |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook ID used for signature verification |
| `PAYPAL_L1_USD`, `PAYPAL_L2_USD`, `PAYPAL_L3_USD`, `PAYPAL_PRO_USD` | Explicit PayPal prices, each formatted like `5.00` |
| `PAYPAL_BASE_URL` | Optional; defaults to PayPal live API. Use the sandbox URL for sandbox credentials. |

Checkout is hidden until the corresponding checkout credentials **and**
webhook verification settings are configured. PayPal is enabled only when all
four explicit USD prices are set.

### 3. Register payment webhooks

Register these HTTPS endpoints using the same credentials/environment as the
deployed checkout:

- Razorpay: `/api/webhooks/razorpay`, subscribe to `payment_link.paid`.
- Stripe: `/api/webhooks/stripe`, subscribe to
  `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- PayPal: `/api/webhooks/paypal`, subscribe to `PAYMENT.CAPTURE.COMPLETED`.

Copy each provider's webhook signing secret or webhook ID to the matching
Vercel variable. The PayPal return endpoint captures the user's own pending
order; only the signed `PAYMENT.CAPTURE.COMPLETED` webhook grants access.
Configure Supabase Auth's site URL and allowed redirect URLs to include the
Vercel domain.

### 4. Verify before launch

- Test preview access, sign-up/sign-in, and each individual L-tier and Pro
  entitlement using provider sandbox/test modes.
- Confirm wrong amounts/currencies, invalid signatures, mismatched purchase
  metadata, and duplicate webhook deliveries do not grant extra access.
- Test administrator grant/revoke and re-purchase after revocation.
- Confirm `Company-Interviews.html` and `company-interviews.js` contain no
  premium answers. Never use GitHub Pages or another static-only host for this
  protected question endpoint; static hosting cannot execute the API.

## Static study guides and complete app protection

Import this directory into Vercel so that Functions, rewrites, and HTTP cookies
can protect guide delivery. The protected guide routes require both:

1. a Supabase session cookie created by `/api/session`, and
2. an active `Pro` entitlement in Supabase.

Users without access are redirected to the membership page. Deploying the HTML
directory directly to GitHub Pages bypasses these checks, so GitHub Pages is
not a supported paid-content host. DevTools and browser-source restrictions can
only deter casual copying; the server boundary prevents unauthorized delivery
and remains the authoritative copy-protection mechanism.

The company question bank contains representative practice prompts, not
official or guaranteed interview questions.
