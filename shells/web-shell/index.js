// default to semi-verbose logging
import {Xen} from '../lib/xen.js';
Xen.Debug.level = 2;

// configure root path
Object.assign(document.querySelector('web-shell'), {
  root: '../..' // path to arcs/
});
