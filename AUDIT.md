# J&F Auto — Website Audit (Post-AWS-Migration)

**Scope:** Full-stack audit after migration to AWS-native architecture (Cognito + DynamoDB + S3 + Amplify Hosting). Supersedes earlier Supabase-era audits — those findings are either resolved by the migration or no longer apply.

**Stack observed:** Next.js 15.5.15 App Router (standalone), React 19, `aws-jwt-verify` for Cognito ID tokens, DynamoDB Document Client, S3 presigned PUT, Amplify Hosting.

**Legend:** [BLOCK] = must fix before shipping | [HIGH] = ship-blocker at any real traffic | [MED] = should fix soon | [LOW] = polish

---

## [BLOCK] Issues

### B1 — `getCarBySlug` may return `null` for valid slugs — **FIXED**
[lib/data.ts:54](lib/data.ts:54)

```ts
new ScanCommand({
  TableName: awsEnv.carsTable(),
  FilterExpression: 'slug = :slug',
  ExpressionAttributeValues: { ':slug': slug },
  Limit: 1,
})
```

In DynamoDB, `Limit` is applied **before** `FilterExpression`. This scans 1 item then filters — if the first scanned item isn't the requested slug, the result is empty and the page 404s. This will randomly break car detail pages as the table grows past one item.

**Fix:** drop `Limit: 1` (let it scan and filter, take first), or — preferred — add a GSI on `slug` and use `QueryCommand`.

### B2 — API route uses `redirect()` instead of returning 401 — **FIXED**
[app/api/admin/upload-url/route.ts:9](app/api/admin/upload-url/route.ts:9)

`requireAdminOrStaff()` calls `redirect('/admin/login')` on auth failure. In a Route Handler, this returns a 307 with an HTML location, not JSON — the `fetch` in [components/admin/image-upload.tsx](components/admin/image-upload.tsx) will receive an HTML body and the JSON parse will throw a confusing error, masking the real cause (expired session). Image upload silently breaks instead of prompting re-auth.

**Fix:** in the route handler, call `getSession()` directly and `return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` instead of using the redirecting helper.

### B3 — Refresh token discarded; sessions die at 1h
[lib/actions/auth.ts:23](lib/actions/auth.ts:23), [lib/aws/cognito.ts:79](lib/aws/cognito.ts:79)

`loginWithPassword` returns `refreshToken`, but `loginAction` only stores `idToken` in the cookie. Cognito ID tokens default to 60 minutes. After expiry the JWKS verifier rejects the token, `getSession()` returns `null`, and middleware redirects mid-task — admin loses unsaved form work.

**Fix:** either (a) issue a long-lived session cookie (signed/encrypted) plus a separate refresh-token cookie and refresh on demand, or (b) raise the Cognito ID token expiry to match the cookie maxAge in the user pool client config (and document that operationally). Option (a) is preferred because token rotation also supports forced sign-out.

---

## [HIGH] Issues

### H1 — No rate limiting on public lead form
[lib/actions/leads.ts:13](lib/actions/leads.ts:13)

`submitLeadAction` accepts unauthenticated POSTs and writes to DynamoDB. There is no IP throttling, no CAPTCHA, no honeypot, no per-email cap. A trivial bot fills the leads table — costs scale linearly with abuse, and the admin inbox becomes useless.

**Fix:** add a CAPTCHA (hCaptcha or Cloudflare Turnstile) on the public lead form, plus a server-side per-IP token bucket (e.g., a small DynamoDB table keyed on IP+minute, or AWS WAF rate-based rules in front of Amplify).

### H2 — No rate limiting on login; user enumeration via error leaks
[lib/actions/auth.ts:18](lib/actions/auth.ts:18)

```ts
return { error: err instanceof Error ? err.message : 'Login failed.' };
```

Cognito returns distinct errors for `UserNotFoundException` vs `NotAuthorizedException` — the catch passes the raw message to the client, letting attackers enumerate valid admin usernames. There is also no application-level brute-force throttle (Cognito has its own loose limits).

**Fix:** map all auth failures to a generic "Invalid email or password." message. Add an IP-based attempt counter (5 attempts / 15 min) before calling Cognito. Enable Cognito advanced security if available (paid tier).

### H3 — All reads use `Scan` with no pagination
[lib/data.ts:32](lib/data.ts:32), [lib/data.ts:44](lib/data.ts:44), [lib/data.ts:107](lib/data.ts:107)

`listPublishedCars`, `listAllCars`, and `listLeads` all do full-table scans and never honor `LastEvaluatedKey`. DynamoDB returns up to 1MB per page — past that, results are silently truncated. Cost also scales linearly with table size on every page render.

**Fix:** add GSIs (`status-updated_at-index` on cars, `created_at-index` on leads) and migrate to `QueryCommand`. For pages that genuinely need all rows, loop until `LastEvaluatedKey` is undefined. Cache `listPublishedCars` aggressively (Next `revalidate` or `unstable_cache` with tag-based invalidation from `saveCarAction`).

### H4 — No MFA challenge handling in login flow
[lib/aws/cognito.ts:69](lib/aws/cognito.ts:69)

The login path only handles the `NEW_PASSWORD_REQUIRED` challenge. If the user pool has MFA enabled (SMS or TOTP), `AdminInitiateAuth` returns a `SOFTWARE_TOKEN_MFA` / `SMS_MFA` challenge with no `AuthenticationResult`, and the code throws `"Login failed: no token returned"` — admins can't sign in.

**Fix:** detect the MFA challenge name, persist the `Session` token, render a code-entry screen, and call `AdminRespondToAuthChallenge` with the user's code. Until then, document that MFA must remain off in the user pool.

### H5 — `ADMIN_USER_PASSWORD_AUTH` requires app client without secret
[lib/aws/cognito.ts:60](lib/aws/cognito.ts:60)

`AdminInitiateAuth` is called without a `SECRET_HASH`. If the deployed Cognito app client is configured with a client secret (the default for "Confidential client" in the new console), every login fails with `"Client is configured with secret but secret was not received"`. There is no defense or message guiding the operator to fix it.

**Fix:** document loudly in the README that the app client must be created **without** a secret, OR add `SECRET_HASH` computation (HMAC-SHA256 of `username + clientId` with the secret) to the call and read the secret from `COGNITO_CLIENT_SECRET`.

---

## [MED] Issues

### M1 — Server trusts client-supplied `contentType` on presigned uploads
[lib/aws/s3.ts:22](lib/aws/s3.ts:22)

The route validates `contentType` is in the allowlist, then uses that exact value to sign the PUT. A malicious uploader (with admin/staff cred) can lie and upload arbitrary bytes labeled as `image/jpeg`. Risk is low (admin-gated), but the file then hits public S3 with `Cache-Control: immutable` for a year.

**Fix:** add server-side post-upload validation (Lambda triggered on `s3:ObjectCreated:*` that sniffs magic bytes and quarantines mismatches), or do upload-then-validate-then-publish via two-stage keys.

### M2 — `slug` uniqueness is not enforced
[lib/data.ts:68](lib/data.ts:68), [lib/actions/cars.ts:18](lib/actions/cars.ts:18)

Two cars with the same generated slug both write happily. `getCarBySlug` will then return whichever one Scan finds first, with no indication to the admin that they collided. Especially likely with the slugify fallback when `make/model/year` repeats.

**Fix:** before `PutCommand`, query the slug GSI (see H3) and append a short random suffix on collision. Or use `ConditionExpression: 'attribute_not_exists(slug_lock)'` with a separate slug-lock table.

### M3 — Login error path swallows useful operator signals — **FIXED**
[lib/actions/auth.ts:18](lib/actions/auth.ts:18)

While client-facing messages should be generic (H2), the server should `console.error` the underlying Cognito error with code so CloudWatch shows what actually failed (misconfigured client, region mismatch, throttling). Currently the operator is blind.

**Fix:** `console.error('login failure', { code: err.name, message: err.message })` before returning the generic message.

### M4 — `coerceRole` silently downgrades to `readonly` — **FIXED**
[lib/aws/cognito.ts:32](lib/aws/cognito.ts:32)

A user with no `custom:role` claim or a typo in the claim becomes `readonly`. They will sign in successfully and see a half-broken admin shell with no explanation. Failing closed (treat as no session) is safer and surfaces the misconfiguration immediately.

**Fix:** `verifySessionToken` should `return null` when the role claim is missing/invalid rather than defaulting.

### M5 — `submitLeadAction` does not bound message/phone length — **FIXED**
[lib/actions/leads.ts:23](lib/actions/leads.ts:23)

Name is capped at 200, but `message` (potentially huge), `phone`, and `preferred_datetime` (no parse validation) are written verbatim to DynamoDB. A 400KB message body is a single-write expense and bloats reads. `preferred_datetime` may be unparseable garbage.

**Fix:** clamp `message` to ~2000 chars, validate `phone` against a permissive regex, parse `preferred_datetime` with `new Date(...)` and reject `Number.isNaN(d.getTime())`.

### M6 — `unstable_noStore()` on every public page defeats caching
[app/cars/[slug]/page.tsx:19](app/cars/[slug]/page.tsx:19)

Every car detail page hits Scan-via-`getCarBySlug` on every request. Combined with H1/H3, this is the most expensive path in the system. Inventory listings likely have the same issue.

**Fix:** remove `unstable_noStore()` and switch to `revalidate = 60` (or tag-based with `revalidateTag` called from `saveCarAction`). Most car-detail content changes minutes-scale at most.

### M7 — No CSP, no HSTS
[next.config.ts](next.config.ts)

Headers configured: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Missing: `Content-Security-Policy` and `Strict-Transport-Security`. Modern security baselines expect both.

**Fix:** add HSTS (`max-age=63072000; includeSubDomains; preload` once you're confident), and a starter CSP — `default-src 'self'; img-src 'self' https://<s3-or-cloudfront-domain> data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'`.

### M8 — `updateProfileAction` assumes Cognito username == email
[lib/actions/auth.ts:44](lib/actions/auth.ts:44)

`updateUserFullName(session.email, ...)` calls `AdminUpdateUserAttributes` with `Username: email`. This works only when the user pool is configured with email as the alias/username. If usernames are UUIDs (Cognito's other default), this throws "User does not exist". Should pass `session.sub` and configure the pool so `AdminUpdateUserAttributes` accepts sub. Also no length/sanity validation on `fullName`.

**Fix:** use `session.sub` consistently as the Cognito username, and document the user pool's "Sign-in alias" requirement. Cap `fullName` at 100 chars.

---

## [LOW] Issues

### L1 — Two registered MCP integrations still reference Supabase
[.mcp.json](.mcp.json)

Supabase MCP server is still wired up in the project's MCP config even though Supabase is fully removed from the runtime. Harmless but misleading; remove if no longer needed.

### L2 — `metadataBase` only set when `NEXT_PUBLIC_SITE_URL` is present
[app/layout.tsx](app/layout.tsx)

OG/twitter image URLs become relative when the env var is missing in non-prod, which some scrapers reject. Falling back to `https://localhost` or the Amplify default URL would be safer than silent absence.

### L3 — `requireRole` redirects from server actions
[lib/auth.ts:25](lib/auth.ts:25)

When a server action calls `requireRole` and fails, the redirect bubbles out of the action call — the form submission "succeeds" but the page navigates. Surprising UX, especially for `updateLeadStatusAction`. Throwing an error and letting the action return `{ error: 'Forbidden' }` would be cleaner.

### L4 — `batchGetCarsByIds` ignores `UnprocessedKeys`
[lib/data.ts:87](lib/data.ts:87)

DynamoDB `BatchGetItem` may return some keys as unprocessed under throttling. The current code drops them silently — the leads page will show "—" for cars that actually exist.

**Fix:** loop on `result.UnprocessedKeys` with exponential backoff until empty.

### L5 — `presignUpload` allows arbitrary `carId` strings
[lib/aws/s3.ts:30](lib/aws/s3.ts:30)

The carId becomes part of the S3 key with no sanitization. An admin passing `../foo` produces a non-traversal-but-confusing key. Low impact, admin-gated, but worth a regex check (`/^[a-zA-Z0-9-]{1,64}$/`).

### L6 — `.gitignore` drift, modified `.claude/ralph-loop.local.md` uncommitted
[.gitignore](.gitignore)

Working tree has uncommitted edits to `.claude/ralph-loop.local.md` and `.gitignore`. Verify these aren't accidental before the next push.

---

## Resolved by migration (no longer applicable)

The pre-migration audit's 97 findings against Supabase are obsolete. Notable resolutions:

- **B1 (Supabase profiles RLS)** — profiles table eliminated; role lives in Cognito `custom:role` JWT claim verified server-side.
- **B2 (`.or()` injection)** — replaced with in-memory filtering on Scan results.
- **B3 (tutorial cruft)** — removed.
- **B4 (dual auth flows / public signup)** — `/auth/*` deleted; only Cognito `AdminInitiateAuth` admin login remains.
- **B5 (open redirect in `auth/confirm`)** — route deleted.
- **H1 (`unstable_noStore` everywhere)** — partially resolved; only the car detail page still uses it (see M6).

---

## Operational checklist (deployment must satisfy)

These are not code bugs but deployment-time requirements implied by the codebase. Capture them in runbooks.

- Cognito app client created **without** a client secret, with `ADMIN_USER_PASSWORD_AUTH` enabled (H5).
- Cognito user pool has `custom:role` defined as a mutable string attribute (M4).
- Amplify compute IAM role: `dynamodb:{Get,Put,Update,Delete,Scan,BatchGet}Item` on the three tables, `s3:PutObject` on `cars/*`, `cognito-idp:{AdminInitiateAuth,AdminRespondToAuthChallenge,AdminUpdateUserAttributes}` on the user pool.
- S3 bucket: public-read or fronted by CloudFront; CORS allows `PUT` from the Amplify domain; lifecycle rule on `cars/temp/*` (since uploads land there before a car has an id).
- DynamoDB tables: `id` (string) partition key on all three; **add GSI on `slug` for cars** before launch (B1 / H3).
- WAF rate-based rule attached to the Amplify distribution (H1, H2).

---

## Second-pass additions

### H6 — Home page and inventory both Scan DynamoDB on every request
[app/page.tsx:13](app/page.tsx:13), [app/inventory/page.tsx:73](app/inventory/page.tsx:73)

Both public pages call `unstable_noStore()` and then `listPublishedCars()` (full Scan). Every landing page view = one DynamoDB Scan of the cars table. With concurrent crawlers, bots, and previews this becomes the dominant DynamoDB cost long before real traffic arrives, and homepage TTFB is bounded by the Scan round-trip.

**Fix:** replace `unstable_noStore()` with `export const revalidate = 60` (or tag-based invalidation triggered by `saveCarAction` / `deleteCarAction`). The inventory page's filters are applied in-memory from the already-fetched list, so caching upstream gives the whole page a free ride.

### M9 — Lead form trigger wraps children in a non-semantic `div`
[components/lead-form-modal.tsx:75](components/lead-form-modal.tsx:75)

```tsx
<div className="cursor-pointer" onClick={() => setIsOpen(true)}>
  {children}
</div>
```

When `children` is a `<Button>`, this creates a div-on-button click target: keyboard users can focus the inner Button but the outer div has no `role`, `tabIndex`, or key handler. Screen readers see an unlabeled click region. The modal also has no ESC-to-close handler and no focus trap.

**Fix:** use Radix Dialog (already a shadcn dependency) or at minimum change the wrapper to render a proper button, add `onKeyDown` for Escape, and focus-trap the dialog while open.

### M10 — Lead form surfaces raw server errors to end users
[components/lead-form-modal.tsx:61](components/lead-form-modal.tsx:61)

`setError(err instanceof Error ? err.message : ...)` shows the server action's thrown message verbatim. If DynamoDB throttles or the item is rejected, the public user sees `"ValidationException: ..."`. Prefer a generic "Something went wrong. Please try again." with the detail logged server-side.

### L7 — Modal lacks ESC-to-close and focus trap
[components/lead-form-modal.tsx:79](components/lead-form-modal.tsx:79)

Ties into M9. Pressing Escape or Tab'ing out of the modal does nothing. Radix Dialog handles both for free.

### L8 — `presignAndPut` PUT lacks explicit `Content-Length`
[components/admin/image-upload.tsx:39](components/admin/image-upload.tsx:39)

Modern browsers auto-set `content-length` for File bodies, so this works in practice. But the presigned URL was signed with the exact `ContentLength`, so if any proxy/extension strips or mutates it, the PUT returns a cryptic `Upload failed (403)`. Harmless until it isn't.

### L9 — Home page `featuredCars` sorted on every render instead of at query time
[app/page.tsx:15](app/page.tsx:15)

Trivial cost at current scale, but will compound with H3/H6. Once there's a `status-updated_at-index` GSI (see H3), the home page can query the top 6 directly.

---

## Blocker verification

- **B1** — confirmed by AWS docs: `Scan` applies `Limit` before `FilterExpression`. With `Limit: 1` the Scan reads one item, applies the filter, and returns zero results when the first scanned item isn't the requested slug. The only safe resolutions are removing `Limit` or switching to a `Query` on a slug GSI.
- **B2** — confirmed by reading [components/admin/image-upload.tsx:34](components/admin/image-upload.tsx:34): the client parses the response as JSON and throws on failure; a 307 redirect with an HTML body yields `err.error ?? 'Failed to presign upload'` where `err` came from a failed JSON parse — the user sees a misleading generic error instead of "sign in again."
- **B3** — confirmed: `loginAction` only persists `idToken`. No refresh flow exists anywhere in the repo; grep for `RefreshToken` returns only the line in [lib/aws/cognito.ts:79](lib/aws/cognito.ts:79) that returns it from `loginWithPassword`. Nothing consumes the return value's `refreshToken`.

---

## Third-pass additions: dead code & deps

Build health: `npm audit --production` reports **0 vulnerabilities** across 187 prod deps; `tsc --noEmit` is clean. The findings here are weight, not security.

### L10 — Unused UI primitives (never imported) — **FIXED**
[components/ui/skeleton.tsx](components/ui/skeleton.tsx), [components/ui/dropdown-menu.tsx](components/ui/dropdown-menu.tsx), [components/ui/separator.tsx](components/ui/separator.tsx)

Each of these files is referenced only by itself. The migration deleted `checkbox.tsx` for the same reason but missed three siblings. Delete them along with their unused `@radix-ui/react-dropdown-menu` and `@radix-ui/react-separator` runtime deps.

### L11 — `next-themes` declared but never used — **FIXED**
[package.json:27](package.json:27)

Grep finds zero `from 'next-themes'` imports. Leftover from the original Vercel/shadcn template. The site is dark-mode-only; remove the dep.

### L12 — Working tree drift unrelated to migration
[git status]

Uncommitted modifications to `.claude/ralph-loop.local.md` and `.gitignore` (the latter shows additions for `.ralph/` and `.worktrees/`). These are likely intentional infra config, but they predate this audit and should be either committed with a clear message or stashed before the next deployment.

### L14 — ESLint error in `next-env.d.ts` blocks `npm run lint` — **FIXED**
[next-env.d.ts](next-env.d.ts)

`@typescript-eslint/triple-slash-reference` fails on the Next.js 15 auto-generated types reference. CI running `npm run lint` will fail. Next 15 requires this triple-slash; the only fix is to add `next-env.d.ts` to the ESLint ignore list (in `eslint.config.*` or `.eslintignore`).

### L13 — `app/admin/cars/new/page.tsx` imports lucide `Car` icon as bare identifier — **FIXED**
[app/admin/cars/new/page.tsx:3](app/admin/cars/new/page.tsx:3)

`import { Car } from 'lucide-react'` shadows the type name `Car` from `@/lib/types` in any future code added to this file. Currently no conflict, but a footgun — alias the import (`Car as CarIcon`) as is done in [app/cars/[slug]/page.tsx:2](app/cars/[slug]/page.tsx:2).

---

## Suggested fix order

1. B1 — slug Scan bug (5-line fix, breaks production)
2. B2 — API 401 vs redirect (10-line fix, breaks uploads silently)
3. H5 — verify Cognito app-client secret config (deployment, not code)
4. H4 — MFA challenge handling OR document MFA must stay off
5. H1, H2 — WAF + CAPTCHA before any public launch
6. B3 — refresh token / session lifetime
7. H3 — GSIs and query migration (do once, before traffic grows)
8. M-series — batch as a hardening pass
