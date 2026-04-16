# J&F Auto — Website Audit

**Scope:** Full-stack audit of the `jandfauto` Next.js 15 + Supabase + Tailwind/shadcn app, with emphasis on the ongoing migration from Supabase+Vercel to AWS Amplify.

**Stack observed:** Next.js 15.5.15 (App Router), React 19.2.1, Supabase SSR (`@supabase/ssr`), Tailwind 3.4 + shadcn/ui, AWS Amplify Hosting.

**Legend:** [BLOCK] = must fix before shipping | [HIGH] = high impact | [MED] = medium | [LOW] = polish

---

## Status of prior findings (iterations 1 & 2)

| ID | Status | Notes |
|----|--------|-------|
| B1 | **OPEN** | Profiles RLS still has no `WITH CHECK` — privilege escalation possible |
| B2 | **OPEN** | `inventory/page.tsx:43` and `admin/cars/page.tsx:34` still interpolate raw search into `.or()` |
| B3 | **OPEN** | Tutorial cruft still present: `components/tutorial/`, `hero.tsx`, `deploy-button.tsx`, `env-var-warning.tsx`, `next-logo.tsx`, `supabase-logo.tsx`, `app/protected/*` |
| B4 | **OPEN** | Dual auth flows (`/auth/*` + `/admin/login`) both still live; public signup still enabled |
| B5 | **OPEN** | Open redirect in `app/auth/confirm/route.ts:10,21` — `next` param unvalidated |
| H1 | **OPEN** | `unstable_noStore()` on every public page; no caching |
| H2 | **OPEN** | No per-car `generateMetadata` |
| H3 | **OPEN** | No JSON-LD structured data |
| H4 | **OPEN** | No `sitemap.xml` or `robots.txt` |
| H5 | **OPEN** | Car slugs are UUIDs |
| H6 | **OPEN** | Nav duplicated across public pages (now consolidated into `PublicShell` component, but settings fetch duplicated per page) |
| H7 | **OPEN** | OG image is wrong aspect ratio |
| H8 | **OPEN** | Lead form modal uses `<div onClick>` instead of Radix Dialog — not accessible |
| H9 | **FIXED** | `@vercel/analytics` removed (this session) |
| H10 | **OPEN** | No rate limiting on public lead insert |
| M1-M16 | **OPEN** | All medium findings still present |
| L1-L14 | **OPEN** | All low findings still present |

---

## Iteration 3 — AWS Amplify migration context + extended audit

### Migration status

The Amplify deployment infra was fixed this session:
- Added `output: 'standalone'` to `next.config.ts` (required for Amplify SSR)
- Added `nvm install 20` / `nvm use 20` to `amplify.yml` preBuild
- Removed dead `@vercel/analytics` dependency
- Removed unused Amplify Gen 2 backend packages (`@aws-amplify/backend`, `aws-cdk-lib`, etc.) — saved 1,845 packages and eliminated 47 vulnerabilities

---

## [BLOCK] Blocking findings

### B1. Privilege escalation via `profiles` RLS (still open)
**File:** `supabase/migrations/001_initial_schema.sql:111-113`

No `WITH CHECK` clause on the profiles UPDATE policy. Any authenticated user can `UPDATE profiles SET role = 'admin' WHERE id = auth.uid()` from the browser console and gain full admin access to cars, leads, and settings.

**Fix:** Add `WITH CHECK` that prevents role self-promotion, or drop self-update entirely and route profile edits through a `SECURITY DEFINER` RPC.

---

### B2. Filter injection in inventory search (still open)
**Files:** `app/inventory/page.tsx:43`, `app/admin/cars/page.tsx:34`

Raw user input is interpolated into PostgREST `.or()` filter strings. The admin cars page has the **same vulnerability** — not just the public inventory page as previously noted.

```ts
query = query.or(`title.ilike.%${searchTerm}%,make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`);
```

**Fix:** Sanitize input by stripping PostgREST operators, or use `.textSearch()`.

---

### B3. Tutorial / starter-template cruft shipped to production (still open)
Files still present: `components/tutorial/*` (5 files), `components/hero.tsx`, `components/deploy-button.tsx`, `components/env-var-warning.tsx`, `components/next-logo.tsx`, `components/supabase-logo.tsx`, `app/protected/page.tsx`, `app/protected/layout.tsx`, `components/theme-switcher.tsx`, `components/auth-button.tsx`.

The `/protected` page dumps raw JWT claims JSON into the DOM.

---

### B4. Dual auth flows: `/auth/*` and `/admin/login` (still open)
Both still live. `/auth/sign-up` allows public account creation. Combined with B1, this is a full admin takeover chain: sign up -> self-promote to admin -> full access.

**Critical migration note:** When migrating to Amplify auth (Cognito), delete the entire `/auth/*` tree and the Supabase auth components (`login-form.tsx`, `sign-up-form.tsx`, `forgot-password-form.tsx`, `update-password-form.tsx`, `sign-up-form.tsx`, `auth-shell.tsx`).

---

### B5. Open redirect in `/auth/confirm` (still open)
**File:** `app/auth/confirm/route.ts:10,21`

`next` param is user-controlled with no validation. Error messages are reflected unencoded in the URL. Deleting `/auth/*` per B4 fixes this entirely.

---

### B6. (NEW) Admin search filter injection on `/admin/cars`
**File:** `app/admin/cars/page.tsx:33-34`

Same `.or()` injection as B2 but in an authenticated context. Since admin users can see all car statuses (including draft), a crafted search could also expose draft/sold cars to users with `readonly` role — though this route already requires `admin` or `staff`. Flagged because it shares the same unsanitized pattern.

---

## [HIGH] High findings

### H1–H5, H7–H8, H10 remain OPEN
See iteration 1 for full details. No changes since original audit.

### H6. Settings fetch duplicated on every public page (partially fixed)
Navigation was consolidated into `PublicShell`, but each page still independently calls `supabase.from('settings').select('*').maybeSingle()`. Home (`app/page.tsx:16`), contact (`app/contact/page.tsx:15`), and inventory (`app/inventory/page.tsx`) all fetch settings. This should be lifted to a shared `(public)/layout.tsx`.

---

### H11. (NEW) `leads-table.tsx` mutates data from client with no auth check
**File:** `components/admin/leads-table.tsx:54-63`

```ts
const updateStatus = async (leadId: string, newStatus: Lead['status']) => {
  const supabase = createClient();
  const { error } = await supabase
    .from('leads')
    .update({ status: newStatus })
    .eq('id', leadId);
```

Status updates are made directly from the browser client. RLS gates this to `admin`/`staff`, but there's no error feedback to the user — the error is silently swallowed. If the update fails (e.g. RLS denial for a `readonly` user), the UI shows the old status but gives no indication the update was rejected.

**Fix:** Show error state on failure. Better: move to a Server Action with Zod validation.

---

### H12. (NEW) `lib/auth.ts` makes 3 round-trips per admin page load
**File:** `lib/auth.ts:5-24`, `app/admin/layout.tsx:24-25`

```ts
const user = await getCurrentUser();           // 1. supabase.auth.getUser()
const profile = user ? await getCurrentProfile() : null; // 2. supabase.auth.getUser() + 3. profiles.select()
```

`getCurrentProfile()` internally calls `getUser()` again. Every admin page makes 3 Supabase round-trips when 1 suffices. This compounds with `requireRole()` calls in individual pages adding another 2 round-trips each.

For the admin dashboard (`app/admin/page.tsx`), the total is: `requireRole` (2 hops) + layout's `getCurrentUser` (1 hop) + `getCurrentProfile` (2 hops) + 6 data queries = **11 Supabase calls** per page load.

**Fix:** Combine into a single `getCurrentUserAndProfile()` helper. Use `React.cache()` to deduplicate within a single request.

---

### H13. (NEW) Login form leaks profile existence to unauthenticated users
**File:** `components/login-form.tsx:48-58`

After successful login, the form queries the `profiles` table to decide where to redirect. A user who has a Supabase account but no profile is sent to `/` while a user with a profile goes to `/admin`. This exposes whether a profile row exists for the user, which is a minor information disclosure.

More critically, the login form at `/auth/login` links to `/auth/sign-up` (line 147-151), reinforcing the public signup problem from B4.

---

### H14. (NEW) `sign-up-form.tsx` redirects new users to `/protected`
**File:** `components/sign-up-form.tsx:49`

```ts
emailRedirectTo: `${window.location.origin}/protected`,
```

After email confirmation, new users land on the tutorial `/protected` page that dumps JWT claims. This is both confusing UX and a minor information disclosure (B3).

---

## [MED] Medium findings

### M1–M16 remain OPEN
See iterations 1 & 2 for full details.

### M17. (NEW) `lead-status-update.tsx` is a dead component
**File:** `components/admin/lead-status-update.tsx`

This component is only used in `app/admin/leads/[id]/page.tsx`. Meanwhile, `leads-table.tsx` has its own inline `updateStatus` function that duplicates the same logic. Two separate implementations of lead status mutation with different error handling (one logs to console, the other swallows entirely).

**Fix:** Use one component. Delete the other.

---

### M18. (NEW) Admin dashboard fires 6 parallel unbounded queries
**File:** `app/admin/page.tsx:18-33`

```ts
const { count: totalCars } = await supabase.from('cars').select('*', { count: 'exact', head: true });
const { count: publishedCars } = ...
const { count: soldCars } = ...
const { count: newLeads } = ...
const { data: recentLeads } = ... .limit(5);
const { data: recentCars } = ... .limit(5);
```

Six sequential `await` calls. These should be parallelized with `Promise.all()`. On a cold Supabase connection, this adds 300-600ms of unnecessary latency.

---

### M19. (NEW) `car-form.tsx` error banner uses light-mode colors
**File:** `components/admin/car-form.tsx:264-266`

```tsx
<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
  <p className="text-red-600">{error}</p>
</div>
```

The app is dark-mode only (`<html className="dark">`), but this error banner uses `bg-red-50` (white-ish background) and `text-red-600`. It will be unreadable on the dark background. Every other form uses the destructive card pattern.

---

### M20. (NEW) `image-upload.tsx` creates Supabase client at module scope
**File:** `components/admin/image-upload.tsx:27`

```ts
const supabase = createClient();
```

The Supabase browser client is created at component render time, not inside the upload handler. This means a stale client instance is reused across the component's lifecycle. If the user's session token refreshes between renders and the upload handler, the upload could fail with an auth error.

**Fix:** Move `createClient()` inside `handleFileSelect`.

---

### M21. (NEW) No pagination anywhere
No page has pagination. Both the public inventory and admin tables load all records. With 100+ cars, the inventory page will fetch all rows, render all cards, and blow up the DOM. The admin leads table will grow unbounded.

---

### M22. (NEW) `cars-table.tsx` and `leads-table.tsx` missing `sizes` on `<Image fill>`
**File:** `components/admin/cars-table.tsx:129,209`

Multiple `<Image fill>` without `sizes` prop — Next.js will serve the largest variant regardless of the container (96px or 80px thumbnails getting 3840px images).

---

## [LOW] Low / polish

### L1–L14 remain OPEN

### L15. (NEW) `brand-dim` used as text color but not defined in Tailwind config
The class `text-brand-dim` is used extensively (`app/page.tsx`, `app/contact/page.tsx`, etc.) but `brand-dim` is not in `tailwind.config.ts` colors. It likely comes from a CSS custom property in `globals.css`. This works but bypasses the design system — `text-muted-foreground` is the equivalent token.

### L16. (NEW) `lead-form-modal.tsx` success timer doesn't clean up
**File:** `components/lead-form-modal.tsx:64-75`

```ts
setTimeout(() => {
  setIsOpen(false);
  // ...
}, 1800);
```

Same `setTimeout` cleanup issue as M16 in `settings-form`. If the component unmounts during the 1.8s window, the timer fires on dead state.

### L17. (NEW) `admin/login/layout.tsx` exists but purpose is unclear
There's a separate layout for the admin login page. If it's just removing the admin nav, the `admin/layout.tsx` already handles unauthenticated users by rendering `{children}` without the nav wrapper.

### L18. (NEW) `components.json` references `src/` paths
**File:** `components.json`

The shadcn CLI config may reference `src/` paths, but the project uses root-level `app/` and `components/`. New shadcn component installs could go to the wrong location.

### L19. (NEW) No `app/not-found.tsx` (global 404)
Only `app/cars/[slug]/not-found.tsx` exists. All other 404s fall through to Next.js default error page.

### L20. (NEW) `app/admin/leads/[id]/page.tsx:125` renders mileage as `undefined miles`
```tsx
{car.mileage?.toLocaleString()} miles
```

If `car.mileage` is null, this renders `undefined miles` because the optional chain produces `undefined`, which gets string-concatenated with ` miles`.

---

## AWS Amplify migration checklist

Items specific to the Supabase-to-Amplify migration:

| # | Item | Status |
|---|------|--------|
| A1 | `output: 'standalone'` in `next.config.ts` | Done |
| A2 | Node.js 20 pinned in `amplify.yml` | Done |
| A3 | Dead `@vercel/analytics` removed | Done |
| A4 | Dead Amplify Gen 2 backend packages removed | Done |
| A5 | Replace Supabase Auth with Cognito/Amplify Auth | Pending |
| A6 | Replace Supabase Database with DynamoDB/RDS | Pending |
| A7 | Replace Supabase Storage with S3 | Pending |
| A8 | Replace Supabase RLS with application-level auth middleware | Pending |
| A9 | Remove all `@supabase/*` imports and refactor data layer | Pending |
| A10 | Set `NEXT_PUBLIC_SITE_URL` in Amplify console env vars | Pending |
| A11 | Delete `/auth/*` flow (B4) and tutorial cruft (B3) | Pending |
| A12 | Update `next.config.ts` `images.remotePatterns` for S3/CloudFront hostname | Pending |
| A13 | `hardcoded Supabase hostname` in next.config.ts needs env var | Pending |

---

## Quick-win priority order

1. **B1** (profiles RLS) — 5-minute SQL migration, blocks full admin takeover
2. **B2 + B6** (filter injection) — ~10 lines, both inventory and admin search
3. **B4** (disable public signup + delete `/auth/*`) — also fixes B5, H14
4. **B3** (delete tutorial files) — ~15 files, shrinks bundle, removes info leak
5. **H12** (combine auth helpers + `React.cache()`) — biggest perf win for admin
6. **M18** (parallelize dashboard queries) — `Promise.all()`, 5-minute fix
7. **M19** (dark-mode error banner) — copy existing destructive card pattern
8. **M20** (move `createClient` inside handler) — 1 line move
9. **H2 + H4 + H5** (per-car metadata + sitemap + human slugs) — SEO trifecta
10. **H8** (Radix Dialog for lead form) — accessibility

---

## Out of scope for this pass
- Live browser Lighthouse / Core Web Vitals run
- Supabase dashboard config audit (RLS force-on, JWT expiry, auth providers)
- Bundle size measurement beyond `next build` output
- Full Amplify deployment verification (build succeeds locally)
- AWS IAM / Amplify service role permissions
- Mobile responsiveness testing

---

*Iteration 3 appended 2026-04-13. New findings: 1 blocking (B6), 4 high (H11-H14), 6 medium (M17-M22), 6 low (L15-L20). Running totals: 6 [BLOCK] | 14 [HIGH] | 22 [MED] | 20 [LOW] = 62 findings.*

---

## Iteration 4 — Live browser audit (2026-04-15)

Ran the dev server and walked the site in a real Chromium session. Confirms several prior code-level findings and surfaces UI-level issues that only show up in the browser.

### Confirmations of existing findings

- **B4 (dual auth + public signup)** — visually confirmed. `/admin/login` renders a "Don't have an account? **Sign up**" link, and `/auth/sign-up` is fully reachable without auth. Anyone can create an account from the browser.
- **B3 (tutorial cruft)** — `/protected` is still routable. When unauthenticated it redirects to `/auth/login` (the tutorial auth flow), not `/admin/login`, confirming both flows live in parallel.
- **H8 (inaccessible lead form modal)** — opening the "Send Contact Request" form does NOT create a `dialog` role, backdrop, or focus trap. The form expands *inline inside the card* and the accessibility tree shows it as plain generic nodes. ESC and outside-click do nothing.
- **H13 (shadcn placeholder still shipped)** — both `/admin/login` and `/auth/login` use the default `m@example.com` placeholder text. Brand polish issue + reveals the stack.

### New findings

#### B7. (NEW) Contact page wastes ~700px of vertical space above the fold
**File:** `app/contact/page.tsx` + `PublicShell`/hero markup

On a 1384×749 viewport, the two content regions ("Business Schedule" and "Open The Inquiry Form") only start becoming visible around y≈800px — the entire first screen is black with just the heading "Direct Inquiry, Clear Response." crammed into the top sliver. No imagery, no CTA, no context. The hero has `min-h-screen`-style padding but no content to fill it.

**Impact:** Users on desktop land on a near-empty dark canvas and are likely to bounce. On a phone, the form button is 2+ screens deep.

**Fix:** Drop the hero padding on `/contact`, or move the "Dealership Desk" / "Open The Inquiry Form" cards up into the hero grid. This is a layout regression from `components/layout/public-shell.tsx`'s default hero spacing being applied to a content-light page.

---

#### B8. (NEW) Mobile homepage has horizontal overflow and clipped hero
**Viewport:** 375×812 (iPhone SE / 13 mini)

- The eyebrow text `COLUMBUS PRIVATE-CLIENT INVENTORY` extends past the right edge of the viewport and is cut off mid-word ("INVENT…"). This creates a horizontal scrollbar.
- The hero heading `CURATED INVENTORY. PRECISE GUIDANCE. DIRECT ACQUISITION.` uses a display-size font (`text-5xl`/`text-6xl`) with no mobile downshift, so the last two words render below the fold and the first line pushes the eyebrow off-axis.

**Fix:** Add `max-w-full` + `tracking-tight` + responsive `text-3xl sm:text-5xl lg:text-7xl` ramp on the hero heading. Wrap or break the eyebrow tag at `sm`.

---

#### H15. (NEW) Settings unpopulated — public pages show placeholder contact data
The `settings` row in the DB is either empty or has placeholders. Production-facing pages render:
- Phone: `(614) 000-0000`
- Email: `info@jandfauto.com` (likely real) / placeholder phone
- Hero copy reads as boilerplate ("Columbus private-client inventory")

**Impact:** The site is shipping with fake phone numbers. If Amplify goes live before settings are seeded, real customers see `(614) 000-0000`.

**Fix:** Add a seed/migration step or block the build when `settings.phone` matches the placeholder pattern.

---

#### M23. (NEW) Lead-form overlay renders behind the hero background
When the inline "modal" expands, it does not stack above the page — the surrounding `OPEN THE INQUIRY FORM` heading and description are still visible alongside the form fields. There is no `z-index`/overlay to isolate the form. Ties back to H8: because it is not a real Radix `Dialog`, it does not create a stacking context or focus layer.

---

#### L21. (NEW) Window resize to mobile doesn't trigger a redesigned nav layout
The nav collapses to a hamburger-style "Open navigation" button (correct), but on very small viewports (≤400px) the `J&F AUTO` wordmark and hamburger overlap the eyebrow copy. Minor — noticed at 375px.

### Items NOT covered in this pass

- Admin pages behind auth (no seeded admin user available to test)
- Image optimization (`next/image` LCP timing, AVIF/WebP delivery) — needs a real Lighthouse run
- Network waterfall / RSC hydration timing
- Keyboard-only navigation through the full flow
- Screen-reader walkthrough of the lead form (H8 likely cascades here)

---

*Iteration 4 appended 2026-04-15. New findings: 2 blocking (B7-B8), 1 high (H15), 1 medium (M23), 1 low (L21). Running totals: 8 [BLOCK] | 15 [HIGH] | 23 [MED] | 21 [LOW] = 67 findings.*

---

## Iteration 5 — Remaining code paths (2026-04-15)

Checked: `app/cars/[slug]/page.tsx`, `components/public-header.tsx`, `components/inventory-vehicle-card.tsx`, `components/car-image-slideshow.tsx`, `supabase/migrations/002_storage_setup.sql`, SEO discovery URLs.

### SEO discovery is broken
Verified over HTTP on the live dev server:
- `GET /robots.txt` → **HTTP 404**
- `GET /sitemap.xml` → **HTTP 404**
- Unknown URL returns Next.js default error page (no custom `app/not-found.tsx`)

Confirms H4 and L19 in full. Google and Bing will not discover `/cars/[slug]` pages.

---

### H16. (NEW) `/cars/[slug]` has no `generateMetadata`
**File:** `app/cars/[slug]/page.tsx`

Every car detail page inherits the root `<title>J&F Auto</title>` and the same generic OG image. A Google search result for a 2021 BMW M3 and a 2019 Audi S5 look identical. No `canonical`, no `openGraph.url`, no per-car description.

**Fix:** Export `generateMetadata({ params })` that fetches the car, sets `title: \`${car.year} ${car.make} ${car.model} | J&F Auto\``, `description: car.description?.slice(0,155)`, `openGraph.images: [car.hero_image_url]`, and `alternates.canonical`.

---

### M24. (NEW) `public-header.tsx` inlines its own `cn()` helper
**File:** `components/public-header.tsx:101-103`

Defines a local `cn()` at the bottom of the file instead of importing from `@/lib/utils`. Trivially diverges from the project-wide helper (no Tailwind-merge).

---

### M25. (NEW) Non-functional "Location settings" button in header
**File:** `components/public-header.tsx:47-50`

```tsx
<Button variant="outline" size="icon" className="hidden md:inline-flex">
  <Globe className="h-4 w-4" />
  <span className="sr-only">Location settings</span>
</Button>
```

Renders a prominent globe icon next to "Inquire" on every public page. Click does nothing. No handler, no link. It appears in the accessibility tree as an enabled button with label "Location settings" but has no behavior. Either wire it to a location picker or delete it.

---

### M26. (NEW) Inventory card renders `$NaN` when price is null
**File:** `components/inventory-vehicle-card.tsx:43`

```tsx
${Math.round(Number(car.price)).toLocaleString()}
```

`Number(null)` → `0`, `Number(undefined)` → `NaN`, `Math.round(NaN)` → `NaN`, `NaN.toLocaleString()` → `"NaN"`. The DB lets price be NULL (no `NOT NULL` in `001_initial_schema.sql`), so a draft row without price will ship a `$NaN` badge if it ever gets published. Same bug class as L20 (mileage).

**Fix:** `car.price != null ? \`$\${Math.round(Number(car.price)).toLocaleString()}\` : 'Inquire'`.

---

### M27. (NEW) Invalid nested `<button>` inside `<a>` on inventory card
**File:** `components/inventory-vehicle-card.tsx:23,70`

The entire card is wrapped in `<Link href>` (renders `<a>`), and inside the card `components/ui/button.tsx` with `variant="ghost"` renders a real `<button>` around the "View Details" text. Nesting interactive elements like this is invalid HTML, breaks keyboard navigation (tab lands on both), and React will warn in dev.

**Fix:** Replace the "View Details" Button with a `<span>` styled like a button; the outer `<Link>` already handles the click.

---

### M28. (NEW) Slideshow fullscreen modal has no `dialog` role or focus trap
**File:** `components/car-image-slideshow.tsx:156-208`

Same class of issue as H8. When the user clicks the hero image, the fullscreen viewer renders as `<div class="fixed inset-0 z-[90]">` — no `role="dialog"`, no `aria-modal`, no focus trap. It does handle ESC and arrow keys (better than the lead form), but a screen reader user has no indication a modal opened.

**Fix:** Use Radix `Dialog` for consistency with H8's fix.

---

### L22. (NEW) Slideshow mutates `document.body.style.overflow` directly
**File:** `components/car-image-slideshow.tsx:33,38,59`

Imperatively toggling `document.body.style.overflow = 'hidden'` / `'unset'` is fragile. If the component errors between open and close, the body stays locked. Radix Dialog handles this correctly via scroll-lock primitives.

---

### L23. (NEW) Car detail spec grid silently truncates at 6 items
**File:** `app/cars/[slug]/page.tsx:100`

```tsx
{specCards.slice(0, 6).map(...)}
```

The spec array can contain up to 8 items (year/make/model/trim/mileage/body/transmission/fuel), but only 6 are rendered. Users see trim + mileage but "Transmission" and "Fuel Type" get dropped silently if the first 6 slots filled. Either show all, or move less-critical specs below the fold.

---

### Cascading risk from B1

Storage policies in `002_storage_setup.sql` correctly gate uploads/updates/deletes on `profiles.role IN ('admin', 'staff')`, but B1 lets any logged-in user self-promote to `admin`, which then unlocks **storage write access** — they could overwrite every car image in the bucket, or delete them. B1 is not just an auth issue; it is a data-integrity issue for the storage layer.

---

*Iteration 5 appended 2026-04-15. New findings: 1 high (H16), 5 medium (M24-M28), 2 low (L22-L23). Running totals: 8 [BLOCK] | 16 [HIGH] | 28 [MED] | 23 [LOW] = 75 findings.*

---

## Iteration 6 — Tooling / lint / missing-asset pass (2026-04-15)

Ran `npm run lint`, `npx tsc --noEmit`, and inventoried `public/`.

### B9. (CORRECTED) OpenGraph and Twitter images are the Supabase starter-kit template
**Files:** `app/opengraph-image.png`, `app/twitter-image.png`

The files exist and serve correctly (HTTP 200) via Next.js App Router file convention. However, **both images are identical copies of the Supabase "Next.js Starter Kit" promotional graphic** — they show the Supabase and Next.js logos with "Template — Next.js Starter Kit" text. Every share of J&F Auto on Facebook, X/Twitter, LinkedIn, iMessage, Slack, or Discord displays a Supabase advertisement instead of dealership branding.

This is B3 (tutorial cruft) at its most visible — it's the first thing a potential customer sees when the site link is shared.

**Fix:** Replace both files with branded J&F Auto images at 1200×630 (OG) and 1200×675 (Twitter). Remove the redundant manual `openGraph.images` and `twitter.images` entries in `app/layout.tsx:31-45` — the file-convention images auto-generate the metadata tags.

---

### H17. (NEW) `npm run lint` fails on every run — CI blocker
**Command:** `npm run lint`

```
/Users/.../jandfauto/next-env.d.ts
  3:1  error  Do not use a triple slash reference for ./.next/types/routes.d.ts,
              use `import` style instead  @typescript-eslint/triple-slash-reference
✖ 1 problem (1 error, 0 warnings)
```

`next-env.d.ts` is generated by Next.js and should not be linted. With the current `eslint.config.mjs`, every lint run fails with an error on a file that will be regenerated on the next build. If/when CI runs `npm run lint`, the pipeline fails.

**Fix:** Add `next-env.d.ts` (and `.next/**`) to the ESLint `ignores` list in `eslint.config.mjs`. One-liner.

---

### M29. (NEW) `middleware.ts` runs Supabase session refresh on every request
**File:** `middleware.ts:5-13`

The matcher excludes static assets but runs on **every** HTML request, including the home page and car detail pages where there is no logged-in user to refresh. On Amplify Hosting, this translates to a Lambda invocation per request, even for cached public pages. Combined with H1 (`unstable_noStore()`), every public request does: auth cookie check → Supabase `getUser()` round-trip → page render → no cache.

**Amplify-migration note:** When swapping to Cognito, do not recreate this pattern. Cognito tokens are self-validating (JWT signature check, no DB call); gate middleware to `/admin/*` only.

**Fix:** Narrow the matcher to `['/admin/:path*', '/auth/:path*']` — or simply `/admin/:path*` once B4 removes `/auth/*`.

---

### L24. (NEW) `console.error` left in `components/admin/lead-status-update.tsx:33`
```ts
} catch (err) {
  console.error('Error updating status:', err);
}
```

Logs admin-only actions to the browser console. Low impact (no secrets in the error), but inconsistent with the rest of the codebase which shows errors in UI. Ties to M17 (dead-component / duplicated logic).

---

### Good signals (no findings)
- `npx tsc --noEmit` exits clean — no type errors.
- No `TODO` / `FIXME` / `HACK` comments in source.
- No `any` usages detected in app/components code.
- `.gitignore` correctly excludes `.env*.local` and `.env`.

---

*Iteration 6 appended 2026-04-15. New findings: 1 blocking (B9), 1 high (H17), 1 medium (M29), 1 low (L24). Running totals: 9 [BLOCK] | 17 [HIGH] | 29 [MED] | 24 [LOW] = 79 findings.*

---

## Iteration 7 — Admin CRUD, settings, profile, leads (2026-04-15)

Reviewed: `app/admin/cars/new/page.tsx`, `app/admin/cars/[id]/page.tsx`, `app/admin/settings/page.tsx`, `app/admin/profile/page.tsx`, `app/admin/leads/page.tsx`, `app/admin/leads/[id]/page.tsx`, `components/admin/car-form.tsx`, `components/admin/settings-form.tsx`, `components/admin/profile-form.tsx`, `lib/auth.ts`.

---

### H18. (NEW) New cars default to `published` — go live immediately
**File:** `components/admin/car-form.tsx:33`

```ts
status: car?.status || 'published',
```

When creating a new car, the status dropdown defaults to `published`. If the user forgets to change it, the car goes live on the public site immediately with whatever partial data exists. Dealership UX should default to `draft`, requiring a conscious publish action.

**Fix:** Change to `status: car?.status || 'draft'`.

---

### H19. (NEW) Auth helper chain makes 5–7 Supabase calls per admin page
**File:** `lib/auth.ts` + `app/admin/layout.tsx:24-25` + every admin page

Expanded from H12 — the full picture is worse than initially scoped:

| Page | Layout calls | Page calls | Total auth round-trips |
|------|-------------|------------|----------------------|
| `/admin` (dashboard) | 3 | 2 (`requireRole`) | 5 + 6 data queries = **11** |
| `/admin/profile` | 3 | 4 (`requireAuth` + `getUser` + `getCurrentProfile`) | **7** + 0 data = **7** |
| `/admin/leads` | 3 | 2 (`requireRole`) | **5** + 1 data = **6** |
| `/admin/settings` | 3 | 2 (`requireAdmin`) | **5** + 1 data = **6** |

`getCurrentProfile()` always calls `getUser()` internally (line 13), so any helper that needs the profile also re-fetches the user. No function uses `React.cache()`.

**Fix (immediate):** Wrap `getCurrentUser` and `getCurrentProfile` in `React.cache()`:
```ts
import { cache } from 'react';
export const getCurrentUser = cache(async () => { ... });
```
This deduplicates within a single React Server Component render pass — all 5–7 calls collapse to 2.

---

### M30. (NEW) Car-form `<select>` uses raw HTML element with light-mode styling
**File:** `components/admin/car-form.tsx:213-222`

```tsx
<select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
```

Every other form element uses the project's styled `Input` component, but the status dropdown uses a raw `<select>` with `bg-transparent`. On a dark background, the dropdown options render with the OS's default light-mode option list, creating a jarring flash of white.

**Fix:** Use a shadcn `Select` component or apply `bg-background text-foreground` to the select and its options.

---

### M31. (NEW) `primary_color` and `secondary_color` stored but never read
**Files:** `components/admin/settings-form.tsx:47-48` (write), vs entire `app/` + `components/` (no reads)

The settings form lets admins pick `primary_color` and `secondary_color` via `<input type="color">`, and the values are stored in the DB. But **no public page or component ever reads these values**. All colors are hardcoded in Tailwind config and CSS custom properties. These settings are dead data that create a false expectation for the admin user.

**Fix:** Either wire them to CSS custom properties at render time (e.g., inject into `<html style>` from `PublicShell`), or remove the fields from the form.

---

### M32. (NEW) Profile page fetches user 4 times
**File:** `app/admin/profile/page.tsx:10-15`

```ts
await requireAuth();                          // getUser() → call 1
const { data: { user } } = await supabase.auth.getUser();  // call 2
const profile = await getCurrentProfile();    // getUser() → call 3, profiles.select → call 4
```

Plus the 3 calls from the layout = **7 Supabase round-trips** just to load a profile page with zero data queries beyond auth. Worst-case page in the admin.

**Fix:** Replace with a single `requireAuth()` that returns both user and profile. See H19 for the `React.cache()` pattern that deduplicates across layout + page.

---

### L25. (NEW) Success toast timer not cleaned up on unmount
**Files:** `components/admin/settings-form.tsx:105`, `components/admin/profile-form.tsx:52`

```ts
setTimeout(() => setSuccess(false), 3000);
```

Same issue as L16 (lead-form modal). If the component unmounts within the 3s window (e.g., user navigates away), the timer fires on dead state.

**Fix:** Use `useEffect` cleanup or a ref-guarded timeout. Low priority — React will silently swallow the stale setState.

---

### L26. (NEW) Server-side `toLocaleString()` uses server locale for dates
**File:** `app/admin/leads/[id]/page.tsx:96`

```tsx
<p>{new Date(lead.created_at).toLocaleString()}</p>
```

This runs in a React Server Component, so `toLocaleString()` uses the server's locale (whatever AWS Lambda defaults to, typically `en-US` in US-East). An admin in the UK or Germany will see US-formatted dates. Same applies to line 151 (`preferred_datetime`).

**Fix:** Use `Intl.DateTimeFormat` with an explicit locale param, or move to a client component that reads the browser locale.

---

### Positive findings
- `app/admin/leads/page.tsx` properly uses `.eq()` for filters, not `.or()` string interpolation — no injection here.
- `requireRole(['admin', 'staff', 'readonly'])` for leads and `requireAdmin()` for settings are correct role gates.
- `app/admin/cars/new/page.tsx` calls `requireAdminOrStaff()` correctly.
- `createClient()` in `car-form.tsx:53` is correctly inside the submit handler (unlike M20/image-upload).

---

*Iteration 7 appended 2026-04-15. New findings: 2 high (H18-H19), 3 medium (M30-M32), 2 low (L25-L26). Running totals: 9 [BLOCK] | 19 [HIGH] | 32 [MED] | 26 [LOW] = 86 findings.*

---

## Iteration 8 — Production build analysis + final file sweep (2026-04-15)

Ran `npm run build` (Next.js production build) and reviewed all remaining source files: `globals.css`, `public-shell.tsx`, `public-footer.tsx`, `logo.tsx`, `client-only.tsx`, `logout-button.tsx`, `admin-page-header.tsx`, `lib/supabase/proxy.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/utils.ts`, `lib/types.ts`.

### Build output summary

Build completed in 1.3s with one warning:

```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
We detected multiple lockfiles and selected /Users/isiahchillous/package-lock.json
```

| Metric | Value |
|--------|-------|
| Total routes | 24 |
| Static (○) | 8 (auth pages, `_not-found`) |
| Dynamic (ƒ) | 16 (all content pages + admin) |
| Shared JS | 102 kB |
| Largest page | `/cars/[slug]` — 200 kB first load |
| Middleware | 87.1 kB |

---

### H20. (NEW) Standalone build may break due to workspace root misdetection
**Config:** `next.config.ts` → `output: 'standalone'`

Next.js warns it detected a lockfile at `~/package-lock.json` (parent directory) AND at the project root. In standalone mode, this can cause file tracing to resolve dependencies from the parent `node_modules/` instead of the project's, breaking the Lambda deployment on Amplify.

**Fix:** Add `outputFileTracingRoot` to `next.config.ts`:
```ts
outputFileTracingRoot: path.join(__dirname),
```
Or remove the parent lockfile if it's not needed. This is critical for Amplify where the standalone bundle must be self-contained.

---

### M33. (NEW) `lib/utils.ts` contains tutorial comment and `hasEnvVars` bypass
**File:** `lib/utils.ts:8-11`

```ts
// This check can be removed, it is just for tutorial purposes
export const hasEnvVars = process.env.NEXT_PUBLIC_SUPABASE_URL && ...
```

The comment says to remove it, and `hasEnvVars` is used in `proxy.ts:12` to **completely skip auth middleware** when env vars are missing. This means any deployment without Supabase env vars has zero route protection — all admin pages are publicly accessible. Part of B3 (tutorial cruft).

---

### M34. (NEW) Vercel-specific comments left in Supabase client files
**Files:** `lib/supabase/proxy.ts:17`, `lib/supabase/server.ts:5-8`

Both files mention "Fluid compute" (a Vercel product), which will be confusing for anyone maintaining the Amplify deployment.

---

### L27. (NEW) `lib/supabase/client.ts` uses `!` non-null assertion without validation
**File:** `lib/supabase/client.ts:5-6`

```ts
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
```

Unlike `server.ts` (which validates and throws a helpful error), the browser client silently crashes with an opaque Supabase SDK error when env vars are missing. Low impact since the build would typically fail first, but inconsistent with the server-side safety.

---

### L28. (NEW) Middleware is 87 kB — heavy for per-request execution
**File:** middleware.ts → `lib/supabase/proxy.ts` → `@supabase/ssr`

The middleware bundle is 87.1 kB (mostly `@supabase/ssr`). On Amplify, middleware runs as a Lambda@Edge function on every request. This increases cold-start latency. Combined with M29 (middleware runs on all routes, not just admin), every public page load spins up 87 kB of middleware just to call `getClaims()` and discover there's no auth cookie.

**Amplify-migration note:** When replacing with Cognito, middleware should only verify the JWT signature (small, no SDK needed) and only on `/admin/*` routes. Target under 10 kB.

---

### Correction: L15 is not a finding

L15 stated that `text-brand-dim` is not defined in Tailwind config. On re-review, it IS defined as a CSS utility in `globals.css:172-174`:
```css
.text-brand-dim { color: hsl(var(--brand-text-dim)); }
```
This is a valid pattern (custom utility in the CSS layer). L15 should be marked as **RETRACTED**.

---

### Files reviewed — no issues found
- `components/logo.tsx` — clean, well-structured with CVA variants
- `components/public-footer.tsx` — clean, gracefully handles null settings
- `components/client-only.tsx` — standard hydration guard pattern
- `components/logout-button.tsx` — correctly creates client inside handler
- `components/admin-page-header.tsx` — clean, reusable component
- `lib/types.ts` — well-typed interfaces matching DB schema

---

### Completeness checkpoint

Every source file has now been reviewed:
- **`app/`**: 25/25 pages, routes, and layouts ✓
- **`components/`**: 47/47 components ✓
- **`lib/`**: 6/6 utility and data files ✓
- **`supabase/`**: 2/2 migrations ✓
- **Config**: `next.config.ts`, `amplify.yml`, `package.json`, `tailwind.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `globals.css`, `components.json`, `.env.example`, `.gitignore` ✓
- **Public assets**: `public/` directory ✓
- **App Router metadata files**: `app/opengraph-image.png`, `app/twitter-image.png` ✓
- **Live browser**: Homepage, inventory, contact, lead form, admin login, auth/sign-up, mobile viewport ✓
- **Automated checks**: `npm run lint`, `npx tsc --noEmit`, `npm run build`, HTTP probes ✓

---

*Iteration 8 appended 2026-04-15. B9 corrected (images exist but are template images). L15 retracted. New findings: 1 high (H20), 2 medium (M33-M34), 2 low (L27-L28). Running totals: 9 [BLOCK] | 20 [HIGH] | 34 [MED] | 27 [LOW] = 90 findings (minus L15 retracted = 89 active).*
