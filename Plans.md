# Plans

Active tasks for the jandfauto project. Add entries as `## <task-id>: <title>`
with a short description and acceptance criteria. Move completed items to the
Archive section at the bottom.

## Active

---

## UPLOAD-AUDIT: Admin image upload — full audit & fix

作成日: 2026-04-23
Owner: @ichillous

### Context

Production admin image upload fails in two places:

1. **S3 PUT fails in browser** after `POST /api/admin/upload-url` returns 200. Network tab shows the preflight (OPTIONS) returning 200 but the actual `PUT` logs "Fetch failed loading" — i.e., CORS on the actual method, not the preflight.
2. **`/_next/image?url=<s3-url>` returns 403** — Next Image Optimizer rejects the S3 hostname, meaning `images.remotePatterns` in `next.config.ts` is empty (or doesn't include the bucket) at the deployed build.

**Production URLs observed:**

- Bucket host: `jfauto-s3-bucket-916218008823-us-east-2-an.s3.us-east-2.amazonaws.com`
- Site origin: `https://www.jandf-auto.com`
- Upload key prefix: `cars/temp/<timestamp>-<safe-name>`

**Relevant code paths:**

- `app/api/admin/upload-url/route.ts` — presign endpoint (POST, nodejs runtime, role-gated)
- `lib/aws/s3.ts:presignUpload` — PutObjectCommand, `expiresIn: 300`, 50MB cap, types whitelist
- `lib/aws/env.ts:awsEnv.s3PublicBaseUrl` — derives public URL from `JFAUTO_S3_PUBLIC_BASE_URL` or `${bucket}.s3.${region}.amazonaws.com`
- `next.config.ts` — builds `images.remotePatterns` from same env vars **at build time**
- `components/admin/image-upload.tsx` — client uses `fetch(uploadUrl, { method: 'PUT' })` with `content-type` header
- `amplify.yml` — writes env to `.env.production` pre-build (recent fix: `80fda84`)

### Root-cause (confirmed 2026-04-23 via `scripts/diagnose-upload.sh`)

**Primary: bucket is fully private.** All four Public Access Block flags are
ON (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`,
`RestrictPublicBuckets`) and no bucket policy is attached. The app returns
the object's `publicUrl`, the `<Image>` component asks `/_next/image` to
fetch it, and the Image Optimizer forwards S3's 403 straight through.

**Ruled out:**

- ~~CORS misconfigured~~ — existing CORS is correct: `AllowedMethods: [PUT, GET, HEAD]`, origin `https://www.jandf-auto.com` listed, `ExposeHeaders: [ETag]`.
- ~~Region mismatch~~ — bucket is in `us-east-2`; env `AWS_REGION=us-east-2`; `s3()` client and presigner both use `awsEnv.region()`.
- ~~Bucket name wrong in env~~ — `JFAUTO_S3_BUCKET` resolves to the reachable bucket in the error URL.

**Still open:** the console-reported "Fetch failed loading" for the PUT
request despite network tab showing 200. File uploads successfully server-side. May be cosmetic or may be a secondary CORS response-header issue that only surfaces after the bucket policy fix lets us re-test cleanly.

### Plan

| Task | 内容 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 1.1 | Confirm prod env vars in Amplify Console: `JFAUTO_S3_BUCKET`, `AWS_REGION`, `JFAUTO_S3_PUBLIC_BASE_URL` (if set). | Written record of each var's value. | - | cc:完了 — bucket name resolves correctly via CLI; `AWS_REGION=us-east-2` matches bucket. |
| 1.2 | Verify S3 bucket name + region match env. | Bucket name + region confirmed; mismatch flagged. | 1.1 | cc:完了 — `diagnose-upload.sh` confirmed bucket region matches env. |
| 1.3 | Read current S3 bucket CORS; diff against required rules. | CORS JSON captured and assessed. | 1.2 | cc:完了 — CORS is already correct (PUT from `www.jandf-auto.com`, ETag exposed). |
| 1.4 | Read `lib/aws/clients.ts` to confirm S3 client region sourcing. | Region source in client code identified. | - | cc:完了 — uses `awsEnv.region()`; `requestChecksumCalculation: 'WHEN_REQUIRED'` set. |
| 1.5 | Reproduce locally with real prod env. | Repro steps documented. | 1.1 | cc:TODO — optional; primary fix (2.1b) doesn't require local repro. |
| 2.1a | **CORS artifact (reference only)**: ship `infra/s3-cors.json` as a baseline for future CORS extensions. | File committed with apply/verify commands. | - | cc:完了 — shipped but not applied (existing CORS is already correct). |
| 2.1b | **Bucket policy (primary fix)**: ship `infra/s3-bucket-policy.json` granting `s3:GetObject` on `cars/*` + update Public Access Block to allow policy-based public access. | Artifact ready; apply requires `aws s3api put-public-access-block` + `put-bucket-policy`. | 1.3, 3.3 | cc:完了 (artifact) / blocked (apply — USER) |
| 2.2 | **Fix Next Image remote pattern**: make `next.config.ts` robust. | Build warns when remotePatterns empty; `JFAUTO_IMAGE_ALLOWED_HOSTS` escape hatch added. | 1.1, 1.2 | cc:完了 — shipped. |
| 2.3 | **(conditional)** Correct `JFAUTO_S3_BUCKET` in Amplify Console if wrong. | Amplify env matches reality. | 1.2 | cc:完了 — not required; bucket name is correct. |
| 2.4 | **(conditional)** Fix S3 client region if mismatched. | Region consistent. | 1.4 | cc:完了 — not required. |
| 3.1 | Admin-only `GET /api/admin/upload-url/selfcheck`. | Route returns region/bucket/HeadBucket/presign diagnostics. | 2.1a, 2.2 | cc:完了 — shipped. |
| 3.2 | Manual regression checklist. | Checklist documented; first run after 2.1b apply. | 2.1b, 2.2 | cc:完了 (doc) / cc:TODO (first run — USER, after 2.1b) |
| 3.3 | Decide signed-GET vs public-read for `cars/*`. | Decision recorded in `docs/aws/s3-access-policy.md`. | 1.3 | cc:完了 — Option A (public-read on `cars/*`) documented. |
| 3.4 | Deploy-side retest end-to-end. | Upload works; thumbnail renders; `/_next/image` returns 200. | 2.1b, 3.1 | cc:TODO — USER, after 2.1b apply. |

### Out of scope

- The `content.js:1 Uncaught ... IO error: .../002197.ldb` line is a Chrome extension writing to LevelDB, unrelated to the app. Ignore.
- The `[Violation] 'setTimeout' handler took 60ms` is benign perf telemetry. Ignore.

### Notes

- `.env` and `.env.local` are denied by `harness.toml` — use Amplify Console as source of truth for prod env values; read `.env.example` for variable names.
- Recent commits already touched this area (`f03cfad`, `80fda84`). Confirm the prod deploy includes both before starting fixes.

---

## Archive

<!-- Completed tasks move here, newest first. -->
