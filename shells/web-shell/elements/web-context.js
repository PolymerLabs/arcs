/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Xen} from '../../lib/components/xen.js';
//import {UserContext} from '../../lib/components/user-context.js';
//import {initShares} from '../../lib/shares.js';
import {logsFactory} from '../../../build/platform/logs-factory.js';

const {log} = logsFactory('UserContext', '#4f0433');

class WebContext extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['storage', 'context'];
  }
  update(props, state) {
    if (props.storage && props.context && state.context !== props.context) {
      state.context = props.context;
      this.updateContext(props, state);
    }
  }
  async updateContext({context, storage}) {
    // TODO(sjmiles): defeat sharing while onboarding StorageNG
    // await initShares(context);
    // //await this.disposeUserContext(userContext);
    // const userContext = new UserContext(context, storage);
    // this.state = {userContext};
    // await userContext.ready;
    this.fire('context', context);
  }
  async disposeUserContext(userContext) {
    //
  }
}
customElements.define('web-context', WebContext);
