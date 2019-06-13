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
    update({images, size, options}) {
      if (images && size) {
        this.apply(images, size, options);
      }
    }

    async apply(images_, size_, options) {
      const images = images_.ref;
      const size = this.toList(size_);
      const alignCorners = options ? options.alignCorners : false;

      log('Resizing...');
      const newTensor = await this.service({call: 'tf.resizeBilinear', images, size, alignCorners});
      log('Resized.');

      this.updateSingleton(handleName, {ref: newTensor});
    }

    toList(shape) {
      return shape.map((s) => s.dim);
    }
  };
});
