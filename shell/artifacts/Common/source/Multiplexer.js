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
  return class Multiplexer extends TransformationDomParticle {
    constructor() {
      super();
      this._itemSubIdByHostedSlotId = new Map();
      this._connByHostedConn = new Map();
    }
    async setViews(views) {
      this.handleIds = {};
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
        otherMappedViews.push(`map '${await arc.mapHandle(otherView._proxy)}' as v${index}`);
        let hostedOtherConnection = hostedParticle.connections.find(conn => conn.type.equals(otherView.type));
        if (hostedOtherConnection) {
          otherConnections.push(`${hostedOtherConnection.name} <- v${index++}`);
          this._connByHostedConn.set(hostedOtherConnection.name, connectionName);
        }
      }
      this.setState({arc, type: views.get('list').type, hostedParticle, otherMappedViews, otherConnections});

      super.setViews(views);
    }

    async willReceiveProps({list}) {
      if (list.length > 0) {
        this.relevance = 0.1;
      }
      let arc = this._state.arc;
      let type = this._state.type;
      let hostedParticle = this._state.hostedParticle;
      let otherMappedViews = this._state.otherMappedViews;
      let otherConnections = this._state.otherConnections;

      for (let [index, item] of list.entries()) {
        if (this.handleIds[item.id]) {
          let itemView = await this.handleIds[item.id];
          itemView.set(item);
          continue;
        }

        let itemViewPromise = arc.createHandle(type.primitiveType(), 'item' + index);
        this.handleIds[item.id] = itemViewPromise;

        let itemView = await itemViewPromise;

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
    }

    combineHostedModel(slotName, hostedSlotId, content) {
      let subId = this._itemSubIdByHostedSlotId.get(hostedSlotId);
      if (!subId) {
        return;
      }
      let items = this._state.renderModel ? this._state.renderModel.items : [];
      let listIndex = items.findIndex(item => item.subId == subId);
      let item = Object.assign({}, content.model, {subId});
      if (listIndex >= 0 && listIndex < items.length) {
        items[listIndex] = item;
      } else {
        items.push(item);
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
