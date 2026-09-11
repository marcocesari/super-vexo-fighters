import { Game } from './game.js';

new p5(p => {
  const game = new Game(p);
  p.setup = () => game.setup();
  p.draw = () => game.draw();
  p.windowResized = () => game.resize();
}, document.getElementById('game'));
