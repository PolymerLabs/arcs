/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({SimpleParticle, resolver, log}) => {

  importScripts(resolver(`$here/tf.js`));

  return class extends self.TfMixin(SimpleParticle) {
    async update({yHat, labels, k}) {
      if (yHat && labels) {
        const topK = k || 5;
        log(`Converting tensor output to top ${topK} labels...`);
        const predictions = await this.tf.getTopKClasses(yHat, labels, topK);
        const results = predictions.map(p => ({confidence: p.probability, label: p.className}));
        this.set('predictions', results);
        log(results);
      }
    }
  };

});
