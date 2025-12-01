#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$ROOT/deploy/terraform/hosted"

if ! command -v terraform >/dev/null 2>&1; then
  echo "[bootstrap] terraform is required" >&2
  exit 1
fi

: "${SQUIRREL_PROJECT_ID:?Set SQUIRREL_PROJECT_ID to your GCP project}" 
: "${SQUIRREL_REGION:=us-central1}"
: "${SQUIRREL_ENV:=staging}"

TFVARS_FILE="$TF_DIR/terraform.tfvars"
cat >"$TFVARS_FILE" <<EOF_TFVARS
project_id  = "${SQUIRREL_PROJECT_ID}"
region      = "${SQUIRREL_REGION}"
environment = "${SQUIRREL_ENV}"
EOF_TFVARS

if command -v op >/dev/null 2>&1 && [[ -n "${SQUIRREL_SECRET_VAULT:-}" ]]; then
  echo "# secrets imported from 1Password" >>"$TFVARS_FILE"
  if db_url=$(op read "op://${SQUIRREL_SECRET_VAULT}/postgres/url" 2>/dev/null); then
    echo "database_url = \"${db_url}\"" >>"$TFVARS_FILE"
  fi
fi

terraform -chdir="$TF_DIR" init -upgrade
terraform -chdir="$TF_DIR" apply -auto-approve "$@"
