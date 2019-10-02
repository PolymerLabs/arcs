/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({SimpleParticle, resolver, log}) => {

  importScripts(resolver(`$here/tf.js`));

  return class extends self.TfMixin(SimpleParticle) {
    async update({resource}) {
      if (resource) {
        log('Disposing...');
        await this.tf.dispose(resource);
        log('Disposed.');
      }
    }
  };
});
