/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

self.Tf = class {
  constructor(scope) {
    this.scope = scope;
  }
  async imageToTensor({url}) {
    return await this.scope.service({call: 'tf.imageToTensor', imageUrl: url});
  }
  async resizeBilinear(images, size, options) {
   return await this.scope.service({
     call: 'tf.resizeBilinear',
     images: images.ref,
     size: size.map(s => s.dim),
     alignCorners: options ? options.alignCorners : false
    });
  }
  async dispose(reference) {
    await this.scope.service({call: 'tf.dispose', reference});
  }
};

self.TfMixin = Base => class extends Base {
  constructor() {
    super();
    this.tf = new self.Tf(this);
  }
  // TODO(sjmiles): move this bit to dom-particle if it's successful
  async set(name, value) {
    const handle = this.handles.get(name);
    if (handle) {
      // TODO(sjmiles): cannot test class of `handle` because I have no
      // references to those classes, i.e. `handle is Singleton`, throws
      // because Singleton is undefined.
      const entity = value.entityClass ? value : new (handle.entityClass)(value);
      if (handle.type.isEntity) {
        return await handle.set(entity);
      }
    }
  }
};
