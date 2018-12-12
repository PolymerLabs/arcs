import {Xen} from '../lib/xen.js';
const params = (new URL(document.location)).searchParams;
const logLevel = params.get('logLevel') || (params.has('log') ? 2 : Xen.Debug.level);
Xen.Debug.level = logLevel;

import {Xen as XD} from '../env/arcs.js';
XD.Debug.level = logLevel;

// configure root path
Object.assign(document.querySelector('web-shell'), {
  root: '../..' // path to arcs/
});
