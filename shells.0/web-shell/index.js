import {Xen} from '../lib/xen.js';

const params = (new URL(document.location)).searchParams;
const logLevel = params.get('logLevel') || (params.has('log') ? 2 : Xen.Debug.level);

window.debugLevel = Xen.Debug.level = logLevel;

// configure root path
Object.assign(document.querySelector('web-shell'), {
  root: '../..' // path to arcs/
});
