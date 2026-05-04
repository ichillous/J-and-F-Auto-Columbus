# S3 access policy for car imagery

**Decision (2026-04-23):** Option A — public-read on the `cars/*` prefix of the
production bucket. All other prefixes stay private.

## Why

The app is a single-dealership storefront. Car photos are inherently public
(they are the product being advertised). Option A is the simplest path that
keeps the existing app code working: `presignUpload()` returns a `publicUrl`
that the `<Image>` component fetches directly via `/_next/image`, and the
Image Optimizer needs that URL to be publicly readable.

Options considered:

- **A. Public-read on `cars/*`** *(chosen)* — zero app changes, objects under
  other prefixes remain private.
- **B. CloudFront + Origin Access Control (OAC)** — better bandwidth cost and
  log isolation, but requires creating a distribution, configuring OAC, and
  pointing `JFAUTO_S3_PUBLIC_BASE_URL` at the CloudFront domain. Revisit if
  bandwidth costs or cache-hit ratio matter.
- **C. Signed-GET at render time** — highest security posture, but every
  component that renders a car image must be refactored to fetch a signed URL
  server-side. Disproportionate work for a public-product use case.

## What the bucket requires

The production bucket currently has all four Public Access Block flags ON
and no bucket policy attached. To apply Option A:

1. Turn off `BlockPublicPolicy` and `RestrictPublicBuckets`. Keep
   `BlockPublicAcls` and `IgnorePublicAcls` ON (the app uses bucket policy,
   not ACLs).
2. Attach the policy in `infra/s3-bucket-policy.json` (substitute the actual
   bucket name for `BUCKET_NAME`).

See `infra/README.md` for the exact AWS CLI commands.

## Post-apply verification

```bash
# Upload a probe via the admin UI (or curl a presigned PUT), then:
curl -sI "https://<bucket>.s3.us-east-2.amazonaws.com/cars/temp/<probe>.jpg" | head -1
# Expect: HTTP/1.1 200 OK
```

If 403: the block settings didn't change, or the policy didn't attach, or the
object key is outside `cars/*`.

## Rollback

```bash
aws s3api delete-bucket-policy --bucket "$BUCKET"
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```
