#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -e LICENSE ]]; then echo 'LICENSE already exists; refusing overwrite'; exit 1; fi
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
curl -fLsS --connect-timeout 10 --max-time 45 \
  https://raw.githubusercontent.com/spdx/license-list-data/main/text/AGPL-3.0-only.txt \
  -o "$tmp"
grep -q '^GNU AFFERO GENERAL PUBLIC LICENSE' "$tmp"
grep -q 'END OF TERMS AND CONDITIONS' "$tmp"
test "$(wc -c < "$tmp")" -gt 20000
cp "$tmp" LICENSE
echo 'Full AGPL-3.0-only text downloaded to isolated source LICENSE. Verify before publishing.'
