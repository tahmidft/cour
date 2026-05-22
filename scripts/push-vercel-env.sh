#!/usr/bin/env bash
# Push .env to Vercel (requires: npx vercel login && npx vercel link)
set -e
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env file"
  exit 1
fi

echo "Linking project (skip if already linked)..."
npx vercel link --yes 2>/dev/null || true

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^#.*$ ]] && continue
  [[ -z "$line" ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  [[ -z "$key" ]] && continue
  # Skip comments in value
  [[ "$key" == "VITE_"* ]] || [[ "$key" == "SUPABASE"* ]] || [[ "$key" == "RESEND"* ]] || [[ "$key" == "CRON"* ]] || [[ "$key" == "DEEPSEEK"* ]] || continue
  echo "Setting $key..."
  printf '%s' "$val" | npx vercel env add "$key" production --force 2>/dev/null || \
    printf '%s' "$val" | npx vercel env add "$key" production
done < .env

echo "Done. Redeploy from Vercel dashboard or: npx vercel --prod"
