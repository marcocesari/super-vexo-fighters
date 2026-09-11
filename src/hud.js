import { MODES, STAMINA_HP } from './config.js';
const $ = id => document.getElementById(id);

export class HUD {
  constructor() { this.el = $('hud'); this.ann = $('announce'); this.annT = 0; this.last = [null, null]; }
  show(on) { this.el.classList.toggle('hidden', !on); }
  announce(text, frames = 90, small = false) { this.ann.textContent = text; this.ann.classList.toggle('small', small); this.ann.classList.remove('hidden'); this.annT = frames; }
  update(fighters, mode, timer, fps) {
    fighters.forEach((f, i) => {
      const el = $('hud-p' + i); el.className = 'hud-player p' + i + (f.flash > 0 ? ' hit' : '');
      let html = `<div class="name">${f.name}${f.isCPU ? ' <small>CPU</small>' : ''}</div>`;
      if (mode === MODES.STOCK) {
        html += `<div class="pct">${f.dead ? '—' : Math.round(f.percent) + '<small>%</small>'}</div><div class="stocks">${'●'.repeat(f.stocks)}${'○'.repeat(Math.max(0, 3 - f.stocks))}</div>`;
      } else {
        html += `<div class="pct">${Math.max(0, Math.round(f.hp))}<small> HP</small></div><div class="hpbar"><div style="width:${f.hp / STAMINA_HP * 100}%"></div></div>`;
      }
      if (this.last[i] !== html) { el.innerHTML = html; this.last[i] = html; }
    });
    $('hud-timer').textContent = timer;
    if (fps !== undefined && (this.fpsT = (this.fpsT || 0) + 1) % 20 === 0) $('hud-fps').textContent = Math.round(fps) + ' fps';
    if (this.annT > 0 && --this.annT === 0) this.ann.classList.add('hidden');
  }
}
