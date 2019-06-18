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

  const handleName = 'newTensor';

  return class extends DomParticle {
    update({tensor, axis}) {
      if (tensor && axis) {
        this.apply(tensor, axis);
      }
    }

    async apply(tensor_, axis_) {
      const input = tensor_.ref;
      const axis = axis_.dim;

      log('Expanding Dimensions...');
      const newTensor = await this.service({call: 'tf.expandDims', input, axis});
      log('Dimensions Expanded.');

      this.updateSingleton(handleName, {ref: newTensor});
    }

  };
});
