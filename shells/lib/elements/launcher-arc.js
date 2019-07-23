/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logFactory} from '../../../build/platform/log-web.js';
import {Xen} from '../components/xen.js';
import {ArcElement} from './arc-element.js';

const log = logFactory('LauncherArc', '#cb23a6');

// const manifests = {
//   launcher: `
//     import 'https://$particles/Arcs/Launcher.arcs'
//   `
// };

// const template = Xen.Template.html`
//   <arc-element config="{{config}}"></arc-element>
// `;

const LauncherArcElement = class extends ArcElement {
  // get config() {
  //   return {
  //     id: `${userid}${Const.DEFAULT.launcherSuffix}`,
  //     manifest: manifests.launcher
  //   };
  // }
};
customElements.define('launcher-arc', Xen.Debug(LauncherArcElement, log));
