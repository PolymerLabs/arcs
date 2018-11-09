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

import {assert} from '../../platform/assert-web.js';
import {PECOuterPort} from '../api-channel.js';
import {Manifest} from './manifest.js';
import {RecipeResolver} from './recipe/recipe-resolver.js';
import {reportSystemException} from './arc-exceptions.js';
import {Arc} from './arc.js';
import {SlotComposer} from './slot-composer.js';

export class ParticleExecutionHost {
  private _apiPort : PECOuterPort;
  close : () => void;
  private arc: Arc;
  private nextIdentifier = 0;
  slotComposer: SlotComposer;
  private idleVersion = 0;
  private idlePromise: Promise<number> | undefined;
  private idleResolve: ((relevance: number) => void) | undefined;

  constructor(port, slotComposer: SlotComposer, arc: Arc) {
    this._apiPort = new PECOuterPort(port, arc);
    this.close = () => {
      port.close();
      this._apiPort.close();
    };
    this.arc = arc;
    this.slotComposer = slotComposer;

    this._apiPort.onRender = ({particle, slotName, content}) => {
      if (this.slotComposer) {
        this.slotComposer.renderSlot(particle, slotName, content);
      }
    };

    this._apiPort.onInitializeProxy = async ({handle, callback}) => {
      const target = {};
      handle.on('change', data => this._apiPort.SimpleCallback({callback, data}), target);
    };

    this._apiPort.onSynchronizeProxy = async ({handle, callback}) => {
      const data = await handle.modelForSynchronization();
      this._apiPort.SimpleCallback({callback, data});
    };

    this._apiPort.onHandleGet = async ({handle, callback}) => {
      this._apiPort.SimpleCallback({callback, data: await handle.get()});
    };

    this._apiPort.onHandleToList = async ({handle, callback}) => {
      this._apiPort.SimpleCallback({callback, data: await handle.toList()});
    };

    this._apiPort.onHandleSet = ({handle, data, particleId, barrier}) => handle.set(data, particleId, barrier);
    this._apiPort.onHandleClear = ({handle, particleId, barrier}) => handle.clear(particleId, barrier);

    this._apiPort.onHandleStore = async ({handle, callback, data: {value, keys}, particleId}) => {
      await handle.store(value, keys, particleId);
      this._apiPort.SimpleCallback({callback});
    };

    this._apiPort.onHandleRemove = async ({handle, callback, data: {id, keys}, particleId}) => {
      await handle.remove(id, keys, particleId);
      this._apiPort.SimpleCallback({callback});
    };

    this._apiPort.onHandleRemoveMultiple = async ({handle, callback, data, particleId}) => {
      await handle.removeMultiple(data, particleId);
      this._apiPort.SimpleCallback({callback});
    };

    this._apiPort.onHandleStream = async ({handle, callback, pageSize, forward}) => {
      this._apiPort.SimpleCallback({callback, data: await handle.stream(pageSize, forward)});
    };

    this._apiPort.onStreamCursorNext = async ({handle, callback, cursorId}) => {
      this._apiPort.SimpleCallback({callback, data: await handle.cursorNext(cursorId)});
    };

    this._apiPort.onStreamCursorClose = ({handle, cursorId}) => handle.cursorClose(cursorId);

    this._apiPort.onIdle = ({version, relevance}) => {
      if (version === this.idleVersion) {
        this.idlePromise = undefined;
        this.idleResolve(relevance);
      }
    };

    this._apiPort.onGetBackingStore = async ({callback, type, storageKey}) => {
      if (!storageKey) {
        storageKey = this.arc.storageProviderFactory.baseStorageKey(type, this.arc.storageKey || 'volatile');
      }
      const store = await this.arc.storageProviderFactory.baseStorageFor(type, storageKey);
      // TODO(shans): THIS IS NOT SAFE!
      //
      // Without an auditor on the runtime side that inspects what is being fetched from
      // this store, particles with a reference can access any data of that reference's type.
      this._apiPort.GetBackingStoreCallback(store, {type: type.collectionOf(), name: type.toString(), callback, id: store.id, storageKey});
    };

    this._apiPort.onConstructInnerArc = ({callback, particle}) => {
      const arc = {particle};
      this._apiPort.ConstructArcCallback({callback, arc});
    };

    this._apiPort.onArcCreateHandle = async ({callback, arc, type, name}) => {
      // At the moment, inner arcs are not persisted like their containers, but are instead
      // recreated when an arc is deserialized. As a consequence of this, dynamically 
      // created handles for inner arcs must always be volatile to prevent storage 
      // in firebase.
      const store = await this.arc.createStore(type, name, null, [], 'volatile');
      this._apiPort.CreateHandleCallback(store, {type, name, callback, id: store.id});
    };

    this._apiPort.onArcMapHandle = async ({callback, arc, handle}) => {
      assert(this.arc.findStoreById(handle.id), `Cannot map nonexistent handle ${handle.id}`);
      // TODO: create hosted handles map with specially generated ids instead of returning the real ones?
      this._apiPort.MapHandleCallback({}, {callback, id: handle.id});
    };

    this._apiPort.onArcCreateSlot = ({callback, arc, transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName, handleId}) => {
      let hostedSlotId;
      if (this.slotComposer) {
        hostedSlotId = this.slotComposer.createHostedSlot(transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName, handleId);
      }
      this._apiPort.CreateSlotCallback({}, {callback, hostedSlotId});
    };

    this._apiPort.onArcLoadRecipe = async ({arc, recipe, callback}) => {
      const manifest = await Manifest.parse(recipe, {loader: this.arc.loader, fileName: ''});
      let error = undefined;
      // TODO(wkorman): Consider reporting an error or at least warning if
      // there's more than one recipe since currently we silently ignore them.
      let recipe0 = manifest.recipes[0];
      if (recipe0) {
        const missingHandles = [];
        for (const handle of recipe0.handles) {
          const fromHandle = this.arc.findStoreById(handle.id) || manifest.findStoreById(handle.id);
          if (!fromHandle) {
            missingHandles.push(handle);
            continue;
          }
          handle.mapToStorage(fromHandle);
        }
        if (missingHandles.length > 0) {
          const resolvedRecipe = await new RecipeResolver(this.arc).resolve(recipe0);
          if (!resolvedRecipe) {
            error = `Recipe couldn't load due to missing handles [recipe=${recipe0}, missingHandles=${missingHandles.join('\n')}].`;
          } else {
            recipe0 = resolvedRecipe;
          }
        }
        if (!error) {
          const options = {errors: new Map()};
          // If we had missing handles but we made it here, then we ran recipe
          // resolution which will have already normalized the recipe.
          if ((missingHandles.length > 0) || recipe0.normalize(options)) {
            if (recipe0.isResolved()) {
              // TODO: pass tags through too, and reconcile with similar logic
              // in Arc.deserialize.
              manifest.stores.forEach(store => this.arc._registerStore(store, []));
              this.arc.instantiate(recipe0, arc);
            } else {
              error = `Recipe is not resolvable ${recipe0.toString({showUnresolved: true})}`;
            }
          } else {
            error = `Recipe ${recipe0} could not be normalized:\n${[...options.errors.values()].join('\n')}`;
          }
        }
      } else {
        error = 'No recipe defined';
      }
      this._apiPort.SimpleCallback({callback, data: error});
    };

    this._apiPort.onRaiseSystemException = async ({exception, methodName, particleId}) => {
     const particle = this.arc.particleHandleMaps.get(particleId).spec.name;
      reportSystemException(exception, methodName, particle);
    };
  }

  stop() {
    this._apiPort.Stop();
  }

  get idle() {
    if (this.idlePromise == undefined) {
      this.idlePromise = new Promise((resolve, reject) => {
        this.idleResolve = resolve;
      });
    }
    this.idleVersion = this.nextIdentifier;
    this._apiPort.AwaitIdle({version: this.nextIdentifier++});
    return this.idlePromise;
  }

  get messageCount() {
    return this._apiPort.messageCount;
  }

  sendEvent(particle, slotName, event) {
    this._apiPort.UIEvent({particle, slotName, event});
  }

  instantiate(particle, spec, handles) {
    handles.forEach(handle => {
      this._apiPort.DefineHandle(handle, {type: handle.type.resolvedType(), name: handle.name});
    });

    this._apiPort.InstantiateParticle(particle, {id: particle.id, spec, handles});
    return particle;
  }
  startRender({particle, slotName, contentTypes}) {
    this._apiPort.StartRender({particle, slotName, contentTypes});
  }
  stopRender({particle, slotName}) {
    this._apiPort.StopRender({particle, slotName});
  }
  innerArcRender(transformationParticle, transformationSlotName, hostedSlotId, content) {
    this._apiPort.InnerArcRender({transformationParticle, transformationSlotName, hostedSlotId, content});
  }
}
