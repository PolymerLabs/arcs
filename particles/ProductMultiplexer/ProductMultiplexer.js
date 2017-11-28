/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

"use strict";

defineParticle(({DomParticle}) => {
  return class ProductMultiplexer extends DomParticle {
    async setViews(views) {
      let arc = await this.constructInnerArc();
      var productsView = views.get('products');
      var productsList = await productsView.toList();
      for (let [index, product] of productsList.entries()) {
        let productView = await arc.createView(productsView.type.primitiveType(), "product" + index);

        // TODO: fetch the particle from "hostedParticle" handle.
        // let hostedParticle = await views.get('hostedParticle').get();
        let hostedParticle = {
          name: "ArrivinatorX",
          implFile: "../particles/ArrivinatorX/ArrivinatorX.js",
          slots: new Map([["annotation", {} ]])
        };

        let hostedSlotName =  [...hostedParticle.slots.keys()][0];
        let slotName = [...this.spec.slots.values()][0].name;
        let slotId = await arc.createSlot(this, slotName, hostedParticle.name, hostedSlotName);

        this.hostedSlotBySlotId.set(slotId, {subId: product.name.replace(/ /g,'').toLowerCase()});

        var recipe = `
          import '${hostedParticle.implFile.replace(/\.[^\.]+$/, ".manifest")}'
          recipe
            use '${productView._id}' as v1
            slot '${slotId}' as s1
            ${hostedParticle.name}
              product <- v1
              consume ${hostedSlotName} as s1
        `;

        try {
          await arc.loadRecipe(recipe, this);
          productView.set(product);
        } catch (e) {
          console.log(e);
        }
      }
    }

    _shouldRender(props) {
      return false;
    }
  }
});
