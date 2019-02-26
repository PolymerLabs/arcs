let g;
if (typeof window !== 'undefined') {
  g = window;
} else if (typeof global !== 'undefined') {
  g = global;
} else {
  g = {};
}

g.envPaths = {
  root: '.',
  map: {
    'https://$build/': `../lib/build/`,
    'https://$particles/': `../../particles/`
  }
};

let logLevel = 0;
if (typeof window !== 'undefined') {
  const params = (new URL(document.location)).searchParams;
  if (params.has('log')) {
    const log = params.get('log');
    logLevel = log === '' ? 2 : (Number(log) || 0);
    console.log(`setting logLevel = ${logLevel}`);
  }
}

g.logLevel = logLevel;

import {Xen} from '../lib/xen.js';
Xen.Debug.level = window.logLevel;