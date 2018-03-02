/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {filter, flatten, deduplicate} from './data-processing.js';
import Xen from '../../components/xen/xen.js';

class ChromeData extends Xen.Base {
  static get observedAttributes() { return ['arc']; }

  _update(props, state, lastProps, lastState) {
    // if there isn't a listener attached for data, attach that
    if (!state.listenerAttached) {
      state.listenerAttached = window.addEventListener('message', event => {
        if (event.source != window || event.data.method != 'injectArcsData'
            || !event.data || !event.data.entities) {
          return;
        }
        ChromeData.log(`received event ${event.data.method} from ${event.source}`,
          event.data);

        state.processedData = {'entities': deduplicate(flatten(filter(event.data.entities)))};
        if (state.processedData.entities['text/x-arcs-manifest']) {
          state.processedData.manifests = state.processedData.entities['text/x-arcs-manifest'].map(manifest => manifest.url);
          delete state.processedData.entities['text/x-arcs-manifest'];
        }

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

    // A populated arc is a proxy for the document reaching an idle state,
    // which indicates the content script is ready to receive events. Fire off
    // a request for a page load.
    if (props.arc && !state.requestedDataInjection) {
      window.postMessage({method: 'pleaseInjectArcsData'}, '*');
      state.requestedDataInjection = true;
      ChromeData.log('requested injection of browser data');
    }
  }
}
ChromeData.log = Xen.Base.logFactory('ChromeData', '#883997');
customElements.define('chrome-data', ChromeData);
