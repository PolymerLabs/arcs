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
  return class ProductMultiplexer2 extends DomParticle {
    constructor() {
      super();
      this._handleIds = new Set();
    }
    async setViews(views) {
      let arc = await this.constructInnerArc();
      this.on(views, 'products', 'change', async e => {
        var productsView = views.get('products');
        var productsList = await productsView.toList();

        if (productsList.length > 0) {
          this.relevance = 0.1;
        }

        var othersView = views.get('others');
        let othersMappedId = await arc.mapHandle(othersView._view);

        let hostedParticle = await views.get('hostedParticle').get();
        let productConnName = hostedParticle.connections.find(conn => conn.type.equals(productsView.type.primitiveType())).name;
        let otherConnName = hostedParticle.connections.find(conn => conn.type.equals(othersView.type)).name;
        this.handleByHostedHandle.set(otherConnName, 'others');

        for (let [index, product] of productsList.entries()) {
          if (this._handleIds.has(product.id)) {
            continue;
          }
          let productView = await arc.createHandle(productsView.type.primitiveType(), "product" + index);
          this._handleIds.add(product.id);

          let hostedSlotName =  [...hostedParticle.slots.keys()][0];
          let slotName = [...this.spec.slots.values()][0].name;
          let slotId = await arc.createSlot(this, slotName, hostedParticle.name, hostedSlotName);
          if (!slotId) {
            continue;
          }

          this.hostedSlotBySlotId.set(slotId, {subId: product.name.replace(/ /g,'').toLowerCase()});

          var recipe = `
            import '${hostedParticle.implFile.replace(/\.[^\.]+$/, ".manifest")}'
            recipe
              use '${productView._id}' as v1
              map '${othersMappedId}' as v2
              slot '${slotId}' as s1
              ${hostedParticle.name}
                ${productConnName} <- v1
                ${otherConnName} <- v2
                consume ${hostedSlotName} as s1
          `;

          try {
            await arc.loadRecipe(recipe, this);
            productView.set(product);
          } catch (e) {
            console.log(e);
          }
        }
      });
    }
    _shouldRender(props) {
      return false;
    }
  }
});
