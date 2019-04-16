import {logFactory} from '../../../build/platform/log-web.js';
import {Xen} from '../components/xen.js';
import {ArcElement} from './arc-element.js';

const log = logFactory('LauncherArc', '#cb23a6');

// const manifests = {
//   launcher: `
//     import 'https://$particles/Arcs/Launcher.recipe'
//   `
// };

// const template = Xen.Template.html`
//   <arc-element config="{{config}}"></arc-element>
// `;

const LauncherArcElement = class extends ArcElement {
  // get config() {
  //   return {
  //     id: `${userid}${Const.launcherSuffix}`,
  //     manifest: manifests.launcher
  //   };
  // }
};
customElements.define('launcher-arc', Xen.Debug(LauncherArcElement, log));
