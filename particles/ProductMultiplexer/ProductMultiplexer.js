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

defineParticle(({TransformationDomParticle}) => {
  return class ProductMultiplexer extends TransformationDomParticle {
    constructor() {
      super();
      this._itemSubIdByHostedSlotId = new Map();
      this._connByHostedConn = new Map();
    }
    async setViews(views) {
      let arc = await this.constructInnerArc();

      let hostedParticle = await views.get('hostedParticle').get();

      // Map all additional connections.
      let otherMappedViews = [];
      let otherConnections = [];
      let index = 2;
      for (let [connectionName, otherView] of views) {
        if (['list', 'hostedParticle'].includes(connectionName)) {
          continue;
        }
        otherMappedViews.push(`map '${await arc.mapHandle(otherView._view)}' as v${index}`);
        let hostedOtherConnectionName = hostedParticle.connections.find(conn => conn.type.equals(otherView.type)).name;
        otherConnections.push(`${hostedOtherConnectionName} <- v${index++}`);
        this._connByHostedConn.set(hostedOtherConnectionName, connectionName);
      }

      this.on(views, 'list', 'change', async e => {
        let handleIds = new Set(this._state.renderModel && this._state.renderModel.items ? this._state.renderModel.items.map(item => item.subId) : []);

        let listHandle = views.get('list');
        let list = await listHandle.toList();

        if (list.length > 0) {
          this.relevance = 0.1;
        }

        for (let [index, item] of list.entries()) {
          if (handleIds.has(item.id)) {
            continue;
          }
          let itemView = await arc.createHandle(listHandle.type.primitiveType(), 'item' + index);

          let hostedSlotName = [...hostedParticle.slots.keys()][0];
          let slotName = [...this.spec.slots.values()][0].name;
          let slotId = await arc.createSlot(this, slotName, hostedParticle.name, hostedSlotName);
          if (!slotId) {
            continue;
          }

          this._itemSubIdByHostedSlotId.set(slotId, item.id);


          let recipe = `
${this.serializeSchema(hostedParticle)}
recipe
  use '${itemView._id}' as v1
  ${otherMappedViews.join('\n')}
  slot '${slotId}' as s1
  ${hostedParticle.name}
    ${hostedParticle.connections[0].name} <- v1
    ${otherConnections.join('\n')}
    consume ${hostedSlotName} as s1
`;
          try {
            await arc.loadRecipe(recipe, this);
            itemView.set(item);
          } catch (e) {
            console.log(e);
          }
        }

        // Update props of all particle's views.
        this._updateAllViews(views, this.config);
      });
    }

    _willReceiveProps(props) {
      let newItems = TransformationDomParticle.propsToItems(props.list);
      // Join with existing items in particle's state.
      if (this._state.renderModel && this._state.renderModel.items) {
        newItems.forEach(newItem => {
          let item = this._state.renderModel.items.find(item => item.subId == newItem.subId);
          if (!!item) {
            return Object.assign(newItem, item);
          }
        });
      }
      this._setState({renderModel: {items: newItems}});
    }

    combineHostedModel(slotName, hostedSlotId, content) {
      let subId = this._itemSubIdByHostedSlotId.get(hostedSlotId);
      if (!subId) {
        return;
      }
      let items = this._state.renderModel ? this._state.renderModel.items : [];
      let listIndex = items.findIndex(item => item.subId == subId);
      if (listIndex >= 0 && listIndex < items.length) {
        items[listIndex] = Object.assign({}, content.model, items[listIndex]);
      } else {
        items.push(Object.assign({}, content.model, {subId}));
      }
      this._setState({renderModel: {items}});
    }

    combineHostedTemplate(slotName, hostedSlotId, content) {
      if (!this._state.template && !!content.template) {
        let template = content.template;
        // Replace hosted particle connection in template with the corresponding this particle connection names.
        // TODO: make this generic!
        this._connByHostedConn.forEach((conn, hostedConn) => {
          template = template.replace(new RegExp(`{{${hostedConn}.description}}`, 'g'), `{{${conn}.description}}`);
        });
        this._setState({template});
      }
    }
  };
});
