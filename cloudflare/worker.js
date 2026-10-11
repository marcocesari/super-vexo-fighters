// Super Vexo Fighters on Cloudflare Workers.
//
// Every file of the game (index.html, game_funcionality/, assets/) is served
// straight from Cloudflare's static assets. The only code that runs here is
// /api/turn: it hands the game a TURN password that expires after an hour.
//
// TURN is a relay for players whose networks block a direct connection (phone
// hotspots, school Wi-Fi). Cloudflare's TURN key is a long-term secret, so it
// lives here as two Worker secrets — TURN_KEY_ID and TURN_KEY_API_TOKEN — put
// there by tools/deploy-cloudflare.sh, and never in the game, which anyone can read.
const OTHER_ORIGINS = ['https://marcocesari.github.io', 'http://localhost:8080'];   // the copies of the game that may also ask
const TTL = 3600;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/api/turn') return turn(req, env, url);
    return env.ASSETS.fetch(req);
  },
};

async function turn(req, env, url) {
  const origin = req.headers.get('Origin');
  const ok = !origin || origin === url.origin || OTHER_ORIGINS.includes(origin);   // a same-site GET sends no Origin
  const cors = ok && origin ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {};
  if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET' } });
  if (!ok) return new Response('not allowed', { status: 403 });
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return json({ error: 'secrets missing' }, 500, cors);
  const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: TTL }),
  });
  if (!r.ok) return json({ error: 'turn ' + r.status }, 502, cors);
  return json(await r.json(), 200, cors);
}
const json = (o, status, cors) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
