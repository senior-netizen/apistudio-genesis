#!/usr/bin/env bash
set -euo pipefail

BASE_DIR=$(cd "$(dirname "$0")/.." && pwd -P)
ENV_FILE="$BASE_DIR/squirrel/backend/.env"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required; please install it (apt/yum/brew)."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

BASE_URL="${BASE_URL:-http://localhost:3080/api/v1}"
HEALTH_URL="${BASE_URL%/}/health"
HEALTHZ_URL="${BASE_URL%/}/healthz"
READY_URL="${BASE_URL%/}/readyz"
LOGIN_URL="${BASE_URL%/}/auth/login"
ME_URL="${BASE_URL%/}/auth/me"
REFRESH_URL="${BASE_URL%/}/auth/refresh"

echo "|| Testing backend endpoints against $BASE_URL (unsafe script—delete after use)"

echo -n "-> health: "
curl --silent --show-error --fail "$HEALTH_URL" | jq .

echo -n "-> healthz: "
curl --silent --show-error --fail "$HEALTHZ_URL" | jq .

echo -n "-> readyz: "
if ! curl --silent --show-error "$READY_URL" | jq .; then
  echo " (readyz returned non-2xx; confirm the endpoint is exposed)"
fi

echo -n "-> login (founder): "
LOGIN_RES=$(curl --silent --show-error --fail -X POST "$LOGIN_URL" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${OWNER_EMAIL}\",\"password\":\"${OWNER_PASSWORD}\"}")
echo "$LOGIN_RES" | jq .

ACCESS_TOKEN=$(jq -r '.accessToken' <<< "$LOGIN_RES")
REFRESH_TOKEN=$(jq -r '.refreshToken' <<< "$LOGIN_RES")

if [[ -z "$ACCESS_TOKEN" || -z "$REFRESH_TOKEN" ]]; then
  echo "login did not return tokens"
  exit 1
fi

echo -n "-> authed /auth/me: "
curl --silent --show-error --fail "$ME_URL" -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

echo -n "-> refresh token flow: "
curl --silent --show-error --fail -X POST "$REFRESH_URL" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" | jq .

echo "Completed real-endpoint smoke test. Delete this script when you no longer need it."
