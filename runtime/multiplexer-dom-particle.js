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

import ParticleSpec from './particle-spec.js';
import TransformationDomParticle from './transformation-dom-particle.js';

export default class MultiplexerDomParticle extends TransformationDomParticle {
  constructor() {
    super();
    this._itemSubIdByHostedSlotId = new Map();
    this._connByHostedConn = new Map();
  }

  async _mapParticleConnections(
      listHandleName,
      particleHandleName,
      hostedParticle,
      views,
      arc) {
    let otherMappedViews = [];
    let otherConnections = [];
    let index = 2;
    const skipConnectionNames = [listHandleName, particleHandleName];
    for (let [connectionName, otherView] of views) {
      if (skipConnectionNames.includes(connectionName)) {
        continue;
      }
      // TODO(wkorman): For items with embedded recipes we may need a map
      // (perhaps id to index) to make sure we don't map a handle into the inner
      // arc multiple times unnecessarily.
      otherMappedViews.push(
          `map '${await arc.mapHandle(otherView._proxy)}' as v${index}`);
      let hostedOtherConnection = hostedParticle.connections.find(
          conn => conn.isCompatibleType(otherView.type));
      if (hostedOtherConnection) {
        otherConnections.push(`${hostedOtherConnection.name} <- v${index++}`);
        // TODO(wkorman): For items with embedded recipes where we may have a
        // different particle rendering each item, we need to track
        // |connByHostedConn| keyed on the particle type.
        this._connByHostedConn.set(hostedOtherConnection.name, connectionName);
      }
    }
    return [otherMappedViews, otherConnections];
  }

  async setViews(views) {
    this.handleIds = {};
    let arc = await this.constructInnerArc();
    const listHandleName = 'list';
    const particleHandleName = 'hostedParticle';
    let particleView = views.get(particleHandleName);
    let hostedParticle = null;
    let otherMappedViews = [];
    let otherConnections = [];
    if (particleView) {
      hostedParticle = await particleView.get();
      if (hostedParticle) {
        [otherMappedViews, otherConnections] =
            await this._mapParticleConnections(
                listHandleName, particleHandleName, hostedParticle, views, arc);
      }
    }
    this.setState({
      arc,
      type: views.get(listHandleName).type,
      hostedParticle,
      otherMappedViews,
      otherConnections
    });

    super.setViews(views);
  }

  async willReceiveProps(
      {list},
      {arc, type, hostedParticle, otherMappedViews, otherConnections}) {
    if (list.length > 0) {
      this.relevance = 0.1;
    }

    for (let [index, item] of list.entries()) {
      let resolvedHostedParticle = hostedParticle;
      if (this.handleIds[item.id]) {
        let itemView = await this.handleIds[item.id];
        itemView.set(item);
        continue;
      }

      let itemViewPromise =
          arc.createHandle(type.primitiveType(), 'item' + index);
      this.handleIds[item.id] = itemViewPromise;

      let itemView = await itemViewPromise;

      if (!resolvedHostedParticle) {
        // If we're muxing on behalf of an item with an embedded recipe, the
        // hosted particle should be retrievable from the item itself. Else we
        // just skip this item.
        if (!item.renderParticleSpec) {
          continue;
        }
        resolvedHostedParticle =
            ParticleSpec.fromLiteral(JSON.parse(item.renderParticleSpec));
        // Re-map compatible handles and compute the connections specific
        // to this item's render particle.
        const listHandleName = 'list';
        const particleHandleName = 'renderParticle';
        [otherMappedViews, otherConnections] =
            await this._mapParticleConnections(
                listHandleName,
                particleHandleName,
                resolvedHostedParticle,
                this._views,
                arc);
      }
      let hostedSlotName = [...resolvedHostedParticle.slots.keys()][0];
      let slotName = [...this.spec.slots.values()][0].name;
      let slotId = await arc.createSlot(
          this, slotName, resolvedHostedParticle.name, hostedSlotName);

      if (!slotId) {
        continue;
      }

      this._itemSubIdByHostedSlotId.set(slotId, item.id);

      try {
        await arc.loadRecipe(
            this.constructInnerRecipe(
                resolvedHostedParticle,
                item,
                itemView,
                {name: hostedSlotName, id: slotId},
                {connections: otherConnections, views: otherMappedViews}),
            this);
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
      // Replace hosted particle connection in template with the corresponding particle connection names.
      // TODO: make this generic!
      this._connByHostedConn.forEach((conn, hostedConn) => {
        template = template.replace(
            new RegExp(`{{${hostedConn}.description}}`, 'g'),
            `{{${conn}.description}}`);
      });
      this._setState({template});
    }
  }

  // Abstract
  constructInnerRecipe(hostedParticle, item, itemView, slot, other) {
  }
}
