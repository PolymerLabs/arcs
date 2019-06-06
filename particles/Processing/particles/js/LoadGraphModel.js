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
    willReceiveProps({model}, state) {
      if (model) {
        this.load(model);
      }
    }

    async load(model) {
      const model_ = await this.service({
        call: 'graph-model.load',
        modelUrl: model.location,
        options: model.options,
      });


      await this.clearHandle(handleName);
      this.updateSingleton(handleName, {ref: model_});

      try {
        this.service({call: 'graph-model.warmUp', model_});
      } catch {
        log('Warm up failed');
      }
    }
  };
});
