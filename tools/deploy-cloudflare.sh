#!/bin/sh
# Put the game on Cloudflare Workers (game files + /api/turn for TURN passwords).
#
# Needs two private files in your home folder (never in the project, never on GitHub):
#   ~/.cloudflare-svf-token     the Cloudflare API token (Workers Scripts: Edit + Calls: Edit)
#   ~/.cloudflare-svf-account   the Cloudflare account ID
# The first run also creates the TURN key with the API token and stores it in
# the Worker as two secrets, so nobody ever has to copy a TURN key by hand.
#
# Run: ./tools/deploy-cloudflare.sh
set -e
cd "$(dirname "$0")/.."
TOKEN_FILE="$HOME/.cloudflare-svf-token"; ACCOUNT_FILE="$HOME/.cloudflare-svf-account"
[ -s "$TOKEN_FILE" ] || { echo "Missing $TOKEN_FILE (the API token)"; exit 1; }
[ -s "$ACCOUNT_FILE" ] || { echo "Missing $ACCOUNT_FILE (the account ID)"; exit 1; }
CLOUDFLARE_API_TOKEN="$(tr -d ' \r\n' < "$TOKEN_FILE")"; CLOUDFLARE_ACCOUNT_ID="$(tr -d ' \r\n' < "$ACCOUNT_FILE")"
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
WRANGLER="npx --yes wrangler@4"

echo "▶ building cloudflare/.dist"
rm -rf cloudflare/.dist && mkdir -p cloudflare/.dist
rsync -a --exclude .DS_Store --exclude "1-03 - Battlefield copy.mp3" index.html game_funcionality assets cloudflare/.dist/
node tools/stamp.mjs cloudflare/.dist "cf-$(date +%s)"

echo "▶ deploying"
(cd cloudflare && $WRANGLER deploy)

# First time only: make a TURN key with the API token and hand it to the Worker as secrets.
if ! (cd cloudflare && $WRANGLER secret list 2>/dev/null) | grep -q TURN_KEY_ID; then
  echo "▶ creating the TURN key (first time only)"
  RESP="$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/calls/turn_keys" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" -d '{"name":"super-vexo-fighters"}')"
  UID_="$(printf '%s' "$RESP" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s),r=j.result||j;if(!r.uid||!(r.secret||r.key)){console.error("TURN key error:",JSON.stringify(j.errors||Object.keys(j)));process.exit(1)}process.stdout.write(r.uid)})')"
  KEY_="$(printf '%s' "$RESP" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const r=j.result||j;process.stdout.write(r.secret||r.key)})')"
  printf '%s' "$UID_" | (cd cloudflare && $WRANGLER secret put TURN_KEY_ID)
  printf '%s' "$KEY_" | (cd cloudflare && $WRANGLER secret put TURN_KEY_API_TOKEN)
  unset RESP KEY_
fi
echo "✔ done"
