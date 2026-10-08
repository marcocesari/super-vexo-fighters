import { MODES, STAMINA_HP, SUPER_MAX } from './config.js?v=d78e745-1791486217';
const $ = id => document.getElementById(id);

export class HUD {
  constructor() { this.el = $('hud'); this.ann = $('announce'); this.annT = 0; this.last = [null, null]; }
  show(on) { this.el.classList.toggle('hidden', !on); }
  announce(text, frames = 90, small = false) { this.ann.textContent = text; this.ann.classList.toggle('small', small); this.ann.classList.remove('hidden'); this.annT = frames; }
  update(fighters, mode, timer, fpsText) {
    fighters.forEach((f, i) => {
      const el = $('hud-p' + i); el.className = 'hud-player p' + i + (f.flash > 0 ? ' hit' : '');
      let html = `<div class="name">${f.name}${f.isCPU ? ' <small>CPU</small>' : ''}</div>`;
      if (mode === MODES.STOCK) {
        html += `<div class="pct">${f.dead ? '—' : Math.round(f.percent) + '<small>%</small>'}</div><div class="stocks">${'●'.repeat(f.stocks)}${'○'.repeat(Math.max(0, 3 - f.stocks))}</div>`;
      } else {
        html += `<div class="pct">${Math.max(0, Math.round(f.hp))}<small> HP</small></div><div class="hpbar"><div style="width:${f.hp / STAMINA_HP * 100}%"></div></div>`;
      }
      // the super meter: fills as you land hits, glows when the super is ready
      const ready = f.superMeter >= SUPER_MAX;
      html += `<div class="superbar${ready ? ' ready' : ''}"><div style="width:${Math.floor(f.superMeter / SUPER_MAX * 100)}%"></div><span>${ready ? 'SUPER READY! · B' : 'SUPER'}</span></div>`;
      if (this.last[i] !== html) { el.innerHTML = html; this.last[i] = html; }
    });
    $('hud-timer').textContent = timer;
    if (fpsText !== undefined && (this.fpsT = (this.fpsT || 0) + 1) % 20 === 0) $('hud-fps').textContent = fpsText;
    if (this.annT > 0 && --this.annT === 0) this.ann.classList.add('hidden');
  }
}
