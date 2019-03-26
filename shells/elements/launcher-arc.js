import {ArcElementBase} from './arc-element.js';
import {Xen} from '../lib/xen.js';
import {Const} from '../configuration/constants.js';
import {logFactory} from '../../build/platform/log-web.js';

const log = logFactory('LauncherArc', '#cb23a6');

const manifests = {
  launcher: `
    import 'https://$particles/Arcs/Launcher.recipe'
  `
};

// const template = Xen.Template.html`
//   <arc-element config="{{config}}"></arc-element>
// `;

const LauncherArcElement = class extends ArcElementBase {
  // get config() {
  //   return {
  //     id: `${userid}${Const.launcherSuffix}`,
  //     manifest: manifests.launcher
  //   };
  // }
};
customElements.define('launcher-arc', Xen.Debug(LauncherArcElement, log));
