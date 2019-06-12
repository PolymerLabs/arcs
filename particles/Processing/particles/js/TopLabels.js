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

      const predictions = await this.service({call: 'tf.getTopKClasses', yHat, labels, topK});

      await this.clearHandle(handleName);

      const ctor = this.handles.get(handleName).entityClass;

      for (const pred in predictions) {
        this.updateCollection(handleName, new ctor({confidence: pred.probability, label: pred.className}));
      }
    }

    toList(shape) {
      return shape.map((s) => s.label);
    }

  };
});
