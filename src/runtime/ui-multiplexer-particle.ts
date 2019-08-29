/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ParticleSpec} from './particle-spec.js';
import {UiTransformationParticle} from './ui-transformation-particle.js';
import {Handle} from './handle.js';
import {InnerArcHandle} from './particle-execution-context.js';
import {Type} from './type.js';

export class UiMultiplexerParticle extends UiTransformationParticle {

  plexeds; //: any[];

  async setHandles(handles: ReadonlyMap<string, Handle>): Promise<void> {
    this.plexeds = [];
    const arc = await this.constructInnerArc();
    const listHandleName = 'list';
    const particleHandleName = 'hostedParticle';
    const particleHandle = handles.get(particleHandleName);
    let hostedParticle: ParticleSpec | null = null;
    let otherMappedHandles: string[] = [];
    let otherConnections: string[] = [];
    if (particleHandle) {
      hostedParticle = await particleHandle['get']();
      if (hostedParticle) {
        ({otherMappedHandles, otherConnections} =
            await this._mapParticleConnections(listHandleName, particleHandleName, hostedParticle, handles, arc));
      }
    }
    this.setState({
      arc,
      type: handles.get(listHandleName).type,
      hostedParticle,
      otherMappedHandles,
      otherConnections
    });
    await super.setHandles(handles);
  }

  async update({list}, {arc, type, hostedParticle, otherMappedHandles, otherConnections}: {
    arc: InnerArcHandle,
    type: Type,
    hostedParticle: ParticleSpec,
    otherMappedHandles: string[],
    otherConnections: string[]
  }, oldProps, oldState) {
    //console.warn(`[${this.spec.name}]::update`, list, arc);
    if (!list || !arc) {
      return;
    }
    if (oldProps.list === list && oldState.arc === arc) {
      return;
    }
    if (list.length > 0) {
      this.relevance = 0.1;
    }
    // TODO(sjmiles): needs safety for re-entrant update
    //const slotIds = [];
    for (const [index, item] of this.getListEntries(list)) {
      //const id = await this.updateEntry(index, item, {arc, type, hostedParticle, otherConnections, otherMappedHandles});
      //slotIds.push(id);
      await this.updateEntry(index, item, {arc, type, hostedParticle, otherConnections, otherMappedHandles});
    }
    //console.warn('m-d-p', slotIds);
    // clear data from unused particles/handles
    for (let i=list.length, plexed; (plexed=this.plexeds[i]); i++) {
      plexed.then(plexed => plexed.handle['clear']());
    }
  }

  async updateEntry(index, item, {hostedParticle, arc, type, otherConnections, otherMappedHandles}) {
    if (!hostedParticle && !item.renderParticleSpec) {
      // If we're muxing on behalf of an item with an embedded recipe, the
      // hosted particle should be retrievable from the item itself. Else we
      // just skip this item.
      return;
    }
    //console.log(`RenderEx:updateEntry: %c[${index}]`, 'color: #A00; font-weight: bold;');
    // Map innerArc/slot by index. Index maps closely to rendering contexts.
    // Rendering contexts are expensive, we want maximal coherence.
    const plexed = await this.requirePlexed(index, item,
      {hostedParticle, arc, type, otherConnections, otherMappedHandles});
    // TODO(sjmiles): work out a proper cast (and conditional), or fix upstream type
    plexed.handle['set'](item);
    return plexed.slotId;
  }

  async requirePlexed(index, item, {arc, type, hostedParticle, otherConnections, otherMappedHandles}) {
    let promise = this.plexeds[index];
    if (!promise) {
      // eslint-disable-next-line no-async-promise-executor
      promise = new Promise(async resolve => {
        const handle = await this.acquireItemHandle(index, {arc, item, type});
        const hosting = await this.resolveHosting(item, {arc, hostedParticle, otherConnections, otherMappedHandles});
        const result = {arc, handle, hosting, slotId: null};
        result.slotId = await this.createInnards(item, result);
        resolve(result);
      });
      this.plexeds[index] = promise;
    }
    return await promise;
  }

  async resolveHosting(item, {arc, hostedParticle, otherConnections, otherMappedHandles}) {
    return hostedParticle ?
      {hostedParticle, otherConnections, otherMappedHandles}
        : await this.resolveHostedParticle(item, arc);
  }

  async acquireItemHandle(index, {arc, item, type}) {
    const handlePromise = arc.createHandle(type.getContainedType(), `item${index}`);
    return await handlePromise;
  }

  async resolveHostedParticle(item, arc) {
    const hostedParticle = ParticleSpec.fromLiteral(JSON.parse(item.renderParticleSpec));
    // Re-map compatible handles and compute the connections specific
    // to this item's render particle.
    const listHandleName = 'list';
    const particleHandleName = 'renderParticle';
    const {otherConnections, otherMappedHandles} =
      await this._mapParticleConnections(listHandleName, particleHandleName, hostedParticle, this.handles, arc);
    return {otherConnections, otherMappedHandles, hostedParticle};
  }

  async _mapParticleConnections(
      listHandleName: string,
      particleHandleName: string,
      hostedParticle: ParticleSpec,
      handles: ReadonlyMap<string, Handle>,
      arc: InnerArcHandle) {
    const otherMappedHandles: string[] = [];
    const otherConnections: string[] = [];
    let index = 2;
    const skipConnectionNames = [listHandleName, particleHandleName];

    for (const [connectionName, otherHandle] of handles) {
      if (!skipConnectionNames.includes(connectionName)) {
        // TODO(wkorman): For items with embedded recipes we may need a map
        // (perhaps id to index) to make sure we don't map a handle into the inner
        // arc multiple times unnecessarily.

        // TODO(lindner): type erasure to avoid mismatch of Store vs Handle in arc.mapHandle
        // tslint:disable-next-line: no-any
        const otherHandleStore = otherHandle.storage as any;
        otherMappedHandles.push(`use '${await arc.mapHandle(otherHandleStore)}' as v${index}`);
        //
        const hostedOtherConnection =
          hostedParticle.handleConnections.find(conn => conn.isCompatibleType(otherHandle.type));
        if (hostedOtherConnection) {
          otherConnections.push(`${hostedOtherConnection.name} = v${index++}`);
          // TODO(wkorman): For items with embedded recipes where we may have a
          // different particle rendering each item, we need to track
          // |connByHostedConn| keyed on the particle type.
          //this._connByHostedConn.set(hostedOtherConnection.name, connectionName);
        }
      }
    }
    return {otherMappedHandles, otherConnections};
  }

  async createInnards(item, {arc, handle, hosting: {hostedParticle, otherMappedHandles, otherConnections}}) {
    const hostedSlotName = [...hostedParticle.slotConnections.keys()][0];
    const slotName = [...this.spec.slotConnections.values()][0].name;
    const slotId = await arc.createSlot(this, slotName, handle._id);
    if (slotId) {
      try {
        const recipe = this.constructInnerRecipe(
          hostedParticle, item, handle,
          {name: hostedSlotName, id: slotId},
          {connections: otherConnections, handles: otherMappedHandles}
        );
        await arc.loadRecipe(recipe);
      }
      catch (e) {
        console.warn(e);
      }
    }
    return slotId;
  }

  // Called with the list of items and by default returns the direct result of
  // `Array.entries()`. Subclasses can override this method to alter the item
  // order or otherwise permute the items as desired before their slots are
  // created and contents are rendered.
  getListEntries(list: {}[]) {
    return list.entries();
  }

  // Abstract method below.
  // Called to produce a full interpolated recipe for loading into an inner
  // arc for each item. Subclasses should override this method as by default
  // it does nothing and so no recipe will be returned and content will not
  // be loaded successfully into the inner arc.
  constructInnerRecipe?(hostedParticle, item, itemHandle, slot, other): string;
}
