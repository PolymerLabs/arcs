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

defineParticle(({Particle, TransformationDomParticle}) => {
  return class CollectionRenderer extends TransformationDomParticle {

    async setHandles(handles) {
      super.setHandles(handles);
      this.handleIds = {};
      const layouter = await handles.get('layouter').get();
      const renderer = await handles.get('renderer').get();
      const itemsHandle = handles.get('items');

      let rendererConsumeConnName = null;
      let layouterProvideConnName = null;

      const layouterConsumedSlot = layouter.slots.entries().next().value[1];
      let providedSlotCandidates = layouterConsumedSlot.providedSlots.filter(s => s.isSet);
      if (providedSlotCandidates.some(s => s.isRequired)) {
        providedSlotCandidates = providedSlotCandidates.filter(s => s.isRequired);
      }
      const rendererConsumeConnections = [...renderer.slots.values()].map(s => s.name);
      for (const slotCandidate of providedSlotCandidates) {
        if (rendererConsumeConnections.includes(slotCandidate.name)) {
          layouterProvideConnName = rendererConsumeConnName = slotCandidate.name;
          break;
        }
      }
      if (!layouterProvideConnName) {
        layouterProvideConnName = providedSlotCandidates[0].name;
        rendererConsumeConnName = rendererConsumeConnections[0];
      }

      const itemType = itemsHandle.type.primitiveType();
      const rendererItemHandleConnName = renderer.connections.find(conn => conn.isCompatibleType(itemType)).name;

      const innerArc = await this.constructInnerArc();
      const hostedRootSlotId = await innerArc.createSlot(
          this, [...this.spec.slots.values()][0].name,
          layouter.name, [...layouter.slots.keys()][0],
          itemsHandle._id);
      this.setState({innerArc, hostedRootSlotId, layouterProvideConnName, rendererConsumeConnName, itemType, rendererItemHandleConnName});
    }

    renderHostedSlot(slotName, hostedSlotId, content) {
      this.setState((({template, templateName, model}) => ({template, templateName, renderModel: model}))(content));
    }

    async willReceiveProps({layouter, renderer, items},
        {innerArc, hostedRootSlotId, layouterItemSlotId, layouterProvideConnName, rendererConsumeConnName, itemType, rendererItemHandleConnName}) {
      if (!layouterItemSlotId && items.length === 0) return;
      if (items && items.length > 0) this.relevance = 1; // Feedback for speculative execution.
      if (!items || !hostedRootSlotId) return;

      const itemsHandle = this.handles.get('items');

      const recipeParts = [Particle.buildManifest`
          ${renderer}
          particle SetSlotAssigner in 'https://$artifacts/Common/source/SetSlotAssigner.js'
            in * {} item
            consume root
              provide child`];

      if (!layouterItemSlotId) {
        // We haven't instantiated a layouter particle yet, doing it now.
        recipeParts.push(Particle.buildManifest`
          ${layouter}
          recipe
            map '${itemsHandle._id}' as items
            slot '${hostedRootSlotId}' as root
            ${layouter.name} as layouter
              items <- items
              consume root as root
                provide ${layouterProvideConnName} as slot0`);
      } else {
        // Layouter has already been instantiated, just referencing its slot.
        recipeParts.push(`
          recipe
            slot '${layouterItemSlotId}' as slot0`);
      }

      for (const [index, item] of items.entries()) {
        if (this.handleIds[item.id]) {
          const itemHandle = await this.handleIds[item.id];
          itemHandle.set(item);
          continue;
        }

        const itemHandle = await innerArc.createHandle(itemType, 'item' + index);
        this.handleIds[item.id] = itemHandle;

        itemHandle.set(item);
        recipeParts.push(`
            use '${itemHandle._id}' as handle${index}
            SetSlotAssigner
              item <- handle${index}
              consume root as slot0
                provide child as child${index}
            ${renderer.name}
              ${rendererItemHandleConnName} = handle${index}
              consume ${rendererConsumeConnName} as child${index}`);
      }

      const {providedSlotIds} = await innerArc.loadRecipe(recipeParts.join(''), this);
      if (!layouterItemSlotId) {
        this.setState({layouterItemSlotId: providedSlotIds[`layouter.${layouterProvideConnName}`]});  
      }
    }
  };
});
