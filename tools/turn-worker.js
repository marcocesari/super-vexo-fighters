// Cloudflare Worker: hands the game short-lived TURN passwords.
//
// TURN is a relay for players whose networks block a direct connection (phone
// hotspots, school Wi-Fi). Cloudflare's TURN key is a long-term secret, so it
// lives here as two Worker secrets — TURN_KEY_ID and TURN_KEY_API_TOKEN — and
// never in the game, which anyone can read on GitHub. The game asks this Worker
// for a password that expires after an hour.
//
// Paste this whole file into the Worker's code editor on dash.cloudflare.com.
const ALLOWED = ['https://marcocesari.github.io', 'http://localhost:8080'];
const TTL = 3600;                                   // seconds a password lasts

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': ALLOWED.includes(origin) ? origin : ALLOWED[0], 'Vary': 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET' } });
    // only the game's own pages may ask (a determined person can fake this, but it stops casual reuse)
    if (!ALLOWED.includes(origin)) return new Response('not allowed', { status: 403, headers: cors });
    if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return new Response('secrets missing', { status: 500, headers: cors });
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: TTL }),
    });
    if (!r.ok) return new Response('turn error ' + r.status, { status: 502, headers: cors });
    return new Response(await r.text(), { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  },
};
