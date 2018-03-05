/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../components/xen/xen.js';

import {deduplicate, flatten} from './data-processing.js';

class BrowserDataReceiver extends Xen.Base {

  static get observedAttributes() {
    return ['arc'];
  }

  _update(props, state, lastProps, lastState) {
    const manifestMimeType = 'text/x-arcs-manifest';

    // if there isn't a listener attached for data, attach that
    if (!state.listenerAttached) {
      state.listenerAttached = window.addEventListener('message', event => {
        if (event.source != window || event.data.method != 'injectArcsData' ||
            !event.data || !event.data.entities) {
          return;
        }
        BrowserDataReceiver.log(
            `received event ${event.data.method} from ${event.source}`,
            event.data);

        state.processedData = {
          'entities': deduplicate(flatten(event.data.entities))
        };
        if (state.processedData.entities[manifestMimeType]) {
          state.processedData.manifests =
              state.processedData.entities[manifestMimeType].map(
                  manifest => manifest.url);
          delete state.processedData.entities[manifestMimeType];
        }

        // The `sentData` check is an optimization, and could be removed. It
        // prevents sending the same data again (since we don't currently
        // support dynamic data).
        if (state.processedData && !state.sentData) {
          this._fire('data', state.processedData);
          state.sentData = true;
          BrowserDataReceiver.log(
              'sent processed data out to Arcs for processing',
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
      BrowserDataReceiver.log('requested injection of browser data');
    }
  }
}
BrowserDataReceiver.log = Xen.Base.logFactory('BrowserDataReceiver', '#883997');
customElements.define('browser-data-receiver', BrowserDataReceiver);
