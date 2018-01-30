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
  return class ProductMultiplexer extends DomParticle {
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

        let hostedParticle = await views.get('hostedParticle').get();
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
${this.serializeSchema(hostedParticle)}
recipe
  use '${itemView._id}' as v1
  slot '${slotId}' as s1
  ${hostedParticle.name}
    ${hostedParticle.connections[0].name} <- v1
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
