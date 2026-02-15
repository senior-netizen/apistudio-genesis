#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$ROOT/deploy/terraform/hosted"
TFVARS_FILE="$TF_DIR/terraform.tfvars"
ACTION="${SQUIRREL_TERRAFORM_ACTION:-apply}"
REQUIRE_GUARDRAILS="${SQUIRREL_REQUIRE_GUARDRAILS:-true}"

if ! command -v terraform >/dev/null 2>&1; then
  echo "[bootstrap] terraform is required" >&2
  exit 1
fi

if [[ ! -d "$TF_DIR" ]]; then
  echo "[bootstrap] terraform directory not found: $TF_DIR" >&2
  exit 1
fi

: "${SQUIRREL_PROJECT_ID:?Set SQUIRREL_PROJECT_ID to your GCP project}"
: "${SQUIRREL_REGION:=us-central1}"
: "${SQUIRREL_ENV:=staging}"

if [[ "$ACTION" != "apply" && "$ACTION" != "plan" ]]; then
  echo "[bootstrap] SQUIRREL_TERRAFORM_ACTION must be 'apply' or 'plan'" >&2
  exit 1
fi

if [[ "$REQUIRE_GUARDRAILS" == "true" ]]; then
  : "${SQUIRREL_RATE_LIMIT_MAX_REQUESTS:?Set SQUIRREL_RATE_LIMIT_MAX_REQUESTS for tenant guardrails}"
  : "${SQUIRREL_RATE_LIMIT_WINDOW_SEC:?Set SQUIRREL_RATE_LIMIT_WINDOW_SEC for tenant guardrails}"
  echo "[bootstrap] tenant guardrails enabled (rate limit window=${SQUIRREL_RATE_LIMIT_WINDOW_SEC}s max=${SQUIRREL_RATE_LIMIT_MAX_REQUESTS})"
fi

echo "[bootstrap] writing tfvars to $TFVARS_FILE"
cat >"$TFVARS_FILE" <<EOF_TFVARS
project_id  = "${SQUIRREL_PROJECT_ID}"
region      = "${SQUIRREL_REGION}"
environment = "${SQUIRREL_ENV}"
rate_limit_window_sec = ${SQUIRREL_RATE_LIMIT_WINDOW_SEC:-60}
rate_limit_max_requests = ${SQUIRREL_RATE_LIMIT_MAX_REQUESTS:-120}
EOF_TFVARS

if command -v op >/dev/null 2>&1 && [[ -n "${SQUIRREL_SECRET_VAULT:-}" ]]; then
  echo "# secrets imported from 1Password" >>"$TFVARS_FILE"
  if db_url=$(op read "op://${SQUIRREL_SECRET_VAULT}/postgres/url" 2>/dev/null); then
    printf 'database_url = "%s"\n' "$db_url" >>"$TFVARS_FILE"
    echo "[bootstrap] imported database_url from 1Password vault ${SQUIRREL_SECRET_VAULT}"
  else
    echo "[bootstrap] warning: could not read postgres/url from 1Password vault ${SQUIRREL_SECRET_VAULT}" >&2
  fi
fi

terraform -chdir="$TF_DIR" init -upgrade
if [[ "$ACTION" == "plan" ]]; then
  terraform -chdir="$TF_DIR" plan "$@"
else
  terraform -chdir="$TF_DIR" apply -auto-approve "$@"
fi


echo "[bootstrap] terraform action complete: $ACTION"
