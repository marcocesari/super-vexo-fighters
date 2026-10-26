import vexo from './vexo.js?v=mobile-1793033526';
import astra from './astra.js?v=mobile-1793033526';
import draxos from './draxos.js?v=mobile-1793033526';
import dell from './kingDell.js?v=mobile-1793033526';
import bogo from './bogoElf.js?v=mobile-1793033526';
import caza from './queenCaza.js?v=mobile-1793033526';
import breakrock from './breakrockKing.js?v=mobile-1793033526';
import rockheart from './rockheart.js?v=mobile-1793033526';
import coma from './queenComa.js?v=mobile-1793033526';
import headson from './headson.js?v=mobile-1793033526';
import belledon from './belledon.js?v=mobile-1793033526';

// The whole roster from Marco's sheet.
export const CHARACTERS = [vexo, astra, draxos, dell, bogo, caza, breakrock, rockheart, coma, headson, belledon];
// Names on the sheet with no model yet: shown as silhouettes on the cover and greyed in the menu.
export const LOCKED_BUILDS = [];
export const LOCKED = LOCKED_BUILDS.map(b => b.name);
export const byId = id => CHARACTERS.find(c => c.id === id);
