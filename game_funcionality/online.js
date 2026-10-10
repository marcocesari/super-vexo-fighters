// Online play: make a room, or find the rooms of people near you.
//
// Nobody runs a server for this. Browsers find each other through public Nostr
// relays (the Trystero library does the talking) and then connect directly,
// browser to browser (WebRTC). The relays only ever carry the "hello".
//
// "Near you" = the same rough area. The browser asks for the location once; the
// game turns it into a 4-letter geohash cell (about 20 × 30 km) and from then on
// only that cell is ever shared — never the exact spot. A host announces their
// room in the lobby named after their cell; a finder listens in their own cell
// and the 8 around it, and the list is sorted by how far apart the cells are.
//
// Who gets in: anyone asking pops up on the host's screen — Accept or Decline.
// Names are made up by the game ("Swift Rockheart 42"), so nobody types anything.
//
// The fight itself runs only on the host. The guest sends their pad every step
// and gets back a snapshot of everything to draw, so the two screens can never
// drift apart. Watchers get the same snapshots and send nothing.
import { CHARACTERS } from './characters/index.js?v=48d769e-1791643329';
import { STAGES } from './maps/index.js?v=48d769e-1791643329';
import { MODES, SPEEDS } from './config.js?v=48d769e-1791643329';
import { Fighter } from './fighter.js?v=48d769e-1791643329';
import { emptyPad } from './input.js?v=48d769e-1791643329';
import { samplePose } from './poses.js?v=48d769e-1791643329';
import { lerpPose } from './rig.js?v=48d769e-1791643329';
import { Camera } from './camera.js?v=48d769e-1791643329';

const TRYSTERO = 'https://cdn.jsdelivr.net/npm/trystero@0.26.0/+esm';
const APP = { appId: 'super-vexo-fighters-online-v1' };
const AD_EVERY = 2000, AD_TTL = 7000, JOIN_TIMEOUT = 20000;
const BATTLE_MUSIC = 'assets/audio/battle_music.mp3', MENU_MUSIC = 'assets/audio/menu_music.mp3';
const $menu = () => document.getElementById('menu');

// ---------------------------------------------------------------- rough area
const B32 = '0123456789bcdefghjkmnpqrstuvwxyz';
function geohash(lat, lon, n = 4) {
  const la = [-90, 90], lo = [-180, 180]; let s = '', bit = 0, ch = 0, even = true;
  while (s.length < n) {
    const r = even ? lo : la, v = even ? lon : lat, mid = (r[0] + r[1]) / 2;
    if (v >= mid) { ch = ch * 2 + 1; r[0] = mid; } else { ch *= 2; r[1] = mid; }
    even = !even;
    if (++bit === 5) { s += B32[ch]; bit = 0; ch = 0; }
  }
  return s;
}
function cellBox(h) {
  const la = [-90, 90], lo = [-180, 180]; let even = true;
  for (const c of h) {
    const d = B32.indexOf(c);
    for (let i = 4; i >= 0; i--) { const r = even ? lo : la, mid = (r[0] + r[1]) / 2; if ((d >> i) & 1) r[0] = mid; else r[1] = mid; even = !even; }
  }
  return { lat: (la[0] + la[1]) / 2, lon: (lo[0] + lo[1]) / 2, dLat: la[1] - la[0], dLon: lo[1] - lo[0] };
}
function cellsAround(h) {                      // the cell and its 8 neighbours
  const c = cellBox(h), out = new Set();
  for (const i of [-1, 0, 1]) for (const j of [-1, 0, 1]) {
    let lon = c.lon + j * c.dLon; if (lon > 180) lon -= 360; if (lon < -180) lon += 360;
    out.add(geohash(Math.max(-89.9, Math.min(89.9, c.lat + i * c.dLat)), lon, h.length));
  }
  return [...out];
}
function cellKm(a, b) {
  const A = cellBox(a), B = cellBox(b), R = 6371, rad = Math.PI / 180;
  const h = Math.sin((B.lat - A.lat) * rad / 2) ** 2 + Math.cos(A.lat * rad) * Math.cos(B.lat * rad) * Math.sin((B.lon - A.lon) * rad / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const distText = (a, b) => a === b ? 'in your area' : `about ${Math.max(10, Math.round(cellKm(a, b) / 10) * 10)} km away`;
const okCell = s => typeof s === 'string' && /^[0-9b-hjkmnp-z]{4}$/.test(s);

// ---------------------------------------------------------------- names
const ADJ = ['Swift', 'Brave', 'Mighty', 'Sneaky', 'Cosmic', 'Lucky', 'Turbo', 'Sleepy', 'Fiery', 'Icy', 'Rocky', 'Shiny', 'Wild', 'Silent', 'Royal', 'Electric', 'Jolly', 'Golden'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const okName = s => typeof s === 'string' && s.length <= 40 && /^[A-Za-z]+( [A-Za-z]+){1,3} \d{1,2}$/.test(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function myName() {
  try { const s = localStorage.getItem('svf-online-name'); if (okName(s)) return s; } catch {}
  const n = `${pick(ADJ)} ${pick(CHARACTERS).name} ${10 + Math.floor(Math.random() * 90)}`;
  try { localStorage.setItem('svf-online-name', n); } catch {}
  return n;
}

// ---------------------------------------------------------------- wire formats
// Everything that arrives from another browser is checked before it is used.
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const int = (v, lo, hi, d = lo) => (Number.isInteger(v) && v >= lo && v <= hi ? v : d);
const okCol = c => (typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : '#ffffff');
const r1 = v => Math.round(v * 10) / 10;

const PAD_KEYS = ['left', 'right', 'up', 'down', 'jump', 'attack', 'special', 'shield', 'upP', 'downP', 'jumpP', 'attackP', 'specialP', 'shieldP'];
const packPad = p => [Math.round(p.x * 100) / 100, PAD_KEYS.reduce((b, k, i) => b | (p[k] ? 1 << i : 0), 0)];
function unpackPad(a) {
  const p = emptyPad(); if (!Array.isArray(a)) return p;
  p.x = Math.max(-1, Math.min(1, num(a[0]))); const bits = int(a[1], 0, 1 << 14, 0);
  PAD_KEYS.forEach((k, i) => { p[k] = !!(bits & (1 << i)); });
  return p;
}
const packFighter = f => [r1(f.x), r1(f.y), f.facing, f.state, f.frame, r1(f.spin), f.flash, f.invincible, f.shielding ? 1 : 0,
                          r1(f.shieldHP), r1(f.percent), r1(f.hp), f.stocks, f.dead ? 1 : 0, Math.round(f.superMeter)];
function applyFighter(f, s) {
  if (!Array.isArray(s)) return;
  const x = num(s[0], f.x), y = num(s[1], f.y), wasDead = f.dead;
  f.prevX = f.x; f.prevY = f.y; f.x = x; f.y = y;
  if (wasDead || Math.hypot(x - f.prevX, y - f.prevY) > 250) { f.prevX = x; f.prevY = y; }   // respawn: don't draw the trip
  f.facing = s[2] === -1 ? -1 : 1;
  const st = typeof s[3] === 'string' && Object.hasOwn(f.clips, s[3]) ? s[3] : 'idle';
  if (st !== f.state) { f.blendFrom = f.pose; f.blendT = 5; }
  f.state = st; f.frame = num(s[4]); f.spin = num(s[5]); f.flash = num(s[6]); f.invincible = num(s[7]);
  f.shielding = !!s[8]; f.shieldHP = num(s[9]); f.percent = num(s[10]); f.hp = num(s[11]);
  f.stocks = int(s[12], 0, 9, f.stocks); f.dead = !!s[13]; f.superMeter = num(s[14]);
  let pose = samplePose(f.clips[st], f.frame);
  if (f.blendT > 0 && f.blendFrom) { pose = lerpPose(pose, f.blendFrom, f.blendT / 6); f.blendT--; }
  if (f.spin) pose = { ...pose, spin: f.spin };
  f.pose = pose;
}
const packShot = p => [r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), p.r, p.colour, p.spin ? 1 : 0, p.age];
const unpackShot = a => {
  const x = num(a[0]), y = num(a[1]), vx = num(a[2]), vy = num(a[3]);
  return { x, y, vx, vy, px: x - vx, py: y - vy, r: Math.max(1, Math.min(80, num(a[4], 10))), colour: okCol(a[5]), spin: !!a[6], age: num(a[7]) };
};

export class Online {
  constructor(game) {
    this.game = game; this.name = myName();
    this.screen = 'home'; this.sel = 0; this.note = '';
    this.T = null; this.cell = null; this.room = null; this.lobbies = []; this.timers = []; this.ads = new Map(); this.requests = [];
    $menu().addEventListener('click', e => this.click(e));
  }

  // ------------------------------------------------------------ entering / leaving
  open() {
    const g = this.game; this.savedP2cpu = g.input.p2cpu; this.savedSpeed = g.menu.cfg.speed;
    g.input.p2cpu = true;                          // online, this keyboard is only ever one player
    g.state = 'online'; this.go('home');
  }
  exit() { this.leaveAll(); const g = this.game; g.input.p2cpu = this.savedP2cpu; g.menu.cfg.speed = this.savedSpeed; g.toSetup(); }
  leaveAll() {
    this.timers.forEach(clearInterval); this.timers = [];
    for (const r of this.lobbies) r.leave(); this.lobbies = [];
    if (this.room) this.room.leave(); this.room = null;
    this.unhookHost(); this.game.net = null; this.role = null; this.ads = new Map(); this.requests = [];
  }
  go(screen, note = '') { this.screen = screen; this.sel = 0; this.note = note; this.render(); }

  async lib() {
    if (!this.T) this.T = await import(TRYSTERO);
    return this.T;
  }
  locate() {
    return new Promise((ok, fail) => {
      if (this.cell) return ok(this.cell);
      if (!navigator.geolocation) return fail(new Error('no geolocation'));
      navigator.geolocation.getCurrentPosition(
        pos => { this.cell = geohash(pos.coords.latitude, pos.coords.longitude, 4); ok(this.cell); },   // the exact spot is dropped right here
        err => fail(err), { enableHighAccuracy: false, timeout: 15000, maximumAge: 3600000 });
    });
  }
  async prepare() {
    this.go('wait', 'Finding your rough area…');
    try { await this.locate(); } catch (e) { this.go('noloc'); return false; }
    this.go('wait', 'Connecting…');
    try { await this.lib(); } catch (e) { this.go('error', 'Could not load the online part of the game. Check the internet connection.'); return false; }
    return true;
  }

  // ------------------------------------------------------------ host
  async host() {
    if (!await this.prepare()) return;
    const T = this.T; this.leaveAll(); this.role = 'host';
    this.p2 = null; this.watchers = new Map(); this.requests = []; this.fighting = false;
    this.cfg = { mode: MODES.STOCK, speed: this.savedSpeed, stage: 0, me: this.game.menu.cfg.p1 };
    this.room = T.joinRoom(APP, 'room-' + T.selfId);
    const a = n => this.room.makeAction(n);
    this.act = { reply: a('reply'), room: a('room'), start: a('start'), snap: a('snap'), end: a('end'), back: a('back'), hello: a('hello'), pick: a('pick'), pad: a('pad') };
    this.act.hello.onMessage = (d, { peerId }) => this.onHello(d, peerId);
    this.act.pick.onMessage = (d, { peerId }) => { if (this.p2?.id === peerId && !this.fighting) { this.p2.char = int(d, 0, CHARACTERS.length - 1, this.p2.char); this.sendRoom(); this.render(); } };
    this.act.pad.onMessage = (d, { peerId }) => { if (this.p2?.id === peerId) this.pushPad(unpackPad(d)); };
    this.room.onPeerLeave = id => this.onLeave(id);
    // the lobby: tell everyone nearby about this room
    const lobby = T.joinRoom(APP, 'lobby-' + this.cell); this.lobbies = [lobby];
    const ad = lobby.makeAction('ad');
    lobby.onPeerJoin = id => ad.send(this.adData(), { target: id });
    this.timers.push(setInterval(() => ad.send(this.adData()), AD_EVERY));
    this.go('room');
  }
  adData() {
    return { name: this.name, cell: this.cell, fighter: this.cfg.me, stage: this.cfg.stage, open: !this.p2, watchers: this.watchers.size, fighting: this.fighting };
  }
  onHello(d, id) {
    if (!d || !okName(d.name) || this.requests.some(r => r.id === id) || this.p2?.id === id || this.watchers.has(id)) return;
    this.requests.push({ id, name: d.name, play: d.want === 'play' });
    this.game.sfx.play('shield', { volume: 0.6, pitch: 1.4 });
    if (this.game.state === 'online') this.render();
  }
  answer(yes) {
    const r = this.requests.shift(); if (!r) return;
    if (!yes) { this.act.reply.send({ ok: false }, { target: r.id }); return this.render(); }
    const play = r.play && !this.p2 && !this.fighting;
    if (play) this.p2 = { id: r.id, name: r.name, char: 2 }; else this.watchers.set(r.id, r.name);
    this.act.reply.send({ ok: true, role: play ? 'player' : 'watcher' }, { target: r.id });
    this.sendRoom();
    if (this.fighting) this.act.start.send(this.startData(), { target: r.id });   // a watcher arriving mid-fight
    this.render();
  }
  onLeave(id) {
    this.requests = this.requests.filter(r => r.id !== id);
    this.watchers.delete(id);
    if (this.p2?.id === id) {
      const name = this.p2.name; this.p2 = null;
      if (this.fighting) { this.backToRoom(`${name} left the match.`); return; }
      this.note = `${name} left the room.`;
    }
    this.sendRoom(); if (this.game.state === 'online') this.render();
  }
  members() { return [...(this.p2 ? [this.p2.id] : []), ...this.watchers.keys()]; }
  sendRoom() {
    if (!this.act || !this.members().length) return;
    this.act.room.send({ host: { name: this.name, char: this.cfg.me }, p2: this.p2 && { name: this.p2.name, char: this.p2.char },
                         watchers: [...this.watchers.values()], mode: this.cfg.mode, speed: this.cfg.speed, stage: this.cfg.stage }, { target: this.members() });
  }
  startData() {
    return { chars: [this.cfg.me, this.p2?.char ?? 0], names: [this.name, this.p2?.name ?? ''], stage: this.cfg.stage, mode: this.cfg.mode, speed: this.cfg.speed };
  }
  startFight() {
    if (!this.p2) return;
    const g = this.game, c = g.menu.cfg;
    Object.assign(c, { p1: this.cfg.me, p2: this.p2.char, stage: this.cfg.stage, mode: this.cfg.mode, speed: this.cfg.speed });
    this.fighting = true; this.pads = []; this.lastPad = emptyPad(); this.leaveHint = false;
    this.act.start.send(this.startData(), { target: this.members() });
    this.hookHost();
    g.startMatch(this);
    g.fighters[0].netName = this.name; g.fighters[1].netName = this.p2.name;
  }
  // The guest's pads arrive in bursts; play them back one per step, and never lose a press.
  pushPad(p) { this.pads.push(p); if (this.pads.length > 6) { const a = this.pads.shift(); for (const k of PAD_KEYS) if (k.endsWith('P') && a[k]) this.pads[0][k] = true; } }
  remotePad() {
    if (this.pads.length) { this.lastPad = this.pads.shift(); return this.lastPad; }
    const held = { ...this.lastPad }; for (const k of PAD_KEYS) if (k.endsWith('P')) held[k] = false;
    return held;                                  // nothing new: keep holding what they held
  }
  // After every host step: one snapshot to the guest and the watchers.
  afterStep() {
    if (this.role !== 'host' || !this.members().length) { if (this.events) this.events.length = 0; return; }
    const g = this.game;
    this.act.snap.send({ f: g.fighters.map(packFighter), p: g.projectiles.map(packShot), e: this.events, t: g.frames }, { target: this.members() });
    this.events = [];
  }
  // Sparks, shakes, sounds and announcements happen on the host; record them so the others see and hear them too.
  hookHost() {
    if (this.hooked) return;
    const g = this.game, keep = this.hooked = { spark: g.spark, shake: g.shake, play: g.sfx.play, announce: g.hud.announce };
    this.events = [];
    const ev = e => { if (this.events && this.events.length < 400) this.events.push(e); };
    g.spark = (x, y, colour, n, soft) => { ev(['s', r1(x), r1(y), colour, n ?? 8, soft ? 1 : 0]); keep.spark.call(g, x, y, colour, n, soft); };
    g.shake = a => { ev(['k', r1(a)]); keep.shake.call(g, a); };
    g.sfx.play = (name, o = {}) => { ev(['p', name, o.volume ?? 1, o.pitch ?? 1]); keep.play.call(g.sfx, name, o); };
    g.hud.announce = (text, frames, small) => { ev(['a', text, frames ?? 90, small ? 1 : 0]); keep.announce.call(g.hud, text, frames, small); };
  }
  unhookHost() {
    const k = this.hooked; if (!k) return; const g = this.game;
    delete g.spark; delete g.shake; delete g.sfx.play; delete g.hud.announce;     // back to the shared versions
    this.hooked = null; this.events = null;
  }
  onMatchOver(text) { if (this.role === 'host' && this.members().length) this.act.end.send({ text }, { target: this.members() }); }
  rematch() { this.unhookHost(); this.startFight(); }
  backToRoom(note = '') {
    const g = this.game;
    this.fighting = false; this.unhookHost(); g.net = null;
    if (this.members().length) this.act.back.send(1, { target: this.members() });
    g.hud.show(false); g.music.play(MENU_MUSIC, { volume: 0.55, fadeIn: 0.8 });
    g.state = 'online'; this.go('room', note);
  }

  // ------------------------------------------------------------ finding
  async find() {
    if (!await this.prepare()) return;
    const T = this.T; this.leaveAll(); this.role = 'finder'; this.ads = new Map();
    for (const c of cellsAround(this.cell)) {
      const lobby = T.joinRoom(APP, 'lobby-' + c); this.lobbies.push(lobby);
      const ad = lobby.makeAction('ad');
      ad.onMessage = (d, { peerId }) => {
        if (!d || !okName(d.name) || !okCell(d.cell)) return;
        this.ads.set(peerId, { id: peerId, name: d.name, cell: d.cell, fighter: int(d.fighter, 0, CHARACTERS.length - 1, 0), stage: int(d.stage, 0, STAGES.length - 1, 0),
                               open: !!d.open, watchers: int(d.watchers, 0, 99, 0), fighting: !!d.fighting, seen: Date.now(), want: d.open ? 'play' : 'watch' });
        if (this.screen === 'browse') this.render();
      };
      lobby.onPeerLeave = id => { if (this.ads.delete(id) && this.screen === 'browse') this.render(); };
    }
    this.timers.push(setInterval(() => {                           // forget rooms that stopped announcing
      let gone = false; for (const [id, a] of this.ads) if (Date.now() - a.seen > AD_TTL) { this.ads.delete(id); gone = true; }
      if (gone && this.screen === 'browse') this.render();
    }, 1000));
    this.go('browse');
  }
  rooms() { return [...this.ads.values()].sort((a, b) => cellKm(this.cell, a.cell) - cellKm(this.cell, b.cell)); }

  ask(ad) {
    const T = this.T; this.target = ad; this.myRole = null; this.view = null; this.myChar = this.game.menu.cfg.p1;
    if (this.room) this.room.leave();
    this.room = T.joinRoom(APP, 'room-' + ad.id);
    const a = n => this.room.makeAction(n);
    this.act = { hello: a('hello'), pick: a('pick'), pad: a('pad'), reply: a('reply'), room: a('room'), start: a('start'), snap: a('snap'), end: a('end'), back: a('back') };
    const fromHost = fn => (d, { peerId }) => { if (peerId === ad.id) fn(d); };
    this.act.reply.onMessage = fromHost(d => {
      if (!d?.ok) { this.room.leave(); this.room = null; return this.go('declined'); }
      this.myRole = d.role === 'player' ? 'player' : 'watcher';
      for (const l of this.lobbies) l.leave(); this.lobbies = []; this.timers.forEach(clearInterval); this.timers = [];
      this.role = this.myRole; this.go('room');
      if (this.myRole === 'player') this.act.pick.send(this.myChar, { target: ad.id });
    });
    this.act.room.onMessage = fromHost(d => { this.view = d; if (this.screen === 'room' && this.game.state === 'online') this.render(); });
    this.act.start.onMessage = fromHost(d => this.beginView(d));
    this.act.snap.onMessage = fromHost(d => { if (this.snaps && this.snaps.length < 30) this.snaps.push(d); });
    this.act.end.onMessage = fromHost(d => { if (this.game.state === 'netview') this.showResult(typeof d?.text === 'string' ? d.text.slice(0, 40) : 'GAME!'); });
    this.act.back.onMessage = fromHost(() => this.viewToRoom());
    this.hostSeen = false;
    this.room.onPeerJoin = id => { if (id === ad.id) { this.hostSeen = true; this.act.hello.send({ name: this.name, want: ad.want }, { target: id }); if (this.screen === 'asking') this.render(); } };
    this.room.onPeerLeave = id => { if (id === ad.id) this.hostGone(); };
    const asked = Date.now();
    this.timers.push(setInterval(() => { if (this.screen === 'asking' && !this.hostSeen && Date.now() - asked > JOIN_TIMEOUT) { this.room?.leave(); this.room = null; this.go('error', `Couldn't reach ${ad.name}'s room. They may have closed it.`); } }, 1000));
    this.go('asking');
  }
  hostGone() {
    const g = this.game; this.leaveAll();
    if (g.state !== 'online') { g.hud.show(false); g.music.play(MENU_MUSIC, { volume: 0.55, fadeIn: 0.8 }); g.state = 'online'; }
    this.go('error', 'The host closed the room.');
  }

  // ------------------------------------------------------------ guest / watcher: showing the host's fight
  beginView(d) {
    const g = this.game;
    if (!d || !Array.isArray(d.chars) || !Array.isArray(d.names)) return;
    const stage = STAGES[int(d.stage, 0, STAGES.length - 1, 0)], mode = d.mode === MODES.STAMINA ? MODES.STAMINA : MODES.STOCK;
    g.menu.cfg.speed = int(d.speed, 0, SPEEDS.length - 1, g.menu.cfg.speed);
    g.stage = stage; g.mode = mode;
    g.fighters = d.chars.slice(0, 2).map((ci, i) => {
      const f = new Fighter(CHARACTERS[int(ci, 0, CHARACTERS.length - 1, 0)], i, mode); f._stage = stage;
      f.spawn(stage.spawns[i][0], i === 0 ? 1 : -1, 260); f.netName = okName(d.names[i]) ? d.names[i] : ''; return f;
    });
    g.projectiles = []; g.sparks = []; g.frames = 0; g.cam = new Camera(); g.cam.x = 0; g.cam.y = 200;
    this.snaps = []; this.leaveHint = false; this.resultShown = false;
    g.music.play(BATTLE_MUSIC, { volume: 0.5, fadeIn: 0.5 });
    g.menu.clear(); g.hud.show(true); g.state = 'netview';
  }
  viewTick(inp) {
    const g = this.game, m = inp.menu;
    if (this.myRole === 'player') this.act.pad.send(packPad(inp.pad(0)), { target: this.target.id });
    if (m.start && !this.resultShown) { this.leaveHint = !this.leaveHint; this.leaveHint ? g.menu.pauseOnline() : g.menu.clear(); }
    if ((this.leaveHint || this.resultShown) && (inp.wasPressed('KeyQ') || m.back)) { this.leaveAll(); g.hud.show(false); g.music.play(MENU_MUSIC, { volume: 0.55, fadeIn: 0.8 }); g.state = 'online'; this.go('home'); return; }
    // keep a couple of snapshots in hand to ride out bumps; if we fall behind, skip ahead
    while (this.snaps.length > 4) this.applySnap(this.snaps.shift(), true);
    if (this.snaps.length) this.applySnap(this.snaps.shift());
    else for (const f of g.fighters) { f.prevX = f.x; f.prevY = f.y; }
    for (const pr of g.projectiles) { pr.px = pr.x; pr.py = pr.y; }
    g.stepSparks(); g.cam.update(g.fighters, g.stage);
    g.hud.update(g.fighters, g.mode, g.clock(), g.quality.label());
  }
  applySnap(s, quiet = false) {
    const g = this.game; if (!s || !Array.isArray(s.f)) return;
    g.fighters.forEach((f, i) => applyFighter(f, s.f[i]));
    if (Array.isArray(s.p)) g.projectiles = s.p.slice(0, 60).filter(Array.isArray).map(unpackShot);
    g.frames = int(s.t, 0, 1e9, g.frames);
    if (quiet || !Array.isArray(s.e)) return;
    for (const e of s.e.slice(0, 400)) {
      if (!Array.isArray(e)) continue;
      if (e[0] === 's') g.spark(num(e[1]), num(e[2]), okCol(e[3]), Math.max(0, Math.min(40, num(e[4], 8))), !!e[5]);
      else if (e[0] === 'k') g.shake(Math.min(30, num(e[1])));
      else if (e[0] === 'p' && typeof e[1] === 'string') g.sfx.play(e[1], { volume: Math.max(0, Math.min(1, num(e[2], 1))), pitch: Math.max(0.3, Math.min(3, num(e[3], 1))) });
      else if (e[0] === 'a' && typeof e[1] === 'string') g.hud.announce(e[1].slice(0, 40), Math.max(1, Math.min(300, num(e[2], 90))), !!e[3]);
    }
  }
  showResult(text) { this.resultShown = true; this.game.menu.resultOnline(text); }
  viewToRoom() {
    const g = this.game; if (g.state !== 'netview') return;
    g.hud.show(false); g.music.play(MENU_MUSIC, { volume: 0.55, fadeIn: 0.8 }); g.state = 'online'; this.go('room');
  }

  // ------------------------------------------------------------ menus
  rowsFor() {
    const C = CHARACTERS, cyc = (v, d, n) => (v + d + n) % n;
    switch (this.screen) {
      case 'home': return [
        { label: '🏠 Create a room', act: () => this.host() },
        { label: '🔍 Find rooms nearby', act: () => this.find() },
        { label: '◀ Back', act: () => this.exit() }];
      case 'wait': return [{ label: '✖ Cancel', act: () => { this.leaveAll(); this.go('home'); } }];
      case 'noloc': return [{ label: '↻ Try again', act: () => this.find() }, { label: '◀ Back', act: () => this.go('home') }];
      case 'error': case 'declined': return [{ label: '🔍 Find rooms nearby', act: () => this.find() }, { label: '◀ Back', act: () => { this.leaveAll(); this.go('home'); } }];
      case 'browse': return [
        ...this.rooms().map(r => ({
          label: `${esc(r.name)} <small>· ${C[r.fighter].name} · ${STAGES[r.stage].name} · ${distText(this.cell, r.cell)}${r.fighting ? ' · fighting now' : ''}</small>`,
          val: () => r.want === 'play' ? '🥊 Play' : '👀 Watch',
          set: () => { if (r.open && !r.fighting) r.want = r.want === 'play' ? 'watch' : 'play'; },
          act: () => this.ask(r) })),
        { label: '◀ Back', act: () => { this.leaveAll(); this.go('home'); } }];
      case 'asking': return [{ label: '✖ Cancel', act: () => { this.leaveAll(); this.go('home'); } }];
      case 'room':
        if (this.role === 'host' && this.requests.length) return [
          { label: '✔ Accept', act: () => this.answer(true) }, { label: '✖ Decline', act: () => this.answer(false) }];
        if (this.role === 'host') return [
          { label: 'Your fighter', val: () => C[this.cfg.me].name, set: d => { this.cfg.me = cyc(this.cfg.me, d, C.length); this.sendRoom(); } },
          { label: 'Rules', val: () => this.cfg.mode === MODES.STOCK ? 'Stock (3 lives)' : 'Stamina (150 HP)', set: () => { this.cfg.mode = this.cfg.mode === MODES.STOCK ? MODES.STAMINA : MODES.STOCK; this.sendRoom(); } },
          { label: 'Game speed', val: () => SPEEDS[this.cfg.speed].label, set: d => { this.cfg.speed = Math.max(0, Math.min(SPEEDS.length - 1, this.cfg.speed + d)); this.sendRoom(); } },
          { label: 'Stage', val: () => STAGES[this.cfg.stage].name, set: d => { this.cfg.stage = cyc(this.cfg.stage, d, STAGES.length); this.sendRoom(); } },
          { label: this.p2 ? '▶ FIGHT! ◀' : 'Waiting for a player…', go: true, act: () => this.startFight() },
          { label: '✖ Close room', act: () => { this.leaveAll(); this.go('home'); } }];
        return [
          ...(this.myRole === 'player' ? [{ label: 'Your fighter', val: () => C[this.myChar].name, set: d => { this.myChar = cyc(this.myChar, d, C.length); this.act.pick.send(this.myChar, { target: this.target.id }); } }] : []),
          { label: '✖ Leave room', act: () => { this.leaveAll(); this.go('home'); } }];
    }
    return [];
  }
  info() {
    const C = CHARACTERS, you = `You are <b>${esc(this.name)}</b>.`;
    switch (this.screen) {
      case 'home': return `${you}<br>Rooms are found by <b>rough area</b> (about 20 km). Your exact location is never shared.<br>Two fight, everyone else can watch. The host decides who gets in.`;
      case 'wait': return esc(this.note);
      case 'noloc': return 'The game needs your <b>rough area</b> to find rooms near you, but location is off or was blocked.<br>Allow location for this site in the browser (the icon by the address bar), then try again.<br>Only a ~20 km area is ever shared — never your exact spot.';
      case 'error': return esc(this.note);
      case 'declined': return 'The host said no this time.';
      case 'browse': return this.ads.size ? `${you} Rooms near you (←/→ choose play or watch, Enter to ask):` : `${you}<br><span class="searching">Looking for rooms nearby…</span><br>Nobody's hosting near you right now. Leave this open — rooms show up here as soon as someone makes one.`;
      case 'asking': return !this.hostSeen ? `Connecting to <b>${esc(this.target.name)}</b>'s room…`
        : `Asking <b>${esc(this.target.name)}</b> to let you ${this.target.want === 'play' ? 'play' : 'watch'}…${this.target.fighting ? '<br>They\'re in a match — they\'ll see your request when it ends.' : ''}`;
      case 'room': {
        if (this.role === 'host') {
          const r = this.requests[0];
          if (r) return `<div class="request"><b>${esc(r.name)}</b> wants to <b>${r.play && !this.p2 && !this.fighting ? 'PLAY' : 'WATCH'}</b>.</div>`;
          return `${esc(this.note)}${this.note ? '<br>' : ''}Your room is open to people in your area.<br>
            🥊 <b>${esc(this.name)}</b> (you) — ${C[this.cfg.me].name}<br>
            🥊 ${this.p2 ? `<b>${esc(this.p2.name)}</b> — ${C[this.p2.char].name}` : '<i>waiting for a player…</i>'}<br>
            👀 ${this.watchers.size ? [...this.watchers.values()].map(esc).join(', ') : 'no watchers'}`;
        }
        const v = this.view;
        if (!v) return 'Joined! Waiting for the room details…';
        const nm = s => okName(s) ? esc(s) : '?', ch = i => C[int(i, 0, C.length - 1, 0)].name;
        return `You're ${this.myRole === 'player' ? '<b>playing</b>' : '<b>watching</b>'}.<br>
          🥊 <b>${nm(v.host?.name)}</b> — ${ch(v.host?.char)}<br>
          🥊 ${v.p2 ? `<b>${nm(v.p2.name)}</b> — ${ch(v.p2.char)}` : '<i>waiting for a player…</i>'}<br>
          👀 ${Array.isArray(v.watchers) && v.watchers.length ? v.watchers.filter(okName).map(esc).join(', ') : 'no watchers'}<br>
          ${STAGES[int(v.stage, 0, STAGES.length - 1, 0)].name} · ${v.mode === MODES.STAMINA ? 'Stamina' : 'Stock'}<br><i>Waiting for the host to start…</i>`;
      }
    }
    return '';
  }
  render() {
    if (this.game.state !== 'online') return;
    const rows = this.rowsFor(); this.sel = Math.min(this.sel, rows.length - 1);
    const html = rows.map((r, i) => r.go
      ? `<div class="row go ${i === this.sel ? 'sel' : ''}" data-i="${i}">${r.label}</div>`
      : `<div class="row ${i === this.sel ? 'sel' : ''}" data-i="${i}"><span>${r.label}</span>${r.val ? `<span class="val"><span data-d="-1">◀</span> ${r.val()} <span data-d="1">▶</span></span>` : ''}</div>`).join('');
    $menu().innerHTML = `<div class="setup online"><h2>🌐 PLAY ONLINE</h2><div class="info">${this.info()}</div>${html}
      <div class="help">W/S or ↑↓ pick · A/D or ←→ change · Enter / A choose · Esc back · or use the mouse</div></div>`;
  }
  tick(inp) {
    const m = inp.menu, rows = this.rowsFor();
    if (!rows.length) return;
    if (m.up) { this.sel = (this.sel + rows.length - 1) % rows.length; this.render(); }
    if (m.down) { this.sel = (this.sel + 1) % rows.length; this.render(); }
    const r = rows[Math.min(this.sel, rows.length - 1)];
    if ((m.left || m.right) && r.set) { r.set(m.left ? -1 : 1); this.render(); }
    if (m.confirm && r.act) r.act();
    else if (m.back && !(this.role === 'host' && this.requests?.length)) rows[rows.length - 1].act();
  }
  click(e) {
    if (this.game.state !== 'online') return;
    const row = e.target.closest('[data-i]'); if (!row) return;
    const rows = this.rowsFor(), i = +row.dataset.i, r = rows[i]; if (!r) return;
    this.sel = i;
    const d = e.target.closest('[data-d]');
    if (d && r.set) { r.set(+d.dataset.d); this.render(); }
    else if (r.act) r.act();
    else if (r.set) { r.set(1); this.render(); }
  }
}
