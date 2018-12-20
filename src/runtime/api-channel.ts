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

import {assert} from '../platform/assert-web.js';
import {ParticleSpec} from './particle-spec.js';
import {Type} from './type.js';
import {OuterPortAttachment} from './debug/outer-port-attachment.js';
import {DevtoolsConnection} from './debug/devtools-connection.js';
import {Handle} from './handle.js';
import {Particle} from './particle.js';
import * as recipeParticle from './recipe/particle.js';
import * as recipeHandle from './recipe/handle.js';
import {Arc} from './arc.js';
import {StorageProviderBase} from './storage/storage-provider-base.js';
import {StorageProxy} from './storage-proxy.js';
import { SerializedModelEntry } from './storage/crdt-collection-model.js';

enum MappingType {Mapped, LocalMapped, RemoteMapped, Direct, ObjectMap, List, ByLiteral}

interface MappingInfo {
  type: MappingType;
  initializer?: boolean;
  redundant?: boolean;
  value?: MappingInfo;
  key?: MappingInfo;
  converter?: Literalizer;
  identifier?: boolean;
  ignore?: boolean;
}

// TODO(shans): are there better types that I can use for this?
interface Literalizer {
  prototype: {toLiteral: () => {}};
  fromLiteral: ({}) => {};
}

const targets = new Map<{}, Map<string, MappingInfo[]>>();

function setPropertyKey(target: {}, propertyKey: string) {
  if (!targets.has(target)) {
    targets.set(target, new Map());
  }
  if (!targets.get(target).has(propertyKey)) {
    targets.get(target).set(propertyKey, []);
  }
}

function set(target: {}, propertyKey: string, parameterIndex: number, info: MappingInfo) {
  setPropertyKey(target, propertyKey);
  targets.get(target).get(propertyKey)[parameterIndex] = info;
}

function Direct(target: {}, propertyKey: string, parameterIndex: number) {
  set(target.constructor, propertyKey, parameterIndex, {type: MappingType.Direct});
}

function Mapped(target: {}, propertyKey: string, parameterIndex: number) {
  set(target.constructor, propertyKey, parameterIndex, {type: MappingType.Mapped});
}

function ByLiteral(constructor: Literalizer) {
  return (target: {}, propertyKey: string, parameterIndex: number) => {
    const info: MappingInfo = {type: MappingType.ByLiteral, converter: constructor};
    set(target.constructor, propertyKey, parameterIndex, info);
  };
}

function ObjectMap(key: MappingType, value: MappingType) {
  return (target: {}, propertyKey: string, parameterIndex: number) => {
    const info: MappingInfo = {type: MappingType.ObjectMap, key: {type: key}, value: {type: value}};
    set(target.constructor, propertyKey, parameterIndex, info);
  };
}

function List(value: MappingType) {
  return (target: {}, propertyKey: string, parameterIndex: number) => {
    const info: MappingInfo = {type: MappingType.List, value: {type: value}};
    set(target.constructor, propertyKey, parameterIndex, info);
  };  
}

function LocalMapped(target: {}, propertyKey: string, parameterIndex: number) {
  set(target.constructor, propertyKey, parameterIndex, {type: MappingType.LocalMapped});
}

function RemoteMapped(target: {}, propertyKey: string, parameterIndex: number) {
  set(target.constructor, propertyKey, parameterIndex, {type: MappingType.RemoteMapped});
}

function NoArgs(target: {}, propertyKey: string) {
  setPropertyKey(target.constructor, propertyKey);
}

function RedundantInitializer(target: {}, propertyKey: string, parameterIndex: number) {
  set(target.constructor, propertyKey, parameterIndex, {type: MappingType.Direct, initializer: true, redundant: true});
}

function Initializer(target: {}, propertyKey: string, parameterIndex: number) {
  set(target.constructor, propertyKey, parameterIndex, {type: MappingType.Direct, initializer: true});
}

function Identifier(target: {}, propertyKey: string, parameterIndex: number) {
  assert(targets.get(target.constructor));
  assert(targets.get(target.constructor).get(propertyKey));
  assert(targets.get(target.constructor).get(propertyKey)[parameterIndex]);
  targets.get(target.constructor).get(propertyKey)[parameterIndex].identifier = true;
}

function RemoteIgnore(target: {}, propertyKey: string, parameterIndex: number) {
  assert(targets.get(target.constructor));
  assert(targets.get(target.constructor).get(propertyKey));
  assert(targets.get(target.constructor).get(propertyKey)[parameterIndex]);
  targets.get(target.constructor).get(propertyKey)[parameterIndex].ignore = true;
}

class ThingMapper {
  _prefix: string;
  _nextIdentifier: number;
  _idMap: Map<string, {}>;
  _reverseIdMap: Map<{}, string>;
  constructor(prefix) {
    this._prefix = prefix;
    this._nextIdentifier = 0;
    this._idMap = new Map();
    this._reverseIdMap = new Map();
  }

  _newIdentifier() {
    return this._prefix + (this._nextIdentifier++);
  }

  createMappingForThing(thing, requestedId=undefined) {
    assert(!this._reverseIdMap.has(thing));
    let id;
    if (requestedId) {
      id = requestedId;
    } else if (thing.apiChannelMappingId) {
      id = thing.apiChannelMappingId;
    } else {
      id = this._newIdentifier();
    }
    assert(!this._idMap.has(id), `${requestedId ? 'requestedId' : (thing.apiChannelMappingId ? 'apiChannelMappingId' : 'newIdentifier()')} ${id} already in use`);
    this.establishThingMapping(id, thing);
    return id;
  }

  maybeCreateMappingForThing(thing) {
    if (this.hasMappingForThing(thing)) {
      return this.identifierForThing(thing);
    }
    return this.createMappingForThing(thing);
  }

  async establishThingMapping(id, thing) {
    let continuation;
    if (Array.isArray(thing)) {
      [thing, continuation] = thing;
    }
    this._idMap.set(id, thing);
    if (thing instanceof Promise) {
      assert(continuation == null);
      await this.establishThingMapping(id, await thing);
    } else {
      this._reverseIdMap.set(thing, id);
      if (continuation) {
        await continuation();
      }
    }
  }

  hasMappingForThing(thing) {
    return this._reverseIdMap.has(thing);
  }

  identifierForThing(thing) {
    assert(this._reverseIdMap.has(thing), `Missing thing [${thing}]`);
    return this._reverseIdMap.get(thing);
  }

  thingForIdentifier(id) {
    assert(this._idMap.has(id), `Missing id: ${id}`);
    return this._idMap.get(id);
  }
}


export class APIPort {
  private _port: MessagePort;
  _mapper: ThingMapper;
  protected _debugAttachment: OuterPortAttachment;
  protected _attachStack: boolean;
  messageCount: number;
  constructor(messagePort, prefix) {
    this._port = messagePort;
    this._mapper = new ThingMapper(prefix);
    this._port.onmessage = async e => this._processMessage(e);
    this._debugAttachment = null;
    this._attachStack = false;
    this.messageCount = 0;

    this._testingHook();
  }

  // Overridden by unit tests.
  _testingHook() {
  }

  close() {
    this._port.close();
  }

  async _processMessage(e) {
    assert(this['before' + e.data.messageType] !== undefined);
    const count = this.messageCount++;
    if (this._debugAttachment) {
      this._debugAttachment.handlePecMessage('on' + e.data.messageType, e.data.messageBody, count, e.data.stack);
    }
    this['before' + e.data.messageType](e.data.messageBody);
  }

  send(name, args) {
    const call = {messageType: name, messageBody: args, stack: this._attachStack ? new Error().stack : undefined};
    const count = this.messageCount++;
    if (this._debugAttachment) {
      this._debugAttachment.handlePecMessage(name, args, count, new Error().stack);
    }
    this._port.postMessage(call);
  }
}

// The horror. From https://davidwalsh.name/javascript-arguments
function getArgs(func) {
  // First match everything inside the function argument parens.
  const args = func.toString().match(/.*?\(([^)]*)\)/)[1];
 
  // Split the arguments string into an array comma delimited.
  return args.split(',').map((arg) => {
    // Ensure no inline comments are parsed and trim the whitespace.
    return arg.replace(/\/\*.*\*\//, '').trim();
    // Ensure no undefined values are added.
  }).filter((arg) => arg);
}

// value is covariant with info, and errors will be found
// at start of runtime. 
// tslint:disable-next-line: no-any
function convert(info: MappingInfo, value: any, mapper: ThingMapper) {
  switch (info.type) {
    case MappingType.Mapped:
      return mapper.identifierForThing(value);
    case MappingType.LocalMapped:
      return mapper.maybeCreateMappingForThing(value);
    case MappingType.RemoteMapped:
      // This is on the local side, so we don't do anything here.
      return value;
    case MappingType.Direct:
      return value;
    case MappingType.ObjectMap:
      const r = {};
      value.forEach((childvalue, key) => r[convert(info.key, key, mapper)] = convert(info.value, childvalue, mapper));
      return r;
    case MappingType.List:
      return value.map(v => convert(info.value, v, mapper));
    case MappingType.ByLiteral:
      return value.toLiteral();
    default:
      throw new Error(`Can't yet send MappingType ${info.type}`);
  }
}

// value is covariant with info, and errors will be found
// at start of runtime. 
// tslint:disable-next-line: no-any
function unconvert(info: MappingInfo, value: any, mapper: ThingMapper) {
  switch (info.type) {
    case MappingType.Mapped:
      return mapper.thingForIdentifier(value);
    case MappingType.LocalMapped:
      // This is on the remote side, so we don't do anything here.
      return value;
    case MappingType.RemoteMapped:
      return mapper.thingForIdentifier(value);
    case MappingType.Direct:
      return value;
    case MappingType.ObjectMap:
      const r = new Map();
      for (const key of Object.keys(value)) {
        r.set(unconvert(info.key, key, mapper), unconvert(info.value, value[key], mapper));
      }
      return r;
    case MappingType.List:
      return value.map(v => unconvert(info.value, v, mapper));
    case MappingType.ByLiteral:
      return info.converter.fromLiteral(value);
    default:
      throw new Error(`Can't yet recieve MappingType ${info.type}`);
  }
}

function AutoConstruct<S extends {prototype: {}}>(target: S) {
  return <T extends {prototype: {}}>(constructor:T) => {
    const doConstruct = <Q extends {prototype: {}}, R extends {prototype: {}}>(me: Q, other: R) => {
      const functions = targets.get(me);
      for (const f of functions.keys()) {
        const argNames = getArgs(me.prototype[f]);
        const descriptor = functions.get(f);

        // If this descriptor is for an initializer, record that fact and we'll process it after
        // the rest of the arguments.
        const initializer = descriptor.findIndex(d => d.initializer);
        // If this descriptor records that this argument is the identifier, record it
        // as the requestedId for mapping below.
        const requestedId = descriptor.findIndex(d => d.identifier);
        
        function impl(this: APIPort, ...args) {
          const messageBody = {};
          for (let i = 0; i < descriptor.length; i++) {
            if (i === initializer) {
              continue;
            }

            // Process this argument.
            messageBody[argNames[i]] = convert(descriptor[i], args[i], this._mapper);
          }
          
          // Process the initializer if present.
          if (initializer !== -1) {
            if (descriptor[initializer].redundant) {
              assert(requestedId === -1);
              messageBody['identifier'] = this._mapper.maybeCreateMappingForThing(args[initializer]);
            } else {
              messageBody['identifier'] = this._mapper.createMappingForThing(args[initializer], args[requestedId]);
            }
          }

          this.send(f, messageBody);
        }


        async function before(this: APIPort, messageBody) {
          const args = [];
          const promises = [];
          for (let i = 0; i < descriptor.length; i++) {
            // If there's a requestedId then the receiving end won't expect to
            // see the identifier as well.
            if (i === initializer && (requestedId !== -1 || descriptor[i].ignore)) {
              continue;
            }
            const argName = i === initializer ? 'identifier' : argNames[i];
            const result = unconvert(descriptor[i], messageBody[argName], this._mapper);
            if (result instanceof Promise) {
              promises.push({promise: result, position: args.length});
              args.push(() => unconvert(descriptor[i], messageBody[argName], this._mapper));
            } else {
              args.push(result);
            }
          }

          if (promises.length > 0) {
            await Promise.all(promises.map(a => a.promise));
            promises.forEach(a => args[a.position] = args[a.position]());
          }

          const result = this['on' + f](...args);

          // If this message is an initializer, need to establish a mapping
          // with the result of processing the message.
          if (initializer > -1) {
            assert(messageBody['identifier']);
            await this._mapper.establishThingMapping(messageBody['identifier'], result);
          }
        }

        Object.defineProperty(me.prototype, f, {
          get() {
            return impl;
          }
        });

        Object.defineProperty(other.prototype, 'before' + f, {
          get() {
            return before;
          }
        });
      }
    };
    
    doConstruct(constructor, target);
    doConstruct(target, constructor);
  };
}

export abstract class PECOuterPort extends APIPort {
  constructor(messagePort, arc) {
    super(messagePort, 'o');
    DevtoolsConnection.onceConnected.then(devtoolsChannel => {
      this.DevToolsConnected();
      this._debugAttachment = new OuterPortAttachment(arc, devtoolsChannel);
    });
  }

  @NoArgs Stop() {}
  DefineHandle(@RedundantInitializer handle: Handle, @ByLiteral(Type) type: Type, @Direct name: string) {}
  InstantiateParticle(@Initializer particle: ParticleSpec, @Identifier @Direct id: string, @ByLiteral(ParticleSpec) spec: ParticleSpec, @ObjectMap(MappingType.Direct, MappingType.Mapped) handles: {[index: string]: Handle}) {}
  
  UIEvent(@Mapped particle: ParticleSpec, @Direct slotName: string, @Direct event: {}) {}
  SimpleCallback(@RemoteMapped callback: number, @Direct data: {}) {}
  AwaitIdle(@Direct version: number) {}
  StartRender(@Mapped particle: ParticleSpec, @Direct slotName: string, @ObjectMap(MappingType.Direct, MappingType.Direct) providedSlots: {[index: string]: string}, @List(MappingType.Direct) contentTypes: string[]) {}
  StopRender(@Mapped particle: ParticleSpec, @Direct slotName: string) {}
  
  abstract onRender(particle: recipeParticle.Particle, slotName: string, content: string);
  abstract onInitializeProxy(handle: StorageProviderBase, callback: number);
  abstract onSynchronizeProxy(handle: StorageProviderBase, callback: number);
  abstract onHandleGet(handle: StorageProviderBase, callback: number);
  abstract onHandleToList(handle: StorageProviderBase, callback: number);
  abstract onHandleSet(handle: StorageProviderBase, data: {}, particleId: string, barrier: string);
  abstract onHandleClear(handle: StorageProviderBase, particleId: string, barrier: string);
  abstract onHandleStore(handle: StorageProviderBase, callback: number, data: {value: {}, keys: string[]}, particleId: string);
  abstract onHandleRemove(handle: StorageProviderBase, callback: number, data: {}, particleId: string);
  abstract onHandleRemoveMultiple(handle: StorageProviderBase, callback: number, data: {}, particleId: string);
  abstract onHandleStream(handle: StorageProviderBase, callback: number, pageSize: number, forward: boolean);
  abstract onStreamCursorNext(handle: StorageProviderBase, callback: number, cursorId: string);
  abstract onStreamCursorClose(handle: StorageProviderBase, cursorId: string);

  abstract onIdle(version: number, relevance: Map<recipeParticle.Particle, number[]>);

  abstract onGetBackingStore(callback: number, storageKey: string, type: Type);
  GetBackingStoreCallback(@Initializer store: StorageProviderBase, @RemoteMapped callback: number, @ByLiteral(Type) type: Type, @Direct name: string, @Identifier @Direct id: string, @Direct storageKey: string) {}
  
  abstract onConstructInnerArc(callback: number, particle: ParticleSpec);
  ConstructArcCallback(@RemoteMapped callback: number, @LocalMapped arc: {}) {}

  abstract onArcCreateHandle(callback: number, arc: {}, type: Type, name: string);
  CreateHandleCallback(@Initializer handle: StorageProviderBase, @RemoteMapped callback: number, @ByLiteral(Type) type: Type, @Direct name: string, @Identifier @Direct id: string) {}
  abstract onArcMapHandle(callback: number, arc: Arc, handle: recipeHandle.Handle);
  MapHandleCallback(@RemoteIgnore @Initializer newHandle: {}, @RemoteMapped callback: number, @Direct id: string) {}

  abstract onArcCreateSlot(callback: number, arc: Arc, transformationParticle: ParticleSpec, transformationSlotName: string, hostedParticleName: string, hostedSlotName: string, handleId: string);
  CreateSlotCallback(@RemoteIgnore @Initializer slot: {}, @RemoteMapped callback: number, @Direct hostedSlotId: string) {}
  InnerArcRender(@Mapped transformationParticle: ParticleSpec, @Direct transformationSlotName: string, @Direct hostedSlotId: string, @Direct content: {}) {}

  abstract onArcLoadRecipe(arc: Arc, recipe: string, callback: number);
  abstract onRaiseSystemException(exception: {}, methodName: string, particleId: string);

  // We need an API call to tell the context side that DevTools has been connected, so it can start sending
  // stack traces attached to the API calls made from that side.
  @NoArgs DevToolsConnected() {}
}

export interface CursorNextValue {
  value: {}[];
  done: boolean;
}

@AutoConstruct(PECOuterPort)
export abstract class PECInnerPort extends APIPort {
  constructor(messagePort) {
    super(messagePort, 'i');
  }
   
  abstract onStop();
  abstract onDefineHandle(identifier: string, type: Type, name: string);
  abstract onInstantiateParticle(id: string, spec: ParticleSpec, handles: {[index: string]: Handle});

  abstract onUIEvent(particle: Particle, slotName: string, event: {});
  abstract onSimpleCallback(callback: (data: {}) => void, data: {});
  abstract onAwaitIdle(version: number);
  abstract onStartRender(particle: Particle, slotName: string, providedSlots: Map<string, string>, contentTypes: string[]);
  abstract onStopRender(particle: Particle, slotName: string);

  Render(@Mapped particle: Particle, @Direct slotName: string, @Direct content: string) {}
  InitializeProxy(@Mapped handle: StorageProxy, @LocalMapped callback: (data: {version: number}) => void) {}
  SynchronizeProxy(@Mapped handle: StorageProxy, @LocalMapped callback: (data: {version: number, model: SerializedModelEntry[]}) => void) {}
  HandleGet(@Mapped handle: StorageProxy, @LocalMapped callback: (data: {id: string}) => void) {}
  HandleToList(@Mapped handle: StorageProxy, @LocalMapped callback: (data: {id: string}[]) => void) {}
  HandleSet(@Mapped handle: StorageProxy, @Direct data: {}, @Direct particleId: string, @Direct barrier: string) {}
  HandleClear(@Mapped handle: StorageProxy, @Direct particleId: string, @Direct barrier: string) {}
  HandleStore(@Mapped handle: StorageProxy, @LocalMapped callback: () => void, @Direct data: {}, @Direct particleId: string) {}
  HandleRemove(@Mapped handle: StorageProxy, @LocalMapped callback: () => void, @Direct data: {}, @Direct particleId: string) {}
  HandleRemoveMultiple(@Mapped handle: StorageProxy, @LocalMapped callback: () => void, @Direct data: {}, @Direct particleId: string) {}
  HandleStream(@Mapped handle: StorageProxy, @LocalMapped callback: (data: number) => void, @Direct pageSize: number, @Direct forward: boolean) {}
  StreamCursorNext(@Mapped handle: StorageProxy, @LocalMapped callback: (value: CursorNextValue) => void, @Direct cursorId: string) {}
  StreamCursorClose(@Mapped handle: StorageProxy, @Direct cursorId: string) {}

  Idle(@Direct version: number, @ObjectMap(MappingType.Mapped, MappingType.Direct) relevance: Map<Particle, number[]>) {}

  GetBackingStore(@LocalMapped callback: (proxy: StorageProxy, key: string) => void, @Direct storageKey: string, @ByLiteral(Type) type: Type) {}
  abstract onGetBackingStoreCallback(callback: (proxy: StorageProxy, key: string) => void, type: Type, name: string, id: string, storageKey: string);

  ConstructInnerArc(@LocalMapped callback: (arc: string) => void, @Mapped particle: Particle) {}
  abstract onConstructArcCallback(callback: (arc: string) => void, arc: string);

  ArcCreateHandle(@LocalMapped callback: (proxy: StorageProxy) => void, @RemoteMapped arc: {}, @ByLiteral(Type) type: Type, @Direct name: string) {}
  abstract onCreateHandleCallback(callback: (proxy: StorageProxy) => void, type: Type, name: string, id: string);
  ArcMapHandle(@LocalMapped callback: (value: string) => void, @RemoteMapped arc: {}, @Mapped handle: Handle) {}
  abstract onMapHandleCallback(callback: (value: string) => void, id: string);

  ArcCreateSlot(@LocalMapped callback: (value: string) => void, @RemoteMapped arc: {}, @Mapped transformationParticle: Particle, @Direct transformationSlotName: string, @Direct hostedParticleName: string, @Direct hostedSlotName: string, @Direct handleId: string) {}
  abstract onCreateSlotCallback(callback: (value: string) => void, hostedSlotId: string);
  abstract onInnerArcRender(transformationParticle: Particle, transformationSlotName: string, hostedSlotID: string, content: string);

  ArcLoadRecipe(@RemoteMapped arc: {}, @Direct recipe: string, @LocalMapped callback: (data: {error?: string}) => void) {}

  RaiseSystemException(@Direct exception: {}, @Direct methodName: string, @Direct particleId: string) {}

    // To show stack traces for calls made inside the context, we need to capture the trace at the call point and
    // send it along with the message. We only want to do this after a DevTools connection has been detected, which
    // we can't directly detect inside a worker context, so the PECOuterPort will send an API message instead.

  onDevToolsConnected() {
    this._attachStack = true;
  }  

}
