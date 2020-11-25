/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// HTMLImports compatibility stuff, delete soonish
if (typeof document !== 'undefined' && !('currentImport' in document)) {
  Object.defineProperty(document, 'currentImport', {
    get() {
      const script = this.currentScript;
      let doc = script.ownerDocument || this;
      // this code for CEv1 compatible HTMLImports polyfill (aka modern)
      if (window['HTMLImports']) {
        doc = window.HTMLImports.importForElement(script);
        doc.URL = script.parentElement.href;
      }
      return doc;
    }
  });
}
