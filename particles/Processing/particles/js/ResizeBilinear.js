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

  const handleName = 'resizedImages';

  return class extends DomParticle {
    willReceiveProps({images, shape, alignCorners}) {
      if (images && shape) {
        this.apply(images, shape, alignCorners);
      }
    }

    async apply(images, size, alignCorners) {
      const t = this.getRef(images);

      log('Resizing...');
      const newTensor = await this.service({call: 'tf.resizeBilinear', images: t, size, alignCorners});
      log('Resized.');

      await this.clearHandle(handleName);
      this.updateSingleton(handleName, {ref: newTensor});
    }

    getRef(r) {
      return r.ref ? r.ref : r;
    }
  };
});
