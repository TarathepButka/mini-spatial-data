#!/bin/sh
set -eu

escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat > /usr/share/nginx/html/env.js <<EOF
window.__MINI_SPATIAL_CONFIG__ = {
  VITE_API_URL: "$(escape_js "${VITE_API_URL:-}")",
  VITE_GOOGLE_CLIENT_ID: "$(escape_js "${VITE_GOOGLE_CLIENT_ID:-}")"
};
EOF
