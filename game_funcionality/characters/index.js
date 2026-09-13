import vexo from './vexo.js';
import astra from './astra.js';
import draxos from './draxos.js';
import dell from './kingDell.js';
import bogo from './bogoElf.js';
import caza from './queenCaza.js';
import breakrock from './breakrockKing.js';
import rockheart from './rockheart.js';
import coma from './queenComa.js';
import headson from './headson.js';
import belledon from './belledon.js';

// The whole roster from Marco's sheet.
export const CHARACTERS = [vexo, astra, draxos, dell, bogo, caza, breakrock, rockheart, coma, headson, belledon];
// Names on the sheet with no model yet: shown as silhouettes on the cover and greyed in the menu.
export const LOCKED_BUILDS = [];
export const LOCKED = LOCKED_BUILDS.map(b => b.name);
export const byId = id => CHARACTERS.find(c => c.id === id);
