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
    constructor() {
      super();
      this._handleIds = new Set();
    }
    setViews(views) {
      let arc = null;
      this.on(views, 'products', 'change', async e => {
        if (!arc) {
          arc = await this.constructInnerArc();
        }
        let productsHandle = views.get('products');
        let productsList = await productsHandle.toList();
        let hostedParticle = await views.get('hostedParticle').get();
        let resultsHandle = views.get('results');
        for (let [index, product] of productsList.entries()) {
          if (this._handleIds.has(product.id)) {
            continue;
          }

          let productHandle = await arc.createHandle(productsHandle.type.primitiveType(), 'product' + index);
          let resultHandle = await arc.createHandle(productsHandle.type.primitiveType(), 'result' + index);
          this._handleIds.add(product.id);

          let recipe = Particle.buildManifest`
${hostedParticle}
recipe
  use '${productHandle._id}' as v1
  use '${resultHandle._id}' as v2
  ${hostedParticle.name}
    ${hostedParticle.connections[0].name} <- v1
    ${hostedParticle.connections[1].name} -> v2
`;

          try {
            await arc.loadRecipe(recipe, this);
            productHandle.set(product);
          } catch (e) {
            console.log(e);
          }

          resultHandle.on('change', async e => {
            let result = await resultHandle.get();
            if (result) {
              resultsHandle.store(result);
            }
          }, this);
        }
      });
    }
  };
});
