/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {Xen} from '../../lib/xen.js';
import {UserContext} from '../../lib/components/context/user-context.js';

const log = Xen.logFactory('UserContext', '#4f0433');
const warn = Xen.logFactory('UserContext', '#4f0433', 'warn');

class UserContextElement extends Xen.Debug(Xen.Async, log) {
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
    //await this.disposeUserContext(userContext);
    const userContext = new UserContext(context, storage);
    this.state = {userContext};
    await userContext.ready;
    this.fire('context', context);
  }
  async disposeUserContext(userContext) {
    //
  }
}
customElements.define('user-context', UserContextElement);
