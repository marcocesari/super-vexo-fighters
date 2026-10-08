// Cache-buster for the online build. GitHub Pages tells browsers to keep files
// for 10 minutes, and a browser can keep using old game scripts even after a
// refresh. This adds ?v=<stamp> to every script import and to the page's
// stylesheet + main script, so each push looks like brand-new files.
//
// Run it in the deploy copy (never in the project folder):
//   node tools/stamp.mjs <folder> [stamp]
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = process.argv[2];
if (!root) { console.log('usage: node tools/stamp.mjs <folder> [stamp]'); process.exit(1); }
const v = process.argv[3] || Date.now().toString(36);
const tag = s => s.replace(/\?v=[\w-]+/, '') + '?v=' + v;

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) { const p = join(dir, n); statSync(p).isDirectory() ? walk(p, out) : n.endsWith('.js') && out.push(p); }
  return out;
}
let n = 0;
for (const f of walk(join(root, 'game_funcionality'))) {
  const src = readFileSync(f, 'utf8');
  const out = src.replace(/((?:from|import)\s*['"])(\.{1,2}\/[^'"]+?\.js)(?:\?v=[\w-]+)?(['"])/g, (_, a, p, b) => a + tag(p) + b);
  if (out !== src) { writeFileSync(f, out); n++; }
}
const html = join(root, 'index.html');
writeFileSync(html, readFileSync(html, 'utf8').replace(/(game_funcionality\/(?:style\.css|main\.js))(?:\?v=[\w-]+)?/g, (_, p) => tag(p)));
console.log(`stamped ${n} scripts + index.html with ?v=${v}`);
