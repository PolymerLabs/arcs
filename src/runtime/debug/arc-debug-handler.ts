/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {enableTracingAdapter} from './tracing-adapter.js';
import {Arc} from '../arc.js';
import {ArcDevtoolsChannel, ArcDebugListenerDerived} from '../../runtime/debug/abstract-devtools-channel.js';
import {DevtoolsChannel} from '../../platform/devtools-channel-web.js';
import {DevtoolsConnection} from './devtools-connection.js';
import {Particle} from '../recipe/particle.js';
import {ArcStoresFetcher} from './arc-stores-fetcher.js';

// Arc-independent handlers for devtools logic.
DevtoolsConnection.onceConnected.then(devtoolsChannel => {
  enableTracingAdapter(devtoolsChannel);
});


export class ArcDebugHandler {
  private arcDevtoolsChannel: DevtoolsChannel = null;
  
  constructor(arc: Arc, listenerClasses: ArcDebugListenerDerived[]) {
    if (arc.isStub) return;

    const connectedOnInstantiate = DevtoolsConnection.isConnected;

    DevtoolsConnection.onceConnected.then(devtoolsChannel => {
      if (!connectedOnInstantiate) {
        devtoolsChannel.send({
          messageType: 'warning',
          messageBody: 'pre-existing-arc'
        });
      }

      this.arcDevtoolsChannel = devtoolsChannel.forArc(arc);

      if (!!listenerClasses) { // undefined => false
      	// TODO: This should just be a foreach, as there is no need to keep
      	// the results.
        const listeners = listenerClasses.map(l => {
          ArcDevtoolsChannel.instantiateListener(l, arc, this.arcDevtoolsChannel);
        });
      }

      this.arcDevtoolsChannel.send({
        messageType: 'arc-available',
        messageBody: {
          speculative: arc.isSpeculative
        }
      });
    });
  }

  recipeInstantiated({particles}: {particles: Particle[]}) {
    if (!this.arcDevtoolsChannel) return;

    const truncate = ({id, name}) => ({id, name});
    const slotConnections = [];
    particles.forEach(p => Object.values(p.consumedSlotConnections).forEach(cs => {
      if (cs.targetSlot) {
        slotConnections.push({
          particleId: cs.particle.id,
          consumed: truncate(cs.targetSlot),
          provided: Object.values(cs.providedSlots).map(slot  => truncate(slot)),
        });
      }
    }));
    this.arcDevtoolsChannel.send({
      messageType: 'recipe-instantiated',
      messageBody: {slotConnections}
    });
  }
}

// TODO: This should move to the core interface file when it exists. 
export const defaultCoreDebugListeners: ArcDebugListenerDerived[] = [
  ArcStoresFetcher
];
