import vexo from './vexo.js?v=d78e745-1791486217';
import astra from './astra.js?v=d78e745-1791486217';
import draxos from './draxos.js?v=d78e745-1791486217';
import dell from './kingDell.js?v=d78e745-1791486217';
import bogo from './bogoElf.js?v=d78e745-1791486217';
import caza from './queenCaza.js?v=d78e745-1791486217';
import breakrock from './breakrockKing.js?v=d78e745-1791486217';
import rockheart from './rockheart.js?v=d78e745-1791486217';
import coma from './queenComa.js?v=d78e745-1791486217';
import headson from './headson.js?v=d78e745-1791486217';
import belledon from './belledon.js?v=d78e745-1791486217';

// The whole roster from Marco's sheet.
export const CHARACTERS = [vexo, astra, draxos, dell, bogo, caza, breakrock, rockheart, coma, headson, belledon];
// Names on the sheet with no model yet: shown as silhouettes on the cover and greyed in the menu.
export const LOCKED_BUILDS = [];
export const LOCKED = LOCKED_BUILDS.map(b => b.name);
export const byId = id => CHARACTERS.find(c => c.id === id);
