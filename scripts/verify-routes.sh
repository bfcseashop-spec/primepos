#!/bin/bash
# Run on server after deploy to verify routes are in the bundle and test locally.
# Usage: ./scripts/verify-routes.sh

set -e
cd "$(dirname "$0")/.."

echo "=== Route verification ==="
echo ""
echo "1. Checking if /api/debug-path is in the bundle:"
if grep -q "debug-path" dist/index.cjs 2>/dev/null; then
  echo "   ✓ Found 'debug-path' in dist/index.cjs"
else
  echo "   ✗ NOT FOUND - route may not be bundled. Run: npm run build"
fi

echo ""
echo "2. Testing API directly (bypasses nginx/proxy):"
PORT="${PORT:-5010}"
for path in "/api/health" "/api/debug-path" "/api/injections" "/api/services-paginated"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}${path}" 2>/dev/null || echo "ERR")
  echo "   ${path} -> ${code}"
done

echo ""
echo "3. If 2 shows 404 for debug-path but 200 for health, check PM2 logs when you hit the URL:"
echo "   pm2 logs primepos --lines 20"
echo "   (Look for: [api] 404 unmatched: method=GET path=... url=... originalUrl=...)"
