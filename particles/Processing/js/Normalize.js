/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({DomParticle, resolver, log}) => {

  importScripts(resolver(`$here/tf.js`));

  return class extends self.TfMixin(DomParticle) {
    async update({tensor, range}) {
      if (tensor && range) {
        log('Normalizing...');
        await this.set('normTensor', await this.tf.normalize(tensor, range));
        log('Normalized.');
      }
    }
  };

});
