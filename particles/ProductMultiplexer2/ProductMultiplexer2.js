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

defineParticle(({DomParticle}) => {
  return class ProductMultiplexer2 extends DomParticle {
    constructor() {
      super();
      this._handleIds = new Set();
    }
    async setViews(views) {
      let arc = await this.constructInnerArc();
      this.on(views, 'list', 'change', async e => {
        var listHandle = views.get('list');
        var list = await listHandle.toList();

        if (list.length > 0) {
          this.relevance = 0.1;
        }

        var othersView = views.get('others');
        let othersMappedId = await arc.mapHandle(othersView._view);

        let hostedParticle = await views.get('hostedParticle').get();
        let productConnName = hostedParticle.connections.find(conn => conn.type.equals(listHandle.type.primitiveType())).name;
        let otherConnName = hostedParticle.connections.find(conn => conn.type.equals(othersView.type)).name;
        this.handleByHostedHandle.set(otherConnName, 'others');

        for (let [index, item] of list.entries()) {
          if (this._handleIds.has(item.id)) {
            continue;
          }
          let itemView = await arc.createHandle(listHandle.type.primitiveType(), 'item' + index);
          this._handleIds.add(item.id);

          let hostedSlotName = [...hostedParticle.slots.keys()][0];
          let slotName = [...this.spec.slots.values()][0].name;
          let slotId = await arc.createSlot(this, slotName, hostedParticle.name, hostedSlotName);
          if (!slotId) {
            continue;
          }

          this.hostedSlotBySlotId.set(slotId, {subId: item.id});

          var recipe = `
            import '${hostedParticle.implFile.replace(/\.[^\.]+$/, '.manifest')}'
            recipe
              use '${itemView._id}' as v1
              map '${othersMappedId}' as v2
              slot '${slotId}' as s1
              ${hostedParticle.name}
                ${productConnName} <- v1
                ${otherConnName} <- v2
                consume ${hostedSlotName} as s1
          `;

          try {
            await arc.loadRecipe(recipe, this);
            itemView.set(item);
          } catch (e) {
            console.log(e);
          }
        }
      });
    }
    _shouldRender(props) {
      return false;
    }
  };
});
