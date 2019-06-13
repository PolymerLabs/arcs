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

  const handleName = 'yHat';

  return class extends DomParticle {
    update({tensor, model}) {
      if (model && tensor) {
        this.apply(model, tensor);
      }
    }

    async apply(model_, tensor_) {
      const model = model_.ref;
      const inputs = tensor_.ref;

      log('Classifying...');
      const yHat = await this.service({call: 'tf.predict', model, inputs});
      log('Classified.');

      this.updateSingleton(handleName, {ref: yHat});
    }
  };
});
