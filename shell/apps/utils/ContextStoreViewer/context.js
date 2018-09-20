import Arcs from '../../../lib/arcs.js';

const createContext = async (loader, content) => {
  // TODO(sjmiles): do we need to be able to `config` this value?
  const fileName = './in-memory.manifest';
  try {
    return await Arcs.Runtime.parseManifest(content || '', {loader, fileName});
  } catch (x) {
    warn(x);
    return await Arcs.Runtime.parseManifest('', {loader, fileName});
  }
};

export {createContext};
