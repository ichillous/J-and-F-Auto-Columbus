# J&F Auto — Website Audit

**Scope:** Full-stack audit of the `jandfauto` Next.js 16 + Supabase + Tailwind/shadcn app. Covers security, SEO, performance, accessibility, code quality, and production-readiness.

**Stack observed:** Next.js 16.0.7 (App Router, `proxy.ts`), React 19.2.1, Supabase SSR, Tailwind + shadcn/ui, `@vercel/analytics` (installed but not mounted).

**Legend:** [BLOCK] · [HIGH] · [MED] · [LOW]

---

## [BLOCK] Blocking findings (must fix before shipping)

### B1. Privilege escalation via `profiles` RLS
**File:** `supabase/migrations/001_initial_schema.sql:111-113`

```sql
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

No `WITH CHECK` clause and no column-level restriction. Any authenticated user — including a `readonly` self-signup — can execute `UPDATE profiles SET role = 'admin' WHERE id = auth.uid()` directly from the browser Supabase client and instantly gain admin permissions on cars, leads, and settings.

**Fix:**
```sql
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );
```
Better: drop self-update entirely and route profile edits (name only) through a `SECURITY DEFINER` RPC that whitelists editable columns.

---

### B2. Filter injection in inventory search
**File:** `app/inventory/page.tsx:41-44`

```ts
if (resolvedSearchParams.search) {
  const searchTerm = resolvedSearchParams.search.toLowerCase();
  query = query.or(`title.ilike.%${searchTerm}%,make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`);
}
```

Raw user input is interpolated into a PostgREST `.or()` filter string with no escaping. A crafted `?search=` value containing commas, dots, or operator tokens (e.g. `foo,status.eq.draft`) can append new filter clauses, remove restrictions, or reshape the query. RLS limits the damage to `status='published'` cars, but it still exposes unlisted data if combined with #B1, and leaks query structure.

**Fix:** Sanitize the input, or use full-text search:
```ts
const safe = resolvedSearchParams.search.replace(/[,.*()%]/g, '');
query = query.or(`title.ilike.%${safe}%,make.ilike.%${safe}%,model.ilike.%${safe}%`);
```
Better: add a `search_tsv tsvector` generated column on `cars` and use `.textSearch('search_tsv', term, { type: 'websearch' })`.

---

### B3. Tutorial / starter-template cruft shipped to production
The repo was bootstrapped from the Supabase Next.js starter and still carries the template code alongside the real app:

| Path | What it is | Action |
|------|------------|--------|
| `app/protected/page.tsx` | Tutorial "your claims JSON" page | Delete |
| `app/protected/layout.tsx` | Tutorial layout with DeployButton + "Powered by Supabase" | Delete |
| `app/auth/*` | Parallel auth flow separate from `/admin/login` | Consolidate or delete (see #B4) |
| `components/tutorial/*` | 5 tutorial step components | Delete |
| `components/deploy-button.tsx` | Deploy-to-Vercel button | Delete |
| `components/env-var-warning.tsx` | Env-var missing banner | Delete |
| `components/next-logo.tsx` | Next.js logo | Delete |
| `components/supabase-logo.tsx` | Supabase logo | Delete |
| `components/hero.tsx` | Tutorial hero, unused | Delete |
| `components/tutorial/fetch-data-steps.tsx` | Referenced only by `/protected` | Delete with /protected |

This is bundle bloat, brand leakage ("Powered by Supabase" footer on `/protected`), and a maintenance trap. The `/protected` page also dumps raw JWT claims JSON into the DOM — minor info disclosure.

---

### B4. Dual auth flows: `/auth/*` and `/admin/login`
**Files:** `app/auth/{login,sign-up,forgot-password,update-password,confirm,sign-up-success,error}`, `app/admin/login/page.tsx`

Two separate login surfaces exist. Only `/admin/*` is gated by `proxy.ts`. `/auth/sign-up` is public and — combined with the default `readonly` role from the `handle_new_user` trigger, and #B1 — means anyone can sign up, elevate, and take over. Even without #B1, the sign-up route is user-visible but there's no product use case for public signup on a single dealership site.

**Fix:** Remove `/auth/sign-up*` and `/auth/forgot-password`, keep a single `/admin/login`. Disable public sign-ups in Supabase dashboard (`Authentication → Providers → Email → Allow signups = off`). Admin creates new staff manually.

---

## [HIGH] High findings (SEO, perf, architecture)

### H1. Caching completely disabled on every public page
**Files:** `app/page.tsx:14`, `app/inventory/page.tsx:31`, `app/cars/[slug]/page.tsx:20`, `app/contact/page.tsx:13`

Every public page calls `unstable_noStore()`. This forces fully dynamic rendering on every request. Settings and cars change rarely (admin-triggered). With Next 16 Cache Components:

```ts
// app/page.tsx
'use cache'
import { cacheTag } from 'next/cache';

export default async function Home() {
  cacheTag('settings', 'cars-featured');
  // ...
}
```

Then on writes in admin (car create/update/delete, settings update):
```ts
import { revalidateTag } from 'next/cache';
revalidateTag('cars-featured');
revalidateTag('cars');
```

Expected impact: drop p50 home/inventory TTFB from ~200–400ms (Supabase RTT) to cache-hit speed, and cut Supabase egress.

---

### H2. No per-car metadata (SEO disaster)
**File:** `app/cars/[slug]/page.tsx`

Every car detail page inherits the root `"J&F Auto"` title. Google and social platforms see every listing as identical. Add:

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: car } = await supabase
    .from('cars').select('title,description,hero_image_url,year,make,model,price')
    .eq('slug', slug).eq('status', 'published').single();
  if (!car) return { title: 'Vehicle not found' };
  return {
    title: `${car.title} | J&F Auto`,
    description: car.description?.slice(0, 155) ?? `${car.year} ${car.make} ${car.model} for sale at J&F Auto`,
    openGraph: { images: car.hero_image_url ? [car.hero_image_url] : [], type: 'website' },
    alternates: { canonical: `/cars/${slug}` },
  };
}
```

---

### H3. No structured data (JSON-LD)
A local auto dealer without `LocalBusiness` + `AutoDealer` + `Vehicle` schema is invisible to Google's rich results. Add:

- `AutoDealer` + `LocalBusiness` on `app/page.tsx` (name, address, geo, phone, openingHoursSpecification, url).
- `Vehicle` on `app/cars/[slug]/page.tsx` (name, VIN if available, brand, model, modelDate, mileageFromOdometer, vehicleTransmission, fuelType, offers → Offer with price/priceCurrency/availability).

Reference: schema.org/AutoDealer, schema.org/Vehicle.

---

### H4. No `sitemap.xml` or `robots.txt`
Create `app/sitemap.ts`:
```ts
import { createClient } from '@/lib/supabase/server';

export default async function sitemap() {
  const supabase = await createClient();
  const { data: cars } = await supabase.from('cars').select('slug, updated_at').eq('status', 'published');
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jandfauto.com';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/inventory`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/contact`, lastModified: new Date(), priority: 0.7 },
    ...(cars ?? []).map(c => ({
      url: `${base}/cars/${c.slug}`,
      lastModified: new Date(c.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
```
And `app/robots.ts`:
```ts
export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jandfauto.com';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/auth/', '/protected'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
```

---

### H5. Car slugs are UUIDs, not human-readable
**File:** `components/admin/car-form.tsx:39-56`

```ts
const generateUUID = () => crypto.randomUUID();
// ...
const slug = car ? car.slug : generateUUID();
```

Every car URL looks like `/cars/3c9f5e2a-....` — zero SEO keyword value, ugly in shares. Generate from title:
```ts
const slugify = (s: string) => s.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')
  .slice(0, 80);
const base = slugify(`${formData.year}-${formData.make}-${formData.model}-${formData.trim ?? ''}`);
const slug = `${base}-${crypto.randomUUID().slice(0, 6)}`;
```

---

### H6. Duplicated navigation across 4 pages (~240 lines)
**Files:** `app/page.tsx:36-92`, `app/inventory/page.tsx:95-159`, `app/cars/[slug]/page.tsx:43-95`, `app/contact/page.tsx:27-71`

The nav + logo + desktop links + mobile Sheet drawer are copy-pasted. Create a route group:

```
app/
  (public)/
    layout.tsx   ← shared Navbar + Footer
    page.tsx     ← home (move from app/page.tsx)
    inventory/page.tsx
    cars/[slug]/page.tsx
    contact/page.tsx
```

The footer only exists on the home page right now — inventory, car detail, and contact have no footer. Fixing the layout consolidates both.

---

### H7. OpenGraph image is a 512×512 square logo
**File:** `app/layout.tsx:22-36`

Social previews want 1200×630 landscape. Create an OG image route:
```ts
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function OG() { /* brand composition */ }
```
Or drop a static `app/opengraph-image.png` at 1200×630.

---

### H8. Lead form modal is not accessible
**File:** `components/lead-form-modal.tsx:94-207`

- Trigger is `<div onClick={...}>` — not focusable, no keyboard handler, no role.
- Modal is a hand-rolled `fixed inset-0` div — no focus trap, no ESC-to-close, no scroll lock, no `aria-modal`, no labelled heading connection, no return-focus-to-trigger.
- `@radix-ui/react-dialog` is **already installed** (see `package.json`) but not used.

**Fix:** Replace with Radix `Dialog.Root / Trigger / Content / Title / Description / Close`. This gets you focus management, ESC handling, and a11y attributes for free.

---

### H9. `@vercel/analytics` installed but never mounted
**Files:** `package.json:19`, `app/layout.tsx`

```ts
import { Analytics } from '@vercel/analytics/react';
// inside <body>:
<Analytics />
```
Either mount it or remove the dependency.

---

### H10. No rate limiting / bot protection on public lead insert
**Files:** `supabase/migrations/001_initial_schema.sql:183-186`, `components/lead-form-modal.tsx:52-62`

```sql
CREATE POLICY "Public can insert leads"
  ON leads FOR INSERT
  TO public
  WITH CHECK (true);
```

Any unauthenticated user can post unlimited leads. Forms are trivially scriptable. Options:

- **Cheapest:** Add a honeypot field + time-to-submit check. Filters ~90% of bots.
- **Stronger:** Cloudflare Turnstile or Vercel BotID in front of the insert.
- **Architectural:** Move lead insert through a Next.js Server Action with rate limiting (Upstash Redis + `@upstash/ratelimit`) and call Supabase with the anon key from the server.

Also: no server-side validation. `email` is only checked with HTML5 `type="email"` on the client.

---

## [MED] Medium findings

### M1. Image upload: 50MB cap, no compression, weak naming
**File:** `components/admin/image-upload.tsx:53-62`

- 50MB is ~10× what a car photo should be. Most phones produce 3–6MB JPEGs.
- No client-side resize/compression → Supabase egress costs and slow LCP on car detail.
- `${timestamp}-${filename}` is not collision-proof under concurrent uploads.
- Bucket has no `allowed_mime_types` or `file_size_limit` configured (check Supabase dashboard).
- Uses `key={index}` in the preview map (`image-upload.tsx:168`) — stale key anti-pattern.

**Fix:** Cap at 5MB, resize to ≤2000px on the client via `createImageBitmap` + OffscreenCanvas, use `crypto.randomUUID()` prefix, configure bucket-level limits.

---

### M2. Admin writes bypass any server-side validation
**Files:** `components/admin/car-form.tsx`, `components/admin/settings-form.tsx`, `components/admin/lead-status-update.tsx`

All admin CRUD is done directly from the browser with `createClient()` (anon key + user JWT) and relies entirely on RLS to gate it. This works for permissions but means:
- No server-side schema validation (Zod) before insert.
- Rich-text fields like `description` aren't sanitized. Currently rendered safely via `whitespace-pre-line`, but flag for the future if any admin ever introduces raw HTML rendering.
- No audit log of who-did-what (nothing tracks admin actions).

**Fix:** Move admin writes to Server Actions with Zod validation. Add an `audit_log` table.

---

### M3. `unstable_noStore` and settings fetch on every page are redundant
Every public page fetches `settings` separately. With #H1 fixed, you can extract a cached helper:
```ts
'use cache'
async function getSettings() {
  cacheTag('settings');
  const supabase = await createClient();
  const { data } = await supabase.from('settings').select('*').single();
  return data;
}
```
And call it from the shared layout so every page gets it once.

---

### M4. No `loading.tsx` or `error.tsx` anywhere
Zero route-level loading or error UI. Navigation appears frozen until the server responds; unhandled exceptions fall through to the default Next error page. Add at minimum:
- `app/(public)/inventory/loading.tsx` — skeleton grid
- `app/(public)/cars/[slug]/loading.tsx` — skeleton detail
- `app/error.tsx` — global error boundary
- `app/not-found.tsx` — branded 404 (currently only `app/cars/[slug]/not-found.tsx` exists)

---

### M5. Error messages leak raw Supabase errors to users
**Files:** `components/lead-form-modal.tsx:80`, `components/admin/car-form.tsx:94`, `components/admin/image-upload.tsx:101`

```ts
setError(err instanceof Error ? err.message : 'An error occurred');
```

`err.message` from Supabase can include table names, column names, and constraint details. Show a user-friendly message and log the real error server-side.

---

### M6. `proxy.ts` short-circuits entirely when env vars missing
**File:** `lib/supabase/proxy.ts:11-14`

```ts
if (!hasEnvVars) return supabaseResponse;
```

In production this silently disables all auth protection if the env vars fail to load. Should throw at build time or at worst log and return a 503.

---

### M7. `getCurrentProfile()` + `getCurrentUser()` both roundtrip
**File:** `app/admin/layout.tsx:17-18`, `lib/auth.ts`

```ts
const user = await getCurrentUser();
const profile = user ? await getCurrentProfile() : null;
```

Each call makes a separate `supabase.auth.getUser()` round trip, and `getCurrentProfile()` does its own `getUser()` again then queries `profiles`. That's three network hops per admin page load when one suffices. Combine into a single helper:
```ts
export async function getCurrentUserAndProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();
  return { user, profile };
}
```

---

### M8. `<Image fill>` with no `sizes` prop
**Files:** `app/page.tsx:142-147`, `app/inventory/page.tsx:183-188`, `components/admin/image-upload.tsx:171-176`

Without `sizes`, Next serves the largest-resolution variant regardless of viewport. Hurts LCP and mobile data. Add appropriate hints:
```tsx
<Image src={...} alt={car.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
```

---

### M9. Inventory filter form is duplicated (~200 lines)
**File:** `components/inventory-filters.tsx`

`FilterForm` is defined inline at line 71, used only for the mobile drawer. The desktop version at line 242 re-inlines the entire form with `-desktop` ID suffixes. Extract to a single shared subcomponent. Also: `useSearchParams` is imported but never read.

---

### M10. JSONB `hours_json` rendered via `Object.entries` — key order is unreliable
**File:** `app/page.tsx:215`, `app/contact/page.tsx:144`

JSONB in Postgres does not guarantee key ordering, and JS iterates insertion order as-stored. You may see `Wednesday` before `Monday`. Normalize to an ordered array:
```ts
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
{DAYS.map(d => hours?.[d] && (<Row key={d} day={d} time={hours[d]} />))}
```

---

### M11. Seeded settings still have placeholder values
**File:** `supabase/migrations/001_initial_schema.sql:248-259`

- Phone: `(614) 000-0000`
- Email: `info@jandfauto.com`
- Address: `Columbus, OH`

These will ship unless the dealer updates them on first run. Add a deploy-check or first-admin-login wizard.

---

## [LOW] Low / polish

- **L1.** Mix of `text-gray-*` / `bg-gray-*` raw palette with `text-muted-foreground` / `bg-muted` design tokens. Pick one (`app/page.tsx:198`, `app/page.tsx:206`, `components/lead-form-modal.tsx:109`).
- **L2.** No `export const viewport` in root layout. Next 15+ moved `viewport` / `themeColor` out of `metadata`.
- **L3.** `lib/supabase/client.ts` uses `process.env.NEXT_PUBLIC_SUPABASE_URL!` (non-null assertion) without a runtime check, unlike `server.ts` which validates and throws.
- **L4.** `lib/utils.ts:9-11` — `hasEnvVars` has a comment marking it as tutorial scaffolding. Remove and replace with startup validation.
- **L5.** Dev `.env.local` appears in the working tree. Confirm it's gitignored and no secrets leaked — run `git log --all --full-history -- .env.local` to check.
- **L6.** `components/admin/image-upload.tsx:173` uses `alt="Upload ${index + 1}"` — generic alt text. Use the car title or a caption.
- **L7.** `next.config.ts` hardcodes the Supabase storage hostname. Move to env var so preview/prod can point at different projects.
- **L8.** No `NEXT_PUBLIC_SITE_URL` env — `metadataBase` falls back to `http://localhost:3000` in non-Vercel environments.
- **L9.** Admin lead page doesn't appear to redact PII in logs if logging is ever added — not a current issue, but flag for observability rollout.
- **L10.** `app/cars/[slug]/not-found.tsx` exists but was not reviewed; verify it uses the shared public layout once #H6 is done.

---

## Quick-win priority order

If you only have time for a few fixes, do them in this order:

1. **B1** (profiles RLS) — critical, 5-minute SQL migration
2. **B2** (filter injection) — critical, ~10 lines
3. **B4** (disable public signup) — 2 clicks in Supabase dashboard + delete 7 files
4. **B3** (delete tutorial files) — safe bulk delete, shrinks bundle
5. **H6** (shared public layout) — unlocks further fixes and kills ~240 lines of duplication
6. **H2 + H4 + H5** (per-car metadata + sitemap + human slugs) — SEO trifecta for a listings site
7. **H8** (Radix Dialog for lead form) — accessibility + spam-resistance surface
8. **H1** (Cache Components) — biggest perf win, needs #H6 done first
9. **H10** (rate limiting) — before any real traffic

---

## Out of scope for this pass
Not audited in this iteration (pick up next pass):
- Admin `settings-form`, `cars-table`, `leads-table`, `profile-form`, `lead-status-update` internals
- `/admin/cars/new`, `/admin/cars/[id]`, `/admin/leads/[id]` server components
- `/auth/*` flow beyond noting its existence
- Tailwind config, design token coverage
- `tsconfig.json` strictness
- Bundle size measurement (`next build` output)
- Real browser Lighthouse / Core Web Vitals run
- Supabase dashboard config (RLS force on, JWT expiry, auth providers)

---

*Audit generated 2026-04-11. Findings anchored to file paths + line numbers for reproducibility.*

---

# Iteration 2 — extended audit

Adds findings from `/auth/confirm/route.ts`, `components/admin/car-form.tsx` (rest of file), and `components/admin/settings-form.tsx`. New blocking finding B5 is the headline — everything else is incremental.

## [BLOCK] New blocking finding

### B5. Open redirect + reflected error in `/auth/confirm` route handler
**File:** `app/auth/confirm/route.ts:10,21,24,29`

```ts
const next = searchParams.get("next") ?? "/";
// ...
if (!error) {
  redirect(next);                                   // <-- user-controlled target
} else {
  redirect(`/auth/error?error=${error?.message}`);  // <-- unsanitized interpolation
}
// ...
redirect(`/auth/error?error=No token hash or type`);
```

Two problems:

1. **Open redirect.** `next` comes straight from the query string. Crafting `/auth/confirm?token_hash=…&type=email&next=https://evil.example/phish` sends the user to `evil.example` immediately after Supabase confirms the OTP — i.e. right when they trust they've just logged in. Classic phishing laundering vector, and because the redirect happens on the real domain after real authentication, it beats email-link URL previewers.
2. **Reflected content in error path.** `error.message` from Supabase is dropped into the URL with no encoding. Supabase error messages are typically benign but (a) they're not encoded, so a message with `&` or `#` will corrupt the URL and (b) if `/auth/error` ever renders `error` as HTML (it currently doesn't, but the starter template has open paths), this becomes reflected XSS.

This file is Supabase-starter boilerplate and should either be removed entirely when `/auth/*` is consolidated (#B4), or hardened:

**Fix:**
```ts
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// Allowlist of safe internal paths
const SAFE_NEXT = new Set(["/", "/admin", "/admin/login"]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next") ?? "/";
  // Reject anything that isn't an internal allowlisted path
  const next = SAFE_NEXT.has(rawNext) ? rawNext : "/";

  if (!token_hash || !type) {
    redirect("/auth/error?error=missing_params");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    console.error("[auth/confirm] verifyOtp failed", error);
    redirect("/auth/error?error=verification_failed");
  }

  redirect(next);
}
```

Key moves: allowlist `next`, return generic error codes to the client, log the real error server-side, remove the redundant trailing `redirect(...)` by short-circuiting up top. If you delete `/auth/*` per #B4, this all goes away.

---

## [MED] New medium findings

### M12. `as any` escape hatches in admin forms
**Files:** `components/admin/car-form.tsx:213`, `components/admin/settings-form.tsx` (update payload)

```tsx
// car-form.tsx:213
<select
  value={formData.status}
  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
>
```

`formData.status` is typed against the DB enum but the raw `<select>` `change` handler widens to `string`, so the author silenced it with `as any`. Same pattern appears in `settings-form` when building the update payload. Each `as any` is a future footgun — if someone adds a new `CarStatus` value, the select options and the type drift silently.

**Fix:** Narrow explicitly:
```tsx
onChange={(e) => {
  const v = e.target.value;
  if (v === 'draft' || v === 'published' || v === 'sold') {
    setFormData({ ...formData, status: v });
  }
}}
```
Or define `const CAR_STATUSES = ['draft','published','sold'] as const` and iterate it for both `<option>` rendering and type narrowing.

---

### M13. `settings-form` flattens `hours_json` into 7 string fields then reassembles
**File:** `components/admin/settings-form.tsx:45-51,63-71`

```ts
hours_monday: (settings.hours_json as Record<string, string>)?.monday || '',
hours_tuesday: (settings.hours_json as Record<string, string>)?.tuesday || '',
// … 5 more
```

```ts
const hours_json = {
  monday: formData.hours_monday,
  tuesday: formData.hours_tuesday,
  // … 5 more
};
```

Two sources of truth for the same data, and every new field (e.g. holiday hours) requires edits in five places (type, initial state, JSX, submit payload, render). Compounds with #M10 (JSONB key-order issue) because this is the exact path that writes those keys.

**Fix:** Keep state shape the same as DB shape.
```ts
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
type Day = typeof DAYS[number];

const [hours, setHours] = useState<Record<Day, string>>(() => {
  const src = (settings.hours_json ?? {}) as Partial<Record<Day, string>>;
  return Object.fromEntries(DAYS.map(d => [d, src[d] ?? ''])) as Record<Day, string>;
});
// on submit: .update({ ..., hours_json: hours })
// in JSX: {DAYS.map(d => <DayRow key={d} day={d} value={hours[d]} onChange={…} />)}
```

---

### M14. `car-form` `description` has no max length or rendering contract
**File:** `components/admin/car-form.tsx:251-256`

```tsx
<textarea
  className="… min-h-[200px] …"
  value={formData.description}
  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
/>
```

No `maxLength`, no character counter, no markdown vs plain-text decision documented. The render side (`app/cars/[slug]/page.tsx`) uses `whitespace-pre-line` which is fine today, but nothing stops an admin from pasting 50KB of marketing copy that blows up the page weight and LCP. Settings `about_text` has the same issue.

**Fix:** Add `maxLength={4000}` + a live counter. Store long-form content in a dedicated table if marketing pages are ever needed.

---

### M15. Admin forms lose work silently on accidental navigation
**Files:** `components/admin/car-form.tsx`, `components/admin/settings-form.tsx`

No `beforeunload` handler, no `router.events` guard, no dirty-state tracking. A stray back-button press or accidental Cmd-W after 10 minutes of data entry vaporizes the form. Not a security issue but an admin-UX papercut that will bite the first time a staffer is entering a long description.

**Fix (minimal):**
```ts
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (isDirty) { e.preventDefault(); e.returnValue = ''; }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [isDirty]);
```
Where `isDirty` is a simple `JSON.stringify(formData) !== JSON.stringify(initialData)` memo.

---

### M16. `settings-form` success banner uses `setTimeout`, not state driven
**File:** `components/admin/settings-form.tsx:91-92`

```ts
setSuccess(true);
setTimeout(() => setSuccess(false), 3000);
```

If the component unmounts inside the 3s window (navigation, logout) the timer fires on a dead component. React will ignore the state update in practice but this still produces console warnings in strict mode, and it's the wrong primitive. Use an effect with a cleanup:

```ts
useEffect(() => {
  if (!success) return;
  const t = setTimeout(() => setSuccess(false), 3000);
  return () => clearTimeout(t);
}, [success]);
```

Same pattern likely appears in other admin components — grep for `setTimeout` in `components/admin/`.

---

## [LOW] New low findings

- **L11.** `app/auth/confirm/route.ts:9` — `type` is cast `as EmailOtpType | null` without validating it's one of the allowed string literals. Supabase will reject junk at runtime but explicit validation is clearer.
- **L12.** `car-form.tsx` and `settings-form.tsx` use `setError(err instanceof Error ? err.message : 'An error occurred')` — same pattern as #M5. Consolidate into a `formatError(err)` helper.
- **L13.** `settings-form.tsx:101` — form uses `space-y-6` with nested `Card` components; the `Card` already has internal padding, causing inconsistent gaps vs `car-form` which uses the same pattern. Minor visual drift.
- **L14.** `car-form.tsx:117` — double blank line between two JSX blocks; no functional issue but flags that there's no Prettier config enforcing a style.

---

## Updated quick-win order

Insert **B5** between B2 and B4:

1. **B1** (profiles RLS)
2. **B2** (filter injection)
3. **B5** (open redirect + reflected error) — ~10 lines, high phishing risk
4. **B4** (disable public signup, delete /auth/*)
5. **B3** (delete tutorial files)
6. **H6 → H2/H4/H5 → H8 → H1 → H10** (unchanged from iteration 1)

Note that fixing **B4** (deleting `/auth/*`) also deletes the file behind **B5**, so if you go straight to B4 you can skip B5. If you're keeping `/auth/confirm` for OTP magic-links, B5 is mandatory.

---

## Still out of scope
Same buckets as iteration 1, minus what was covered here. Remaining unaudited:
- `components/admin/cars-table.tsx`, `leads-table.tsx`, `profile-form.tsx`, `lead-status-update.tsx`
- `app/admin/cars/new/page.tsx`, `app/admin/cars/[id]/page.tsx`, `app/admin/leads/[id]/page.tsx`, `app/admin/page.tsx`
- `/auth/login`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/update-password`, `/auth/error`, `/auth/sign-up-success` internals
- `tsconfig.json` strictness, `eslint.config.mjs`, `tailwind.config.ts`, `components.json`
- Actual `next build` bundle measurement, Lighthouse run, Supabase dashboard review

---

*Iteration 2 appended 2026-04-11. New findings: 1 blocking (B5), 5 medium (M12–M16), 4 low (L11–L14). Running totals: 5 [BLOCK] · 10 [HIGH] · 16 [MED] · 14 [LOW] = 45 findings.*
