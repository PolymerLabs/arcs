import {Xen} from '../lib/xen.js';
Xen.Debug.level = 2;

import {Const} from '../configuration/constants.js';
Object.assign(document.querySelector('web-shell'), {
  root: '../../', // path to arcs/
  storage: `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/${Const.version}`
});
