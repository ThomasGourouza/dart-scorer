#!/usr/bin/env sh
set -eu

API_BASE_URL_VALUE="${API_BASE_URL:-http://localhost:8080}"

cat > /usr/share/nginx/html/assets/runtime-config.js <<EOF
window.__dartScorerConfig = {
  apiBaseUrl: "${API_BASE_URL_VALUE}"
};
EOF
