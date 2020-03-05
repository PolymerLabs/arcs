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
import {Arc} from './arc.js';
import {AbstractStore} from './storageNG/abstract-store.js';
import {ArcInspector} from './arc-inspector.js';
import {ParticleSpec} from './particle-spec.js';
import {Particle} from './particle.js';
import * as recipeHandle from './recipe/handle.js';
import * as recipeParticle from './recipe/particle.js';
import {StorageProxy as StorageProxyNG} from './storageNG/storage-proxy.js';
import {Type} from './type.js';
import {PropagatedException, reportGlobalException} from './arc-exceptions.js';
import {Consumer, Literal, Literalizable, Runnable} from './hot.js';
import {floatingPromiseToAudit} from './util.js';
import {MessagePort} from './message-channel.js';
import {CRDTTypeRecord} from './crdt/crdt.js';
import {ProxyCallback, ProxyMessage, Store} from './storageNG/store.js';
import {NoTraceWithReason, SystemTrace} from '../tracelib/systrace.js';
import {workerPool} from './worker-pool.js';
import {Ttl} from './recipe/ttl.js';
import {Handle} from './storageNG/handle.js';
import {BackingStore} from './storageNG/backing-store.js';
import {BackingStorageProxy} from './storageNG/backing-storage-proxy.js';

type StorageProxy = StorageProxyNG<CRDTTypeRecord>;

enum MappingType {Mapped, LocalMapped, RemoteMapped, Direct, ObjectMap, List, ByLiteral}

interface MappingInfo<T> {
  type: MappingType;
  initializer?: boolean;
  redundant?: boolean;
  overriding?: boolean;
  value?: MappingInfo<T>;
  key?: MappingInfo<T>;
  converter?: Literalizable<T, Literal>;
  identifier?: boolean;
  ignore?: boolean;
}

type TargetInfo = Map<string, MappingInfo<unknown>[]>;
const targets = new Map<{}, TargetInfo>();

function setPropertyKey(target: {}, propertyKey: string) {
  let map = targets.get(target);
  if (map == undefined) {
    map = new Map();
    targets.set(target, map);
  }
  let list = map.get(propertyKey);
  if (list == undefined) {
    list = [];
    map.set(propertyKey, list);
  }
  return list;
}

function getPropertyKey(target: {}, propertyKey: string, parameterIndex: number) {
  const map = targets.get(target);
  if (map) {
    const list = map.get(propertyKey);
    if (list) {
      const result = list[parameterIndex];
      if (result) {
        return result;
      }
    }
  }
  throw new Error(`the target ${target}, propertyKey ${propertyKey} and parameterIndex ${parameterIndex} provided did not exist`);
}

function set<T>(target: {}, propertyKey: string, parameterIndex: number, info: MappingInfo<T>) {
  const list = setPropertyKey(target, propertyKey);
  list[parameterIndex] = info;
}

function Direct(target: {}, propertyKey: string, parameterIndex: number) {
  set(target.constructor, propertyKey, parameterIndex, {type: MappingType.Direct});
}

function Mapped(target: {}, propertyKey: string, parameterIndex: number) {
  set(target.constructor, propertyKey, parameterIndex, {type: MappingType.Mapped});
}

function ByLiteral<T>(constructor: Literalizable<T, Literal>) {
  return (target: {}, propertyKey: string, parameterIndex: number) => {
    const info: MappingInfo<T> = {type: MappingType.ByLiteral, converter: constructor};
    set(target.constructor, propertyKey, parameterIndex, info);
  };
}

function ObjectMap<T>(key: MappingType, value: MappingType) {
  return (target: {}, propertyKey: string, parameterIndex: number) => {
    const info: MappingInfo<T> = {type: MappingType.ObjectMap, key: {type: key}, value: {type: value}};
    set(target.constructor, propertyKey, parameterIndex, info);
  };
}

function List<T>(value: MappingType) {
  return (target: {}, propertyKey: string, parameterIndex: number) => {
    const info: MappingInfo<T> = {type: MappingType.List, value: {type: value}};
    set(target.constructor, propertyKey, parameterIndex, info);
  };
}

function LocalMapped(target: {}, propertyKey: string, parameterIndex: number) {
  set(target.constructor, propertyKey, parameterIndex, {type: MappingType.LocalMapped});
}

function RemoteMapped(target: {}, propertyKey: string, parameterIndex: number) {
  set(target.constructor, propertyKey, parameterIndex, {type: MappingType.RemoteMapped});
}

function NoArgs(target: {constructor: {}}, propertyKey: string) {
  setPropertyKey(target.constructor, propertyKey);
}

function RedundantInitializer(target: {}, propertyKey: string, parameterIndex: number) {
  set(target.constructor, propertyKey, parameterIndex, {type: MappingType.Direct, initializer: true, redundant: true});
}

function OverridingInitializer(target: {}, propertyKey: string, parameterIndex: number) {
  set(target.constructor, propertyKey, parameterIndex, {type: MappingType.Direct, initializer: true, overriding: true});
}

function Initializer(target: {}, propertyKey: string, parameterIndex: number) {
  set(target.constructor, propertyKey, parameterIndex, {type: MappingType.Direct, initializer: true});
}

function Identifier(target: {}, propertyKey: string, parameterIndex: number) {
  getPropertyKey(target.constructor, propertyKey, parameterIndex).identifier = true;
}

function RemoteIgnore(target: {}, propertyKey: string, parameterIndex: number) {
  getPropertyKey(target.constructor, propertyKey, parameterIndex).ignore = true;
}

class ThingMapper {
  _prefix: string;
  _nextIdentifier: number;
  _idMap: Map<string, {}>;
  _reverseIdMap: Map<{}, string>;

  constructor(prefix: string) {
    this._prefix = prefix;
    this._nextIdentifier = 0;
    this._idMap = new Map();
    this._reverseIdMap = new Map();
  }

  _newIdentifier(): string {
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
    // TODO: Awaiting this promise causes tests to fail...
    floatingPromiseToAudit(this.establishThingMapping(id, thing));
    return id;
  }

  recreateMappingForThing(things) {
    const ids = [];
    things.forEach(thing => {
      assert(this._reverseIdMap.has(thing));
      const id = this._reverseIdMap.get(thing);
      floatingPromiseToAudit(this.establishThingMapping(id, thing));
      ids.push(id);
    });
    return ids;
  }

  maybeCreateMappingForThing(thing) {
    if (this.hasMappingForThing(thing)) {
      return this.identifierForThing(thing);
    }
    return this.createMappingForThing(thing);
  }

  async establishThingMapping(id, thing) {
    let continuation;
    if (!Array.isArray(id)) {
      if (Array.isArray(thing)) {
        [thing, continuation] = thing;
      }
      this._idMap.set(id, thing);
    }

    if (thing instanceof Promise) {
      assert(continuation == null);
      await this.establishThingMapping(id, await thing);
    } else if (Array.isArray(id)) {
      assert(id.length === thing.length);
      for (let i = 0; i < id.length; i++) {
        await this.establishThingMapping(id[i], thing[i]);
      }
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

  hasMappingForId(id) {
    return this._idMap.has(id);
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

@SystemTrace
export class APIPort {
  private readonly _port: MessagePort;
  _mapper: ThingMapper;
  protected inspector: ArcInspector | null;
  protected attachStack: boolean;
  messageCount: number;
  constructor(messagePort: MessagePort, prefix: string, private onError: Consumer<Error>) {
    this._port = messagePort;
    this._mapper = new ThingMapper(prefix);
    this._port.onmessage = async e => this._processMessage(e);
    this.inspector = null;
    this.attachStack = false;
    this.messageCount = 0;

    this._testingHook();
  }

  // Overridden by unit tests.
  _testingHook() {
  }

  // Clear resources bound to this port prior to closing.
  // Overridden by inner, outer and any derived port implementations.
  clear() {
  }

  close(): void {
    if (workerPool.exist(this._port)) {
      // The worker associated with this port is put into the suspended list
      // rather than being destroyed immediately when this PEH/PEC APIPort
      // is closed.
      workerPool.suspend(this._port);
    }
    this.clear();
    this._port.close();
  }

  @NoTraceWithReason('Chatty')
  async _processMessage(e) {
    assert(this['before' + e.data.messageType] !== undefined);
    const count = this.messageCount++;
    if (this.inspector) {
      this.inspector.pecMessage('on' + e.data.messageType, e.data.messageBody, count,
          this.supportsExternalParticle() ? /* android */ 'a' : /* web */ 'w',
          this._port['pecId'],
          e.data.stack);
    }
    try {
      await this['before' + e.data.messageType](e.data.messageBody);
    } catch (err) {
      this.onError(err);
    }
  }

  @NoTraceWithReason('Recursion on sending trace messages inner->outer')
  async send(name: string, args: {}) {
    const call = {messageType: name, messageBody: args, stack: this.attachStack ? new Error().stack : undefined};
    const count = this.messageCount++;
    if (this.inspector) {
      this.inspector.pecMessage(name, args, count,
          this.supportsExternalParticle() ? /* android */ 'a' : /* web */ 'w',
          this._port['pecId'] || '',
          new Error().stack || '');
    }
    await this._port.postMessage(call);
  }

  @NoTraceWithReason('Chatty')
  supportsExternalParticle(): boolean {
    // TODO: improve heuristics.
    return Object.getPrototypeOf(this._port.constructor).name === 'MessagePort';
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
function convert<T>(info: MappingInfo<T> | undefined, value: any, mapper: ThingMapper) {
  if (info === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
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
    case MappingType.ObjectMap: {
      const r = {};
      value.forEach((childvalue, key) => r[convert(info.key, key, mapper)] = convert(info.value, childvalue, mapper));
      return r;
    }
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
function unconvert<T>(info: MappingInfo<T> | undefined, value: any, mapper: ThingMapper) {
  if (info === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
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
    case MappingType.ObjectMap: {
      const r = new Map();
      for (const key of Object.keys(value)) {
        r.set(unconvert(info.key, key, mapper), unconvert(info.value, value[key], mapper));
      }
      return r;
    }
    case MappingType.List:
      return value.map(v => unconvert(info.value, v, mapper));
    case MappingType.ByLiteral:
      if (!info.converter) {
        throw new Error(`Expected ${info.type} to have a converter but it doesn't`);
      }
      return info.converter.fromLiteral(value);
    default:
      throw new Error(`Can't yet recieve MappingType ${info.type}`);
  }
}

function AutoConstruct<S extends {prototype: {}}>(target: S) {
  return <T extends {prototype: {}}>(constructor:T) => {
    const doConstruct = <Q extends {prototype: {}}, R extends {prototype: {}}>(me: Q, other: R) => {
      const functions: TargetInfo = targets.get(me) || new Map();
      for (const f of functions.keys()) {
        const argNames = getArgs(me.prototype[f]);
        const descriptor = functions.get(f) || [];

        // If this descriptor is for an initializer, record that fact and we'll process it after
        // the rest of the arguments.
        const initializer = descriptor.findIndex(d => d.initializer || false);
        // If this descriptor records that this argument is the identifier, record it
        // as the requestedId for mapping below.
        const requestedId = descriptor.findIndex(d => d.identifier || false);

        /** @this APIPort */
        const impl = async function(this: APIPort, ...args) {
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
            } else if (descriptor[initializer].overriding) {
              messageBody['identifier'] = this._mapper.recreateMappingForThing(args[initializer]);
            } else {
              messageBody['identifier'] = this._mapper.createMappingForThing(args[initializer], args[requestedId]);
            }
          }

          await this.send(f, messageBody);
        };


        /** @this APIPort */
        const before = async function before(this: APIPort, messageBody) {
          const args: (unknown | (() => unknown))[] = [];
          const promises: {promise: Promise<unknown>, position: number}[] = [];
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
            await Promise.all(promises.map(async a => a.promise));
            promises.forEach(a => {
              args[a.position] = (args[a.position] as (() => unknown))();
            });
          }

          // For redundant initializers, we first check if we already have a
          // mapping for that ID.
          if (initializer !== -1 && descriptor[initializer].redundant) {
            if (this._mapper.hasMappingForId(messageBody['identifier'])) {
              // No need to process again.
              return;
            }
          }

          const result = this['on' + f](...args);

          // If this message is an initializer, need to establish a mapping
          // with the result of processing the message.
          if (initializer > -1) {
            assert(messageBody['identifier']);
            await this._mapper.establishThingMapping(messageBody['identifier'], result);
          }
        };

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
  constructor(messagePort: MessagePort, arc: Arc) {
    super(messagePort, 'o', (error: Error) => { reportGlobalException(arc, error); });
    this.inspector = arc.inspector;
    if (this.inspector) {
      this.inspector.onceActive.then(() => this.DevToolsConnected(), e => console.error(e));
    }
  }

  @NoTraceWithReason('Chatty')
  async _processMessage(e) {
    // Modifying pec messages on the host side is a problem as they can be transmited to DevTools
    // with a delay. If the object representing a message is modified, it appears as if a different
    // messages travelled across the pec. We could have made a deep copy of the message object, but
    // agreed that these objects should not be modified as a matter of principle. We are freezing
    // them as a defensive measure. This has some performance penalty, so it could potentially be
    // disabled in the future for production builds.
    deepFreeze(e.data);
    await super._processMessage(e);
  }

  @NoArgs Stop() {}
  DefineHandle(@RedundantInitializer store: AbstractStore, @ByLiteral(Type) type: Type, @Direct name: string, @Direct storageKey: string, @ByLiteral(Ttl) ttl: Ttl) {}
  InstantiateParticle(@Initializer particle: recipeParticle.Particle, @Identifier @Direct id: string, @ByLiteral(ParticleSpec) spec: ParticleSpec, @ObjectMap(MappingType.Direct, MappingType.Mapped) stores: Map<string, AbstractStore>, @Direct reinstantiate: boolean) {}
  ReinstantiateParticle(@Identifier @Direct id: string, @ByLiteral(ParticleSpec) spec: ParticleSpec, @ObjectMap(MappingType.Direct, MappingType.Mapped) stores: Map<string, AbstractStore>) {}
  ReloadParticles(@OverridingInitializer particles: recipeParticle.Particle[], @List(MappingType.Direct) ids: string[]) {}

  UIEvent(@Mapped particle: recipeParticle.Particle, @Direct slotName: string, @Direct event: {}) {}
  SimpleCallback(@RemoteMapped callback: number, @Direct data: {}) {}
  AwaitIdle(@Direct version: number) {}

  abstract onRegister(handle: Store<CRDTTypeRecord>, messagesCallback: number, idCallback: number);
  abstract onBackingRegister(handle: BackingStore<CRDTTypeRecord>, messagesCallback: number, idCallback: number);
  abstract onProxyMessage(handle: Store<CRDTTypeRecord>, message: ProxyMessage<CRDTTypeRecord>, callback: number);
  abstract onBackingProxyMessage(handle: BackingStore<CRDTTypeRecord>, message: ProxyMessage<CRDTTypeRecord>, callback: number);

  abstract onIdle(version: number, relevance: Map<recipeParticle.Particle, number[]>);

  abstract onGetBackingStore(callback: number, storageKey: string, type: Type);
  GetBackingStoreCallback(@Initializer store: AbstractStore, @RemoteMapped callback: number, @ByLiteral(Type) type: Type, @Direct name: string, @Identifier @Direct id: string, @Direct storageKey: string) {}

  abstract onConstructInnerArc(callback: number, particle: recipeParticle.Particle);
  ConstructArcCallback(@RemoteMapped callback: number, @LocalMapped arc: {}) {}

  abstract onArcCreateHandle(callback: number, arc: {}, type: Type, name: string);
  CreateHandleCallback(@Initializer handle: AbstractStore, @RemoteMapped callback: number, @ByLiteral(Type) type: Type, @Direct name: string, @Identifier @Direct id: string) {}
  abstract onArcMapHandle(callback: number, arc: Arc, handle: recipeHandle.Handle);
  MapHandleCallback(@RemoteIgnore @Initializer newHandle: {}, @RemoteMapped callback: number, @Direct id: string) {}

  abstract onArcCreateSlot(callback: number, arc: Arc, transformationParticle: recipeParticle.Particle, transformationSlotName: string, handleId: string);
  CreateSlotCallback(@RemoteIgnore @Initializer slot: {}, @RemoteMapped callback: number, @Direct hostedSlotId: string) {}

  abstract onArcLoadRecipe(arc: Arc, recipe: string, callback: number);
  abstract onReportExceptionInHost(exception: PropagatedException);

  abstract onServiceRequest(particle: recipeParticle.Particle, request: {}, callback: number);

  abstract onSystemTraceBegin(tag: string, cookie: number);
  abstract onSystemTraceEnd(tag: string, cookie: number);

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
  constructor(messagePort: MessagePort) {
    // TODO(shanestephens): Try to feed some more information through to PropagatedException - can perhaps
    // recover the method invoked and (sometimes) the particle.
    super(messagePort, 'i', err => this.ReportExceptionInHost(new PropagatedException(err)));
  }

  abstract onStop();
  abstract onDefineHandle(identifier: string, type: Type, name: string, storageKey: string, ttl: Ttl);
  abstract onInstantiateParticle(id: string, spec: ParticleSpec, proxies: Map<string, StorageProxy|StorageProxyNG<CRDTTypeRecord>>, reinstantiate: boolean);
  abstract onReinstantiateParticle(id: string, spec: ParticleSpec, proxies: Map<string, StorageProxy>);
  abstract onReloadParticles(ids: string[]);

  abstract onUIEvent(particle: Particle, slotName: string, event: {});
  abstract onSimpleCallback(callback: Consumer<{}>, data: {});
  abstract onAwaitIdle(version: number);

  Output(@Mapped particle: Particle, @Direct content: {}) {}

  Register(
    @Mapped handle: StorageProxy,
    @LocalMapped messagesCallback: ProxyCallback<CRDTTypeRecord>,
    @LocalMapped idCallback: Consumer<number>): void  {}
  BackingRegister(
    @Mapped handle: BackingStorageProxy<CRDTTypeRecord>,
    @LocalMapped messagesCallback: ProxyCallback<CRDTTypeRecord>,
    @LocalMapped idCallback: Consumer<number>): void {}
  ProxyMessage(
    @Mapped handle: StorageProxy,
    @Direct message: ProxyMessage<CRDTTypeRecord>,
    @LocalMapped callback: Consumer<Promise<boolean>>): void  {}
  BackingProxyMessage(
    @Mapped handle: BackingStorageProxy<CRDTTypeRecord>,
    @Direct message: ProxyMessage<CRDTTypeRecord>,
    @LocalMapped callback: Consumer<Promise<boolean>>): void {}

  Idle(@Direct version: number, @ObjectMap(MappingType.Mapped, MappingType.Direct) relevance: Map<Particle, number[]>) {}

  GetBackingStore(@LocalMapped callback: (proxy: StorageProxy, key: string) => void, @Direct storageKey: string, @ByLiteral(Type) type: Type) {}
  abstract onGetBackingStoreCallback(callback: (proxy: StorageProxy, key: string) => void, type: Type, name: string, id: string, storageKey: string);

  ConstructInnerArc(@LocalMapped callback: Consumer<string>, @Mapped particle: Particle) {}
  abstract onConstructArcCallback(callback: Consumer<string>, arc: string);

  ArcCreateHandle(@LocalMapped callback: Consumer<StorageProxy>, @RemoteMapped arc: {}, @ByLiteral(Type) type: Type, @Direct name: string) {}
  abstract onCreateHandleCallback(callback: Consumer<StorageProxy>, type: Type, name: string, id: string);
  ArcMapHandle(@LocalMapped callback: Consumer<string>, @RemoteMapped arc: {}, @Mapped handle: Handle<CRDTTypeRecord>) {}
  abstract onMapHandleCallback(callback: Consumer<string>, id: string);

  ServiceRequest(@Mapped particle: Particle, @Direct content: {}, @LocalMapped callback: Function) {}

  SystemTraceBegin(@Direct tag: string, @Direct cookie: number) {}
  SystemTraceEnd(@Direct tag: string, @Direct cookie: number) {}

  ArcCreateSlot(@LocalMapped callback: Consumer<string>, @RemoteMapped arc: {}, @Mapped transformationParticle: Particle, @Direct transformationSlotName: string, @Direct handleId: string) {}
  abstract onCreateSlotCallback(callback: Consumer<string>, hostedSlotId: string);

  ArcLoadRecipe(@RemoteMapped arc: {}, @Direct recipe: string, @LocalMapped callback: Consumer<{error?: string}>) {}

  ReportExceptionInHost(@ByLiteral(PropagatedException) exception: PropagatedException) {}

  // To show stack traces for calls made inside the context, we need to capture the trace at the call point and
  // send it along with the message. We only want to do this after a DevTools connection has been detected, which
  // we can't directly detect inside a worker context, so the PECOuterPort will send an API message instead.
  onDevToolsConnected() {
    this.attachStack = true;
  }
}

function deepFreeze(object: object) {
  for (const name of Object.getOwnPropertyNames(object)) {
    const value = object[name];
    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  }

  Object.freeze(object);
}
