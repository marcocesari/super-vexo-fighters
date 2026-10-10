import vexo from './vexo.js?v=781da9a-1791645966';
import astra from './astra.js?v=781da9a-1791645966';
import draxos from './draxos.js?v=781da9a-1791645966';
import dell from './kingDell.js?v=781da9a-1791645966';
import bogo from './bogoElf.js?v=781da9a-1791645966';
import caza from './queenCaza.js?v=781da9a-1791645966';
import breakrock from './breakrockKing.js?v=781da9a-1791645966';
import rockheart from './rockheart.js?v=781da9a-1791645966';
import coma from './queenComa.js?v=781da9a-1791645966';
import headson from './headson.js?v=781da9a-1791645966';
import belledon from './belledon.js?v=781da9a-1791645966';

// The whole roster from Marco's sheet.
export const CHARACTERS = [vexo, astra, draxos, dell, bogo, caza, breakrock, rockheart, coma, headson, belledon];
// Names on the sheet with no model yet: shown as silhouettes on the cover and greyed in the menu.
export const LOCKED_BUILDS = [];
export const LOCKED = LOCKED_BUILDS.map(b => b.name);
export const byId = id => CHARACTERS.find(c => c.id === id);
