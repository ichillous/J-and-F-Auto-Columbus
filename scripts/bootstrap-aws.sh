#!/usr/bin/env bash
# Bootstrap the J&F Auto AWS data plane in one go.
#
# Creates:
#   - DynamoDB table  jfauto-cars      (PK: id)
#   - DynamoDB table  jfauto-leads     (PK: id)
#   - DynamoDB table  jfauto-settings  (PK: id) + seed row id="default"
#
# Idempotent: re-running is safe. Existing tables are left alone; the seed row
# is upserted only if it doesn't already exist (no overwrite of live edits).
#
# Usage:
#   AWS_PROFILE=jfauto ./scripts/bootstrap-aws.sh
#   AWS_REGION=us-east-2 ./scripts/bootstrap-aws.sh
#
# Required: AWS CLI v2, credentials with DynamoDB Create/Put/Describe perms.

set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
CARS_TABLE="${JFAUTO_CARS_TABLE:-jfauto-cars}"
LEADS_TABLE="${JFAUTO_LEADS_TABLE:-jfauto-leads}"
SETTINGS_TABLE="${JFAUTO_SETTINGS_TABLE:-jfauto-settings}"

DEALERSHIP_NAME="${DEALERSHIP_NAME:-J&F Auto}"

log()  { printf "\033[36m[bootstrap]\033[0m %s\n" "$*"; }
warn() { printf "\033[33m[bootstrap]\033[0m %s\n" "$*" >&2; }
fail() { printf "\033[31m[bootstrap]\033[0m %s\n" "$*" >&2; exit 1; }

command -v aws >/dev/null 2>&1 || fail "AWS CLI not found. Install AWS CLI v2."

log "Region:        $REGION"
log "Cars table:    $CARS_TABLE"
log "Leads table:   $LEADS_TABLE"
log "Settings table: $SETTINGS_TABLE"
echo

table_exists() {
  aws dynamodb describe-table \
    --table-name "$1" \
    --region "$REGION" \
    --no-cli-pager >/dev/null 2>&1
}

create_table_if_missing() {
  local name="$1"
  if table_exists "$name"; then
    log "Table $name already exists — skipping create."
    return 0
  fi
  log "Creating table $name..."
  aws dynamodb create-table \
    --table-name "$name" \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION" \
    --no-cli-pager >/dev/null
}

wait_active() {
  local name="$1"
  log "Waiting for $name to become ACTIVE..."
  aws dynamodb wait table-exists \
    --table-name "$name" \
    --region "$REGION"
}

seed_settings_if_missing() {
  local existing
  existing=$(aws dynamodb get-item \
    --table-name "$SETTINGS_TABLE" \
    --key '{"id":{"S":"default"}}' \
    --region "$REGION" \
    --no-cli-pager \
    --query 'Item.id.S' \
    --output text 2>/dev/null || true)
  if [ -n "$existing" ] && [ "$existing" != "None" ]; then
    log "Settings row id=default already exists — skipping seed."
    return 0
  fi
  log "Seeding default settings row..."
  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  aws dynamodb put-item \
    --table-name "$SETTINGS_TABLE" \
    --region "$REGION" \
    --condition-expression "attribute_not_exists(id)" \
    --no-cli-pager \
    --item "$(cat <<JSON
{
  "id":              {"S": "default"},
  "dealership_name": {"S": "$DEALERSHIP_NAME"},
  "primary_color":   {"S": "#000000"},
  "secondary_color": {"S": "#666666"},
  "logo_url":        {"NULL": true},
  "tagline":         {"NULL": true},
  "phone":           {"NULL": true},
  "email":           {"NULL": true},
  "address":         {"NULL": true},
  "about_text":      {"NULL": true},
  "hours_json":      {"NULL": true},
  "created_at":      {"S": "$now"},
  "updated_at":      {"S": "$now"}
}
JSON
)" >/dev/null
}

create_table_if_missing "$CARS_TABLE"
create_table_if_missing "$LEADS_TABLE"
create_table_if_missing "$SETTINGS_TABLE"

wait_active "$CARS_TABLE"
wait_active "$LEADS_TABLE"
wait_active "$SETTINGS_TABLE"

seed_settings_if_missing

echo
log "Done. Tables ready in $REGION:"
log "  $CARS_TABLE"
log "  $LEADS_TABLE"
log "  $SETTINGS_TABLE (seeded with id=default)"
