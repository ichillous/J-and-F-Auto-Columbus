# Admin image upload — regression checklist

Manual (or Playwright) regression for the admin image upload pipeline.
Source of truth for "the upload feature works end-to-end."

Run this any time you change:
- `app/api/admin/upload-url/**`
- `lib/aws/s3.ts`, `lib/aws/clients.ts`, `lib/aws/env.ts`
- `components/admin/image-upload.tsx`
- `next.config.ts` (images section)
- S3 bucket CORS or bucket policy
- Amplify Console env vars: `JFAUTO_S3_BUCKET`, `AWS_REGION`, `JFAUTO_S3_PUBLIC_BASE_URL`, `JFAUTO_IMAGE_ALLOWED_HOSTS`

## Prereqs

- Admin credentials for the target environment
- Browser with devtools open (Network tab filter: `upload-url`, `amazonaws`, `_next/image`)
- A real JPEG/PNG/WebP under 50MB (production photos from the cars folder work)

## Steps

### 1. Environment self-check

Sign in to `/admin` and hit:

```
GET /api/admin/upload-url/selfcheck
```

Expected `200` with:

```json
{
  "region": "us-east-2",
  "bucket": "<expected bucket>",
  "publicBaseUrl": "https://<bucket>.s3.us-east-2.amazonaws.com",
  "headBucket": "ok",
  "presignOk": true,
  "presignHost": "<bucket>.s3.us-east-2.amazonaws.com",
  "error": null
}
```

If `headBucket` is null or `error` is set — stop. Fix env / bucket access before proceeding.

### 2. Upload flow

1. Go to `/admin/cars/new` (or edit an existing draft).
2. Click **Upload Image** (or **Upload Images** for the gallery field).
3. Select one JPEG under 5MB.
4. In Network tab, confirm:
   - `POST /api/admin/upload-url` → `200`
   - `OPTIONS <s3 url>` (preflight) → `200`
   - `PUT <s3 url>` → `200` **and** `Access-Control-Allow-Origin` response header present
5. In the UI, the thumbnail appears without the red "Upload failed" message.
6. In Network tab, confirm `GET /_next/image?url=<s3 url>&w=...` → `200` (not `403`).

### 3. Public accessibility of uploaded object

```bash
curl -sI "<publicUrl from presign response>" | head -1
```

Expected behavior depends on the access-policy decision in `docs/aws/s3-access-policy.md`:
- If **public-read**: `HTTP/2 200`
- If **signed-GET**: `HTTP/2 403` (and the app must use signed URLs to display)

### 4. Cleanup

Delete the test upload via the admin UI or:

```bash
aws s3 rm "s3://<bucket>/cars/temp/<filename>"
```

## Known-bad signals

| Signal | Likely cause |
|---|---|
| `POST /api/admin/upload-url` → `401` | Admin session expired — sign in again. |
| `POST /api/admin/upload-url` → `400` with `Unsupported content type` | File isn't JPEG/PNG/WebP. |
| `PUT` returns `200` but console says "Fetch failed loading" | CORS response headers missing. Reapply `infra/s3-cors.json`. |
| `PUT` returns `403 AccessDenied` | IAM role lacks `s3:PutObject` on the bucket. |
| `PUT` returns `403 SignatureDoesNotMatch` | Region mismatch between presigner and bucket, or env `AWS_REGION` wrong. |
| `/_next/image` returns `403` | `images.remotePatterns` in `next.config.ts` doesn't include the bucket host. Set `JFAUTO_IMAGE_ALLOWED_HOSTS` and redeploy. |
| Thumbnail is a broken-image icon | Bucket is private but app is trying to use `publicUrl` directly. See `docs/aws/s3-access-policy.md`. |
