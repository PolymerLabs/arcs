/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {Xen} from '../../lib/xen.js';
import {ArcHost} from '../../lib/arc-host.js';

const log = Xen.logFactory('WebArc', '#cb23a6');

export class WebArc extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['env', 'context', 'storage', 'composer', 'config'];
  }
  _update({env, context, storage, composer, config}, state) {
    if (!state.host && env && storage && config) {
      this.state = {host: new ArcHost(env, context, storage, composer)};
    }
    if (state.host && config && config !== state.config) {
      this.state = {config};
      this.spawnArc(config, state);
    }
  }
  async spawnArc(config, state) {
    state.host.dispose();
    this.state = {arc: await state.host.spawn(config)};
    if (state.host.plan) {
      this.fire('recipe', state.host.plan);
    }
    this.fire('arc', state.arc);
  }
}
customElements.define('web-arc', WebArc);
