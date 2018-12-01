import {Xen} from '../lib/xen.js';
Xen.Debug.level = 2;

import {Const} from '../configuration/constants.js';
Object.assign(document.querySelector('web-shell'), {
  root: '../..' // path to arcs/
});
