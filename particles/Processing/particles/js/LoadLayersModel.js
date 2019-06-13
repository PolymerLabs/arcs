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

  const handleName = 'modelReference';

  return class extends DomParticle {
    update({model}) {
      if (model) {
        this.apply(model);
      }
    }

    async apply(model) {
      const model_ = await this.service({
        call: 'tf.loadLayersModel',
        modelUrl: model.location,
        options: model.options,
      });


      this.updateSingleton(handleName, {ref: model_});

      try {
        this.service({call: 'tf.warmUp', model: model_});
      } catch {
        log('Warm up failed');
      }
    }
  };
});
