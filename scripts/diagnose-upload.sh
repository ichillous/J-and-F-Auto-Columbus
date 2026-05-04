#!/usr/bin/env bash
# Read-only diagnostics for the admin image upload pipeline.
#
# Covers Plans.md UPLOAD-AUDIT tasks 1.2, 1.3. Reports:
#   - JFAUTO_S3_BUCKET value vs bucket-reachable-via-AWS
#   - Bucket region vs AWS_REGION env
#   - Current CORS configuration (or absence)
#   - Whether the required CORS rules from infra/s3-cors.json are in place
#
# Usage:
#   AWS_PROFILE=jfauto JFAUTO_S3_BUCKET=<name> AWS_REGION=us-east-2 \
#     ./scripts/diagnose-upload.sh
#
# Requires AWS CLI v2 with s3:GetBucket* permissions on the target bucket.

set -uo pipefail

log()  { printf "\033[36m[diagnose]\033[0m %s\n" "$*"; }
ok()   { printf "\033[32m[ ok ]\033[0m %s\n" "$*"; }
warn() { printf "\033[33m[warn]\033[0m %s\n" "$*" >&2; }
fail() { printf "\033[31m[fail]\033[0m %s\n" "$*" >&2; }

command -v aws >/dev/null 2>&1 || { fail "AWS CLI not found. Install AWS CLI v2."; exit 1; }

BUCKET="${JFAUTO_S3_BUCKET:-}"
REGION="${AWS_REGION:-us-east-2}"

if [ -z "$BUCKET" ]; then
  fail "JFAUTO_S3_BUCKET is unset. Export it (same value as in Amplify Console) and retry."
  exit 1
fi

log "Bucket:  $BUCKET"
log "Region:  $REGION (env)"
echo

# 1. Identity check
if ! aws sts get-caller-identity --no-cli-pager >/dev/null 2>&1; then
  fail "AWS session invalid. Run 'aws login' (or 'aws sso login --profile ...') and retry."
  exit 1
fi
ok "AWS credentials are valid."

# 2. Bucket location
LOCATION_RAW=$(aws s3api get-bucket-location --bucket "$BUCKET" --no-cli-pager --output text 2>&1 || true)
if printf '%s' "$LOCATION_RAW" | grep -qi 'NoSuchBucket\|AccessDenied'; then
  fail "get-bucket-location failed: $LOCATION_RAW"
  exit 1
fi
# AWS returns "None" for us-east-1 legacy buckets
ACTUAL_REGION="$LOCATION_RAW"
[ "$ACTUAL_REGION" = "None" ] && ACTUAL_REGION="us-east-1"
if [ "$ACTUAL_REGION" = "$REGION" ]; then
  ok "Bucket region matches AWS_REGION ($ACTUAL_REGION)."
else
  fail "Region mismatch: bucket is in $ACTUAL_REGION, env AWS_REGION=$REGION."
  fail "  -> Fix Amplify Console AWS_REGION or move/recreate the bucket."
fi
echo

# 3. Current CORS
log "Current CORS configuration:"
CORS_OUT=$(aws s3api get-bucket-cors --bucket "$BUCKET" --no-cli-pager 2>&1 || true)
if printf '%s' "$CORS_OUT" | grep -q 'NoSuchCORSConfiguration'; then
  warn "No CORS configuration on bucket. Browser PUTs will fail."
  warn "  -> Apply infra/s3-cors.json (see infra/README.md)."
else
  printf '%s\n' "$CORS_OUT"
  # Cheap sanity check for PUT + www.jandf-auto.com
  if printf '%s' "$CORS_OUT" | grep -q '"PUT"' && \
     printf '%s' "$CORS_OUT" | grep -q 'jandf-auto.com'; then
    ok "CORS appears to allow PUT from jandf-auto.com."
    warn "  Verify ExposeHeaders includes 'ETag' and AllowedHeaders covers 'content-type'."
  else
    fail "CORS does not look right (missing PUT or jandf-auto.com origin)."
    fail "  -> Apply infra/s3-cors.json (see infra/README.md)."
  fi
fi
echo

# 4. Public access (informational)
log "Public access block configuration:"
aws s3api get-public-access-block --bucket "$BUCKET" --no-cli-pager 2>&1 || true
echo
log "Bucket policy (may be absent):"
aws s3api get-bucket-policy --bucket "$BUCKET" --no-cli-pager 2>&1 || true
echo

log "Done."
