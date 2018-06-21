/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({Particle}) => {
  return class ProductFilter extends Particle {
    async setHandles(handles) {
      this._handleIds = new Set();
      this._products = null;
      this._hostedParticle = null;
      this._resultsHandle = handles.get('results');
      this._productType = handles.get('products').type.primitiveType();
      this._arc = await this.constructInnerArc();
    }
    async onHandleSync(handle, model) {
      if (handle.name === 'products') {
        this._products = model;
      } else if (handle.name === 'hostedParticle') {
        this._hostedParticle = model;
      }
      if (this._products === null || this._hostedParticle === null) {
        return;
      }

      for (let [index, product] of this._products.entries()) {
        if (this._handleIds.has(product.id)) {
          continue;
        }

        let productHandle = await this._arc.createHandle(this._productType, 'product' + index);
        let resultHandle = await this._arc.createHandle(this._productType, 'result' + index, this);
        this._handleIds.add(product.id);

        let recipe = Particle.buildManifest`
          ${this._hostedParticle}
          recipe
            use '${productHandle._id}' as handle1
            use '${resultHandle._id}' as handle2
            ${this._hostedParticle.name}
              ${this._hostedParticle.connections[0].name} <- handle1
              ${this._hostedParticle.connections[1].name} -> handle2
          `;

        await this._arc.loadRecipe(recipe, this);
        productHandle.set(product);
      }
    }
    async onHandleUpdate(handle, update) {
      if (handle.name.startsWith('result')) {
        this._resultsHandle.store(update.data);
      }
    }
  };
});
