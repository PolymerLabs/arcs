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
    willReceiveProps({logits, labels, k}, state) {
      const topK = k || 3;

      if (logits && labels) {
        this.convert(logits, labels, topK);
      }
    }

    async convert(logits, labelUrl, topK) {
      log(`Converting tensor output to top ${topK} labels...`);

      const labels = await this.parseLabelUrl(labelUrl);

      const predictions = await this.service({call: 'postprocess.getTopKClasses', yHat: logits, labels, topk});
      const results = predictions.map(p => ({confidence: p.probability, label: p.className}));
      log(results);

      await this.clearHandle(handleName);
      this.updateSingleton(handleName, results);
    }

    //TODO(alxr) Refactor to a better label representation
    async parseLabelUrl(labelUrl) {
        const document = await fetch(labelUrl).then((r) => r.text());
        return document.split('\n');
    }
  };
});
