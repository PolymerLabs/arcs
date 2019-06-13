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

  return class extends DomParticle {
    update({resource}) {
      if (resource) {
        this.apply(resource);
      }
    }

    async apply(resource_) {
      const reference = resource_.ref;
      log('Disposing...');
      await this.service({call: 'tf.dispose', reference});
      log('Disposed.');
    }
  };
});
