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
    willReceiveProps({tensor, model}, state) {
      if (model && tensor) {
        this.inference(model, tensor);
      }
    }

    async inference(model, tensor) {
      const m = this.getRef(mode);
      const t = this.getRef(tensor);

      log('Classifying...');
      const yHat = await this.service({call: 'tf.predict', model: m, inputs: t});
      log('Classified.');

      await this.clearHandle(handleName);
      this.updateSingleton(handleName, {ref: yHat});
    }

    getRef(r) {
      return r.ref ? r.ref : r;
    }
  };
});
