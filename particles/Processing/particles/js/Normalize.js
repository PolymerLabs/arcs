/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({DomParticle, log}) => {

  const handleName = 'normTensor';

  return class extends DomParticle {
    willReceiveProps({tensor, range}) {
      if (tensor && range) {
        this.apply(tensor, range);
      }
    }

    async apply(tensor, range) {
      const t = this.getRef(tensor);

      log('Normalizing...');
      const tNorm = await this.service({call: 'tf.normalize', input: t, range});
      log('Normalized.');

      await this.clearHandle(handleName);
      this.updateSingleton(handleName, {ref: tNorm});
    }

    getRef(r) {
      return r.ref ? r.ref : r;
    }
  };
});
