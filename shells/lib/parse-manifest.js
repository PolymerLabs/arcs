import {Manifest} from './arcs.js';
import {Env} from './arcs.js';

export const parseManifest = async (content, options) => {
  const localOptions = {
    id: 'in-memory.manifest',
    fileName: './in-memory.manifest',
    loader: Env.loader
  };
  if (options) {
    Object.assign(localOptions, options);
  }
  return Manifest.parse(content, localOptions);
};