/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({DomParticle, log, resolver}) => {

  importScripts(resolver(`$here/tf.js`));

  return class extends self.TfMixin(DomParticle) {
    async update({modelSpec}) {
      if (modelSpec) {
        const model = await this.tf.loadLayersModel(modelSpec.location, modelSpec.options);
        await this.set('model', model);
        try {
          await this.tf.warmUp(model);
        } catch {
          log('Warm up failed');
        }
      }
    }
  };

});
