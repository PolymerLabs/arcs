import {Xen} from '../lib/xen.js';

const params = (new URL(document.location)).searchParams;
Xen.Debug.level = params.get('logLevel') || (params.has('log') ? 2 : Xen.Debug.level);

// configure root path
Object.assign(document.querySelector('web-shell'), {
  root: '../..' // path to arcs/
});
