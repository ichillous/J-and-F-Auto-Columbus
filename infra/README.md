# Infra artifacts

Files applied out-of-band (not during `next build` or `npm install`).

## `s3-bucket-policy.json` — public-read on `cars/*` *(primary fix)*

**Why:** `/_next/image` returns 403 because the production bucket is fully
private (all four Public Access Block flags ON, no bucket policy). The app
serves car photos that are meant to be publicly browsable — see
`docs/aws/s3-access-policy.md` for the Option A / B / C tradeoff.

### Apply

```bash
# bucket name comes from Amplify Console (JFAUTO_S3_BUCKET)
BUCKET=<actual bucket>

# 1. Allow policy-based public access (keep ACL flags ON)
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false

# 2. Render BUCKET_NAME into the policy and attach
sed "s/BUCKET_NAME/$BUCKET/g" infra/s3-bucket-policy.json > /tmp/jfauto-bucket-policy.json
aws s3api put-bucket-policy --bucket "$BUCKET" \
  --policy file:///tmp/jfauto-bucket-policy.json
```

### Verify

```bash
aws s3api get-bucket-policy --bucket "$BUCKET" --query Policy --output text | jq
# Upload a probe through the admin UI, then:
curl -sI "https://$BUCKET.s3.us-east-2.amazonaws.com/cars/temp/<probe>.jpg" | head -1
# Expect: HTTP/1.1 200 OK
```

### Rollback — see `docs/aws/s3-access-policy.md`

## `s3-cors.json` — bucket CORS *(reference only; existing CORS verified OK 2026-04-23)*

The production bucket already has correct CORS rules (PUT from
`https://www.jandf-auto.com`, `ExposeHeaders: [ETag]`, etc.). This file is
kept as a reference baseline in case CORS is ever reset or extended to new
origins (e.g. adding Amplify preview subdomains).

### Apply (only if needed)

```bash
BUCKET=<actual bucket>
aws s3api put-bucket-cors \
  --bucket "$BUCKET" \
  --cors-configuration file://infra/s3-cors.json
```

## `next/image` allowlist

If `/_next/image?url=<s3 url>` returns `403`, first confirm the bucket
policy above is applied — the Image Optimizer fetches the S3 URL
server-side and forwards whatever status S3 returns. Only after confirming
the bucket grants `s3:GetObject` should you check `images.remotePatterns`:

1. Set `JFAUTO_S3_BUCKET` and `AWS_REGION` correctly in the Amplify Console
   so `next.config.ts` derives the right host. This is the canonical path.
2. Set `JFAUTO_IMAGE_ALLOWED_HOSTS` (comma-separated hostnames or URLs) as
   an escape hatch. Example:
   `JFAUTO_IMAGE_ALLOWED_HOSTS=jfauto-s3-bucket-123456789012-us-east-2-an.s3.us-east-2.amazonaws.com`
3. Set `JFAUTO_S3_PUBLIC_BASE_URL` if images are fronted by CloudFront.

`next.config.ts` logs a build-time warning if no hosts are configured.
