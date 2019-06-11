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

  const handleName = 'predictions';

  return class extends DomParticle {
    willReceiveProps({yHat, labels, k}) {
      const topK = k || 5;

      if (yHat && labels) {
        this.apply(yHat, labels, topK);
      }
    }

    async apply(yHat_, labels_, topK) {
      log(`Converting tensor output to top ${topK} labels...`);

      const yHat = yHat_.ref;
      const labels = this.toList(labels_);

      const predictions = await this.service({call: 'tf.getTopKClasses', yHat, labels, topk});
      const results = predictions.map(p => ({confidence: p.probability, label: p.className}));
      log(results);

      await this.clearHandle(handleName);
      this.updateSingleton(handleName, results);
    }

    toList(shape) {
      return shape.map((s) => s.dim);
    }

  };
});
