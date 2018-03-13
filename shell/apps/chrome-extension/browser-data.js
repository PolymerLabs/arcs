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

const manifestMimeType = 'text/x-arcs-manifest';

class BrowserDataReceiver extends Xen.Base {
  static get observedAttributes() {
    return ['arc'];
  }
  _didMount() {
    window.addEventListener('message', event => this.onMessage(event));
  }
  _update({arc}, state) {
    const {requestedDataInjection} = state;
    // A populated arc is a proxy for the document reaching an idle state,
    // which indicates the content script is ready to receive events. Fire off
    // a request for a page load.
    if (arc && !requestedDataInjection) {
      state.requestedDataInjection = true;
      window.postMessage({method: 'pleaseInjectArcsData'}, '*');
      log('requested injection of browser data');
    }
  }
  onMessage(event) {
    const {sentData} = this._state;
    if (event.source !== window || event.data.method !== 'injectArcsData' || !event.data || !event.data.entities) {
      return;
    }
    log(
        `received event ${event.data.method} from ${event.source}`,
        event.data
    );
    const entities = deduplicate(flatten(event.data.entities));
    let manifests;
    if (entities[manifestMimeType]) {
      manifests = entities[manifestMimeType].map(manifest => manifest.url);
      delete entities[manifestMimeType];
    }
    const processedData = {entities, manifests};
    // The `sentData` check is an optimization, and could be removed. It
    // prevents sending the same data again (since we don't currently
    // support dynamic data).
    if (!sentData) {
      this._fire('data', processedData);
      this._setState({sentData: true});
      log(
          'sent processed data out to Arcs for processing',
          processedData
      );
    }
    this._setState({processedData});
  }
}

const log = Xen.Base.logFactory('BrowserDataReceiver', '#883997');
customElements.define('browser-data-receiver', BrowserDataReceiver);
