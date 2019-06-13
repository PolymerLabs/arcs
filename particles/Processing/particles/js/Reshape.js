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
    update({tensor, shape}) {
      if (tensor && shape) {
        this.apply(tensor, shape);
      }
    }

    async apply(tensor_, shape_) {
      const input = tensor_.ref;
      const shape = this.toList(shape_);

      log('Reshaping...');
      const newTensor = await this.service({call: 'tf.reshape', input, shape});
      log('Reshape.');

      this.updateSingleton(handleName, {ref: newTensor});
    }

    toList(shape) {
      return shape.map((s) => s.dim);
    }
  };
});
