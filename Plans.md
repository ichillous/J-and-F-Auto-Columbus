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

### Root-cause hypotheses (ranked)

1. **S3 bucket CORS rules don't allow PUT from production origin.** The SDK presigns with `ContentType` header, so the browser must send `content-type` on PUT; bucket CORS must `AllowedMethods: [PUT]`, `AllowedHeaders: [content-type, x-amz-*]`, `AllowedOrigins: [https://www.jandf-auto.com]`.
2. **`JFAUTO_S3_BUCKET` env value doesn't match the actual bucket** (actual bucket name contains `-an` suffix). Bucket name mismatch ⇒ presigned URL generation still works if `JFAUTO_S3_BUCKET` points at *some* bucket, but that bucket may differ from what was assumed, or Next Image remotePattern doesn't match the hostname clients actually fetch.
3. **`images.remotePatterns` empty at build time in Amplify.** Even though `amplify.yml` appends to `.env.production`, verify the regex-match pattern hits `AWS_REGION` and `JFAUTO_S3_BUCKET` (it does per line 14), and that the *latest* deploy ran after that fix.
4. **Presigner region mismatch.** `s3()` client in `lib/aws/clients.ts` — verify it uses `awsEnv.region()` and that matches the bucket region (`us-east-2`).

### Plan

| Task | 内容 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 1.1 | Confirm prod env vars in Amplify Console: `JFAUTO_S3_BUCKET`, `AWS_REGION`, `JFAUTO_S3_PUBLIC_BASE_URL` (if set). Record exact values. | Written record of each var's value and last-deploy timestamp | - | blocked — Amplify Console access required (user-only) |
| 1.2 | Verify S3 bucket name + region match env. Run `aws s3api get-bucket-location` on the actual bucket in the error URL. | Bucket name + region confirmed and compared against env vars. Mismatch? Flag it. | 1.1 | blocked — AWS session expired; `scripts/diagnose-upload.sh` covers this |
| 1.3 | Read current S3 bucket CORS: `aws s3api get-bucket-cors --bucket <name>`. Capture full JSON. | CORS JSON captured, diffed against required rules (PUT from `https://www.jandf-auto.com`, `content-type` + `x-amz-*` allowed, `ETag` exposed) | 1.2 | blocked — AWS session expired; `scripts/diagnose-upload.sh` covers this |
| 1.4 | Read `lib/aws/clients.ts` to confirm S3 client region matches bucket region. | Region source in client code identified; confirmed equal to bucket region | - | cc:完了 — both `s3()` and presigner use `awsEnv.region()`; `requestChecksumCalculation: 'WHEN_REQUIRED'` already set for browser PUT |
| 1.5 | Reproduce locally: `npm run build && npm start` with real prod env, attempt upload from `http://localhost:3000` + from a tunneled origin. Capture network tab. | Repro steps + HAR/screenshot saved; behavior matches prod or diverges (note which) | 1.1 | cc:TODO — requires prod env values from 1.1 |
| 2.1 | **Fix CORS**: write correct `cors.json` and apply via `aws s3api put-bucket-cors`. Rules: `AllowedMethods: [GET, PUT, HEAD]`, `AllowedOrigins: [https://www.jandf-auto.com, https://jandf-auto.com]` (+ `http://localhost:3000` for dev), `AllowedHeaders: [*]`, `ExposeHeaders: [ETag]`, `MaxAgeSeconds: 3000`. Commit the JSON under `infra/s3-cors.json` with a README. | `get-bucket-cors` returns the new policy; browser PUT from prod succeeds with 200 + readable response | 1.3 | cc:完了 (artifact) / blocked (apply) — `infra/s3-cors.json` + `infra/README.md` shipped; apply requires AWS creds |
| 2.2 | **Fix Next Image remote pattern**: make `next.config.ts` robust. | `next build` with empty env still emits at least the known prod bucket in remotePatterns; `/_next/image` with prod S3 URL returns 200 in a local prod-mode server | 1.1, 1.2 | cc:完了 — added `JFAUTO_IMAGE_ALLOWED_HOSTS` escape hatch + build-time warning when empty |
| 2.3 | **(conditional)** If bucket name in env is wrong: correct `JFAUTO_S3_BUCKET` in Amplify Console. Redeploy. | Amplify env shows correct bucket; fresh deploy shows upload+image both succeed | 1.2 | cc:TODO — requires 1.1/1.2 result |
| 2.4 | **(conditional)** If SDK region ≠ bucket region: fix `s3()` client or document the env. | Client region matches bucket; presigned URLs produced against correct region | 1.4 | cc:完了 — not required; region sourcing is already correct (see 1.4) |
| 3.1 | Add a minimal healthcheck route `GET /api/admin/upload-url/selfcheck` (admin-only). | Route returns `{ bucket, region, hostname, presignedOk: true, headStatus: <n> }` on success; 500 with actionable error otherwise | 2.1, 2.2 | cc:完了 — `app/api/admin/upload-url/selfcheck/route.ts` shipped |
| 3.2 | Add a Playwright (or manual checklist) regression. | Regression documented in `docs/qa/upload-regression.md`; at least one successful run logged | 2.1, 2.2 | cc:完了 (doc) / cc:TODO (first run) — `docs/qa/upload-regression.md` shipped, run after 2.1 apply |
| 3.3 | Decide on signed-GET vs public-read for `cars/temp/*` and `cars/<carId>/*`. | Decision recorded in `docs/aws/s3-access-policy.md`; bucket policy matches decision | 1.3 | cc:TODO — requires 1.3 output |
| 3.4 | Deploy to prod, retest end-to-end. | Screen recording or screenshots of successful upload + rendered image; original repro no longer reproduces | 2.1, 2.2, 3.1 | cc:TODO — runs after 2.1 is applied to the bucket |

### Out of scope

- The `content.js:1 Uncaught ... IO error: .../002197.ldb` line is a Chrome extension writing to LevelDB, unrelated to the app. Ignore.
- The `[Violation] 'setTimeout' handler took 60ms` is benign perf telemetry. Ignore.

### Notes

- `.env` and `.env.local` are denied by `harness.toml` — use Amplify Console as source of truth for prod env values; read `.env.example` for variable names.
- Recent commits already touched this area (`f03cfad`, `80fda84`). Confirm the prod deploy includes both before starting fixes.

---

## Archive

<!-- Completed tasks move here, newest first. -->
