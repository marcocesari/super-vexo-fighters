import { Game } from './game.js?v=611e15a-1791647664';

new p5(p => {
  const game = new Game(p); window.game = game;   // handy for poking at it from the console
  p.setup = () => game.setup();
  p.draw = () => game.draw();
  p.windowResized = () => game.resize();
}, document.getElementById('game'));
