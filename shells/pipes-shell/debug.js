import {g} from './global.js';

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
