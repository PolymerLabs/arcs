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

  const handleName = 'labels';
  const delimiter = '\n';

  return class extends DomParticle {
    update({url}) {
      if (url) {
        this.apply(url);
      }
    }

    async apply(urlEntity) {
      log('Parsing labels file...');

      const url = urlEntity.labelsUrl;

      const doc = await fetch(url).then(d => d.text());
      const labels = doc.split(delimiter);
      const labelsSchema = labels.map((label) => ({label}));

      this.appendRawDataToHandle(handleName, labelsSchema);
    }
  };
});
