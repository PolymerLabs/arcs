/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';

import {PECOuterPort} from './api-channel.js';
import {reportSystemException, PropagatedException} from './arc-exceptions.js';
import {Arc} from './arc.js';
import {Manifest} from './manifest.js';
import { Handle } from './recipe/handle.js';
import {Particle} from './recipe/particle.js';
import {RecipeResolver} from './recipe/recipe-resolver.js';
import {SlotComposer} from './slot-composer.js';
import {StorageProviderBase} from './storage/storage-provider-base.js';
import { Type } from './type.js';

export class ParticleExecutionHost {
  private _apiPort : PECOuterPort;
  close : () => void;
  private arc: Arc;
  private nextIdentifier = 0;
  slotComposer: SlotComposer;
  private idleVersion = 0;
  private idlePromise: Promise<Map<Particle, number[]>> | undefined;
  private idleResolve: ((relevance: Map<Particle, number[]>) => void) | undefined;

  constructor(port, slotComposer: SlotComposer, arc: Arc) {
    this.close = () => {
      port.close();
      this._apiPort.close();
    };

    this.arc = arc;
    this.slotComposer = slotComposer;

    const pec = this;

    this._apiPort = new class extends PECOuterPort {

      onRender(particle: Particle, slotName: string, content: string) {
        if (pec.slotComposer) {
          pec.slotComposer.renderSlot(particle, slotName, content);
        }
      }

      onInitializeProxy(handle: StorageProviderBase, callback: number) {
        const target = {};
        handle.on('change', data => this.SimpleCallback(callback, data), target);
      }

      async onSynchronizeProxy(handle: StorageProviderBase, callback: number) {
        const data = await handle.modelForSynchronization();
        this.SimpleCallback(callback, data);
      }

      async onHandleGet(handle: StorageProviderBase, callback: number) {
        // TODO(shans): fix typing once we have types for Singleton/Collection/etc
        // tslint:disable-next-line: no-any
        const data = await (handle as any).get();
        this.SimpleCallback(callback, data);
      }

      async onHandleToList(handle: StorageProviderBase, callback: number) {
        // TODO(shans): fix typing once we have types for Singleton/Collection/etc
        // tslint:disable-next-line: no-any
        const data = await (handle as any).toList();
        this.SimpleCallback(callback, data);
      }

      onHandleSet(handle: StorageProviderBase, data: {}, particleId: string, barrier: string) {
        // TODO(shans): fix typing once we have types for Singleton/Collection/etc
        // tslint:disable-next-line: no-any
        (handle as any).set(data, particleId, barrier);
      }
      onHandleClear(handle: StorageProviderBase, particleId: string, barrier: string) {
        // TODO(shans): fix typing once we have types for Singleton/Collection/etc
        // tslint:disable-next-line: no-any
        (handle as any).clear(particleId, barrier);
      }

      async onHandleStore(handle: StorageProviderBase, callback: number, data: {value: {}, keys: string[]}, particleId: string) {
        // TODO(shans): fix typing once we have types for Singleton/Collection/etc
        // tslint:disable-next-line: no-any
        await (handle as any).store(data.value, data.keys, particleId);
        this.SimpleCallback(callback, {});
      }

      async onHandleRemove(handle: StorageProviderBase, callback: number, data: {id: string, keys: string[]}, particleId) {
        // TODO(shans): fix typing once we have types for Singleton/Collection/etc
        // tslint:disable-next-line: no-any
        await (handle as any).remove(data.id, data.keys, particleId);
        this.SimpleCallback(callback, {});
      }

      async onHandleRemoveMultiple(handle: StorageProviderBase, callback: number, data: {}, particleId: string) {
        // TODO(shans): fix typing once we have types for Singleton/Collection/etc
        // tslint:disable-next-line: no-any
        await (handle as any).removeMultiple(data, particleId);
        this.SimpleCallback(callback, {});
      }

      async onHandleStream(handle: StorageProviderBase, callback: number, pageSize: number, forward: boolean) {
        // TODO(shans): fix typing once we have types for Singleton/Collection/etc
        // tslint:disable-next-line: no-any
        this.SimpleCallback(callback, await (handle as any).stream(pageSize, forward));
      }

      async onStreamCursorNext(handle: StorageProviderBase, callback: number, cursorId: string) {
        // TODO(shans): fix typing once we have types for Singleton/Collection/etc
        // tslint:disable-next-line: no-any
        this.SimpleCallback(callback, await (handle as any).cursorNext(cursorId));
      }

      onStreamCursorClose(handle: StorageProviderBase, cursorId: string) {
        // TODO(shans): fix typing once we have types for Singleton/Collection/etc
        // tslint:disable-next-line: no-any
        (handle as any).cursorClose(cursorId);
      }

      onIdle(version: number, relevance: Map<Particle, number[]>) {
        if (version === pec.idleVersion) {
          pec.idlePromise = undefined;
          pec.idleResolve(relevance);
        }
      }

      async onGetBackingStore(callback: number, storageKey: string, type: Type) {
        if (!storageKey) {
          storageKey = pec.arc.storageProviderFactory.baseStorageKey(type, pec.arc.storageKey || 'volatile');
        }
        const store = await pec.arc.storageProviderFactory.baseStorageFor(type, storageKey);
        // TODO(shans): THIS IS NOT SAFE!
        //
        // Without an auditor on the runtime side that inspects what is being fetched from
        // this store, particles with a reference can access any data of that reference's type.
        this.GetBackingStoreCallback(store, callback, type.collectionOf(), type.toString(), store.id, storageKey);
      }

      onConstructInnerArc(callback: number, particle: Particle) {
        const arc = pec.arc.createInnerArc(particle);
        this.ConstructArcCallback(callback, arc);
      }

      async onArcCreateHandle(callback: number, arc: Arc, type: Type, name: string) {
        // At the moment, inner arcs are not persisted like their containers, but are instead
        // recreated when an arc is deserialized. As a consequence of this, dynamically
        // created handles for inner arcs must always be volatile to prevent storage
        // in firebase.
        const store = await arc.createStore(type, name, null, [], 'volatile');
        // Store belongs to the inner arc, but the transformation particle,
        // which itself is in the outer arc gets access to it.
        this.CreateHandleCallback(store, callback, type, name, store.id);
      }

      onArcMapHandle(callback: number, arc: Arc, handle: Handle) {
        assert(pec.arc.findStoreById(handle.id), `Cannot map nonexistent handle ${handle.id}`);
        // TODO: create hosted handles map with specially generated ids instead of returning the real ones?
        this.MapHandleCallback({}, callback, handle.id);
      }

      onArcCreateSlot(callback: number, arc: Arc, transformationParticle: Particle, transformationSlotName: string, handleId: string) {
        let hostedSlotId;
        if (pec.slotComposer) {
          hostedSlotId = pec.slotComposer.createHostedSlot(arc, transformationParticle, transformationSlotName, handleId);
        }
        this.CreateSlotCallback({}, callback, hostedSlotId);
      }

      async onArcLoadRecipe(arc: Arc, recipe: string, callback: number) {
        const manifest = await Manifest.parse(recipe, {loader: arc.loader, fileName: ''});
        const successResponse = {
          providedSlotIds: {}
        };
        let error = undefined;
        // TODO(wkorman): Consider reporting an error or at least warning if
        // there's more than one recipe since currently we silently ignore them.
        let recipe0 = manifest.recipes[0];
        if (recipe0) {
          for (const slot of recipe0.slots) {
            slot.id = slot.id || `slotid-${arc.generateID()}`;
            if (slot.sourceConnection) {
              const particlelocalName = slot.sourceConnection.particle.localName;
              if (particlelocalName) {
                successResponse.providedSlotIds[`${particlelocalName}.${slot.name}`] = slot.id;
              }
            }
          }
          const missingHandles = [];
          for (const handle of recipe0.handles) {
            const fromHandle = pec.arc.findStoreById(handle.id) || manifest.findStoreById(handle.id);
            if (!fromHandle) {
              missingHandles.push(handle);
              continue;
            }
            handle.mapToStorage(fromHandle);
          }
          if (missingHandles.length > 0) {
            let recipeToResolve = recipe0;
            // We're resolving both against the inner and the outer arc.
            for (const resolver of [new RecipeResolver(arc /* inner */), new RecipeResolver(pec.arc /* outer */)]) {
              recipeToResolve = await resolver.resolve(recipeToResolve) || recipeToResolve;
            }
            if (recipeToResolve === recipe0) {
              error = `Recipe couldn't load due to missing handles [recipe=${recipe0}, missingHandles=${missingHandles.join('\n')}].`;
            } else {
              recipe0 = recipeToResolve;
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
                manifest.stores.forEach(store => pec.arc._registerStore(store, []));
                arc.instantiate(recipe0);
              } else {
                error = `Recipe is not resolvable:\n${recipe0.toString({showUnresolved: true})}`;
              }
            } else {
              error = `Recipe ${recipe0} could not be normalized:\n${[...options.errors.values()].join('\n')}`;
            }
          }
        } else {
          error = 'No recipe defined';
        }
        this.SimpleCallback(callback, error ? {error} : successResponse);
      }

      onReportExceptionInHost(exception: PropagatedException) {
        if (!exception.particleName) {
          exception.particleName = pec.arc.particleHandleMaps.get(exception.particleId).spec.name;
        }
        reportSystemException(exception);
      }
    }(port, arc);
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
    this._apiPort.AwaitIdle(this.nextIdentifier++);
    return this.idlePromise;
  }

  get messageCount() {
    return this._apiPort.messageCount;
  }

  sendEvent(particle, slotName, event) {
    this._apiPort.UIEvent(particle, slotName, event);
  }

  instantiate(particle, spec, handles) {
    handles.forEach(handle => {
      this._apiPort.DefineHandle(handle, handle.type.resolvedType(), handle.name);
    });

    this._apiPort.InstantiateParticle(particle, particle.id, spec, handles);
    return particle;
  }
  startRender({particle, slotName, providedSlots, contentTypes}: {particle: Particle, slotName: string, providedSlots: {[index: string]: string}, contentTypes: string[]}) {
    this._apiPort.StartRender(particle, slotName, providedSlots, contentTypes);
  }
  stopRender({particle, slotName}: {particle: Particle, slotName: string}) {
    this._apiPort.StopRender(particle, slotName);
  }
  innerArcRender(transformationParticle: Particle, transformationSlotName: string, hostedSlotId: string, content) {
    this._apiPort.InnerArcRender(transformationParticle, transformationSlotName, hostedSlotId, content);
  }
}
