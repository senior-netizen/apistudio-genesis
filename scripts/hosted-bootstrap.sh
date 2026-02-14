#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$ROOT/deploy/terraform/hosted"
TFVARS_FILE="$TF_DIR/terraform.tfvars"
ACTION="${SQUIRREL_TERRAFORM_ACTION:-apply}"

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

echo "[bootstrap] writing tfvars to $TFVARS_FILE"
cat >"$TFVARS_FILE" <<EOF_TFVARS
project_id  = "${SQUIRREL_PROJECT_ID}"
region      = "${SQUIRREL_REGION}"
environment = "${SQUIRREL_ENV}"
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
