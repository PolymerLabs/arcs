/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// TODO(sjmiles): not yet a .TS file due to trouble getting LINT to accept the dynamic import

let _fetch;

export const fetch = async (...args) => {
  if (!_fetch) {
    if (typeof window !== 'undefined') {
      _fetch = window.fetch;
    } else {
      //const nodeFetch = await import('../../node_modules/node-fetch/lib/index.mjs');
      const nodeFetch = await import('../node_modules/node-fetch/lib/index.mjs');
      _fetch = nodeFetch.default;
    }
  }
  return _fetch.apply(null, args);
};
