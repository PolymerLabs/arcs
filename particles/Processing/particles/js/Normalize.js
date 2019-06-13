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
    update({tensor, range}) {
      if (tensor && range) {
        this.apply(tensor, range);
      }
    }

    async apply(tensor_, range_) {

      const input = tensor_.ref;
      const range = this.toList(range_);

      log('Normalizing...');
      const tNorm = await this.service({call: 'tf.normalize', input, range});
      log('Normalized.');

      this.updateSingleton(handleName, {ref: tNorm});
    }

    toList(shape) {
      return shape.map((s) => s.dim);
    }
  };
});
