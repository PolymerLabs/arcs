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

const manifestMimeType = 'text/x-arcs-manifest';

const log = Xen.Base.logFactory('ExtBrowserDataReceiver', '#883997');

class BrowserDataReceiver extends Xen.Base {
  static get observedAttributes() {
    return ['arc'];
  }
  _didMount() {
    window.addEventListener('message', event => this.onMessage(event));
    if (!this._documentReady()) {
      document.addEventListener('readystatechange', () => this._invalidate());
    }
  }
  _documentReady() {
    return {complete: 1}[document.readyState];
  }
  _update({arc}, state) {
    const {requestedDataInjection} = state;
    // A populated arc is a proxy for the document reaching an idle state,
    // which indicates the content script is ready to receive events. Fire off
    // a request for a page load.
     if (/*arc &&*/ this._documentReady() && !requestedDataInjection) {
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
    log(`received event ${event.data.method} from ${event.source}`, event.data);
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
      log('sent processed data out to Arcs for processing', processedData);
    }
    this._setState({processedData});
  }
}

customElements.define('browser-data-receiver', BrowserDataReceiver);

/**
 * Reduce the deeply nested structure of url=>entities-of-many-types to a
 * flatter, combined form of type=>entities.
 *
 * For example, the input would be of the form
 * {'http://g.co': [{@type: 'typeA', 'a': 1}},
 * the output would be
 * {typeA: [{@type: 'typeA', 'a': 1}]}.
 */
function flatten(entities) {
  return Object.entries(entities).reduce((accumulator, [key, value]) => {
    value.forEach(entry => {
      let type = entry['@type'];

      // normalize all https? urls to http in keys
      if (type.match(/^https?:\/\//)) {
        type = type.replace(/^https?:/, 'http:');
      }

      accumulator[type] ? accumulator[type].push(entry) :
                          (accumulator[type] = [entry]);
    });
    return accumulator;
  }, {});
}

/** Returns true iff a & b are pointers to the same object, or if their naive
 * JSON representations (without sorting) are the same. {a, b} != {b, a}.
 */
function _deepIsEqual(a, b) {
  return a === b || JSON.stringify(a) == JSON.stringify(b);
}

/**
 * Removes duplicate entries. Expects the input to match the output format of
 * #flatten().
 */
function deduplicate(entities) {
  return Object.entries(entities).reduce((accumulator, [key, values]) => {
    accumulator[key] = values.reduce((accumulator, value) => {
      let isIncluded =
          accumulator.reduce((a, av) => _deepIsEqual(av, value) || a, false);
      isIncluded || accumulator.push(value);
      return accumulator;
    }, []);
    return accumulator;
  }, {});
}
