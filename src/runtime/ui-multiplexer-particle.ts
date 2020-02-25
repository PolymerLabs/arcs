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
import {Handle} from './storageNG/handle.js';
import {InnerArcHandle} from './particle-execution-context.js';
import { CRDTTypeRecord } from './crdt/crdt.js';

export class UiMultiplexerParticle extends UiTransformationParticle {

  // TODO(sjmiles): needs proper typing, better name
  plexeds; //: any[];

  update({list}, state, oldProps, oldState) {
    //log(`[${this.spec.name}]::update`, list);
    if (!list || !list.length) {
      return;
    }
    if (!this.plexeds) {
      this.busyWork(async () => this.updateConnections());
      return;
    }
    if (!state.arc || (oldProps.list === list && oldState.arc === state.arc)) {
      return;
    }
    this.relevance = 0.1;
    // TODO(sjmiles): needs protection from re-entrant update
    this.busyWork(async () => this.updateEntries({list}, state));
  }

  busyWork(task) {
    // ensure `busy` flag while processing async `task`
    // tslint:disable-next-line no-floating-promises
    this.invokeSafely(task, this.onError);
  }

  async updateConnections() {
    this.plexeds = [];
    const handles = this.handles;
    const arc = await this.constructInnerArc();
    const listHandleName = 'list';
    const particleHandleName = 'hostedParticle';
    const particleHandle = handles.get(particleHandleName);
    let hostedParticle: ParticleSpec | null = null;
    let otherMappedHandles: string[] = [];
    let otherConnections: string[] = [];
    if (particleHandle) {
      hostedParticle = await particleHandle['fetch']();
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
  }

  async updateEntries({list}, {arc, type, hostedParticle, otherMappedHandles, otherConnections}) {
    const entries = this.getListEntries(list);
    for (const [index, item] of entries) {
      await this.updateEntry(index, item, {arc, type, hostedParticle, otherConnections, otherMappedHandles});
    }
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
    // Map innerArc/slot by index. Index maps closely to rendering contexts.
    // Rendering contexts are expensive, we want maximal coherence.
    const plexed = await this.requirePlexed(index, item,
      {hostedParticle, arc, type, otherConnections, otherMappedHandles});
    // TODO(sjmiles): work out a proper cast (and conditional), or fix upstream type
    plexed.handle['set'](item);
  }

  async requirePlexed(index, item, {arc, type, hostedParticle, otherConnections, otherMappedHandles}) {
    let promise = this.plexeds[index];
    if (!promise) {
      // eslint-disable-next-line no-async-promise-executor
      promise = new Promise(async resolve => {
        const handle = await this.acquireItemHandle(index, {arc, item, type});
        const hosting = await this.resolveHosting(item, {arc, hostedParticle, otherConnections, otherMappedHandles});
        const result = {arc, handle, hosting};
        await this.populateArc(item, result);
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
      handles: ReadonlyMap<string, Handle<CRDTTypeRecord>>,
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
        otherMappedHandles.push(`h${index}: use '${await arc.mapHandle(otherHandleStore)}'`);
        //
        const hostedOtherConnection =
          hostedParticle.handleConnections.find(conn => conn.isCompatibleType(otherHandle.type));
        if (hostedOtherConnection) {
          otherConnections.push(`${hostedOtherConnection.name}: h${index++}`);
          // TODO(wkorman): For items with embedded recipes where we may have a
          // different particle rendering each item, we need to track
          // |connByHostedConn| keyed on the particle type.
          //this._connByHostedConn.set(hostedOtherConnection.name, connectionName);
        }
      }
    }
    return {otherMappedHandles, otherConnections};
  }

  async populateArc(item, {arc, handle, hosting: {hostedParticle, otherMappedHandles, otherConnections}}) {
    let slot = null;
    const hostedSlotName = [...hostedParticle.slotConnections.keys()][0];
    if (hostedSlotName) {
      const name = [...this.spec.slotConnections.values()][0].name;
      const id = await arc.createSlot(this, name, handle._id);
      slot = {name, id};
    }
    const other = {connections: otherConnections, handles: otherMappedHandles};
    const recipe = this.constructInnerRecipe(hostedParticle, item, handle, slot, other);
    try {
      await arc.loadRecipe(recipe);
    }
    catch (e) {
      console.warn('ui-multiplexer-particle: exception parsing constructed recipe:', recipe);
      console.warn(e);
    }
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
