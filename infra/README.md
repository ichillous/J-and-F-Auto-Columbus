# Infra artifacts

Files applied out-of-band (not during `next build` or `npm install`).

## `s3-cors.json` — bucket CORS for admin image uploads

Admin image upload PUTs from the browser need the S3 bucket CORS to
return `Access-Control-Allow-Origin` on the *actual* PUT response,
not just the preflight. If the preflight succeeds but the PUT response
is missing the ACAO header, the browser silently blocks the response
from JS and `fetch()` rejects — even though the object uploaded fine.

### Apply

```bash
# bucket name comes from Amplify Console (JFAUTO_S3_BUCKET)
BUCKET=<actual bucket>
aws s3api put-bucket-cors \
  --bucket "$BUCKET" \
  --cors-configuration file://infra/s3-cors.json
```

### Verify

```bash
aws s3api get-bucket-cors --bucket "$BUCKET"
```

Output should match `infra/s3-cors.json`. After applying, trigger the
`GET /api/admin/upload-url/selfcheck` endpoint (admin-only) and retry
an upload from `https://www.jandf-auto.com/admin`.

### Origin list

- `https://www.jandf-auto.com` — production canonical
- `https://jandf-auto.com` — apex (in case of redirect scenarios)
- `http://localhost:3000` — local dev against the prod bucket

Add Amplify preview subdomains here if/when preview deploys use the
same bucket.

## `next/image` allowlist

If `/_next/image?url=<s3 url>` returns `403`, the bucket hostname isn't in
`images.remotePatterns` at build time. Fix options:

1. Set `JFAUTO_S3_BUCKET` and `AWS_REGION` correctly in the Amplify Console
   so `next.config.ts` derives the right host. This is the canonical path.
2. Set `JFAUTO_IMAGE_ALLOWED_HOSTS` (comma-separated hostnames or URLs) as
   an escape hatch. Example:
   `JFAUTO_IMAGE_ALLOWED_HOSTS=jfauto-s3-bucket-123456789012-us-east-2-an.s3.us-east-2.amazonaws.com`
3. Set `JFAUTO_S3_PUBLIC_BASE_URL` if images are fronted by CloudFront.

`next.config.ts` logs a build-time warning if no hosts are configured.
