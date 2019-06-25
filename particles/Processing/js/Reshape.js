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
    async update({tensor, shape}) {
      if (tensor && shape) {
        log('Reshaping...');
        await this.set('newTensor', await this.tf.reshape(tensor, shape));
        log('Reshaped.');
      }
    }
  };

});
