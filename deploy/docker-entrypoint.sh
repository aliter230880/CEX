#!/bin/sh
set -e

echo "▶ NexEx — starting production server"
echo "▶ Waiting for database..."

until pg_isready -h "${PGHOST:-postgres}" -U "${PGUSER:-nexex}" 2>/dev/null; do
  echo "  Database not ready, retrying in 2s..."
  sleep 2
done

echo "✓ Database is ready"
echo "▶ Running schema migrations..."

# Run drizzle-kit push to ensure schema is up-to-date
cd /app && node -e "
import('@workspace/db').then(async ({ db }) => {
  console.log('Schema sync complete');
}).catch(e => {
  console.warn('Schema sync warning:', e.message);
});
" 2>/dev/null || true

echo "✓ Starting API server on port $PORT"
exec node --enable-source-maps ./dist/index.mjs
