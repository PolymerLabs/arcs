/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../components/xen/xen.js';

class ChromeData extends Xen.Base {
  static get observedAttributes() { return ['arc']; }

  _update(props, state, lastProps, lastState) {
    // if there isn't a listener attached for data, attach that
    if (!state.listenerAttached) {
      state.listenerAttached = window.addEventListener('message', event => {
        if (event.source != window || event.data.method != 'injectArcsData') {
          return;
        }
        ChromeData.log(`received event ${event.data.method} from ${event.source}`,
          event.data);

        // XXX process the data and put it on the stack
        state.processedData = event.data.entities;

        // Long-term we shouldn't need a check here, this should be idempotent and
        // should just run again.
        if (state.processedData && !state.sentData) {
          this._fire('data', state.processedData);
          state.sentData = true;
          ChromeData.log('sent processed data out to Arcs for processing',
            state.processedData);
        }
      });
    }

    // If there isn't a request to get data, fire that off - once we have an
    // arc.
    if (props.arc && !state.requestedDataInjection) {
      window.postMessage({method: 'pleaseInjectArcsData'}, '*');
      state.requestedDataInjection = true;
      ChromeData.log('requested injection of browser data');
    }
  }
}
ChromeData.log = Xen.Base.logFactory('ChromeData', '#883997');
customElements.define('chrome-data', ChromeData);
