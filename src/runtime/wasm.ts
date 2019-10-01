/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {Schema} from './schema.js';
import {Entity, EntityRawData} from './entity.js';
import {Reference} from './reference.js';
import {ReferenceType} from './type.js';
import {Storable} from './handle.js';
import {Particle} from './particle.js';
import {Handle, Singleton, Collection} from './handle.js';
import {Content} from './slot-consumer.js';
import {Dictionary} from './hot.js';
import {Loader} from './loader.js';
import {PECInnerPort} from './api-channel.js';
import {UserException} from './arc-exceptions.js';
import {ParticleExecutionContext} from './particle-execution-context.js';

// Encodes/decodes the wire format for transferring entities over the wasm boundary.
// Note that entities must have an id before serializing for use in a wasm particle.
//
//  <singleton> = <id-length>:<id>|<name>:<value>|<name>:<value>| ... |
//  <value> depends on the field type:
//    Text       <name>:T<length>:<text>
//    URL        <name>:U<length>:<text>
//    Number     <name>:N<number>:
//    Boolean    <name>:B<zero-or-one>
//
//  <collection> = <num-entities>:<length>:<encoded><length>:<encoded> ...
//
//  <reference> = <length>:<id>|<length>:<storage-key>|
//
// Examples:
//   Singleton:   4:id05|txt:T3:abc|lnk:U10:http://def|num:N37:|flg:B1|
//   Collection:  3:29:4:id12|txt:T4:qwer|num:N9.2:|18:6:id2670|num:N-7:|15:5:id501|flg:B0|
//   Reference:   5:id461|65:volatile://!684596363489092:example^^volatile-Result {Text value}|
//
// The encoder classes also support a "Dictionary" format of key:value string pairs:
//   <size>:<key-len>:<key><value-len>:<value><key-len>:<key><value-len>:<value>...
export class EntityPackager {
  private encoder: StringEncoder;
  private decoder: StringDecoder;

  constructor(handle: Handle) {
    const schema = handle.entityClass.schema;
    assert(schema.names.length > 0, 'At least one schema name is required for entity packaging');

    let refType: ReferenceType = null;
    if (handle.type instanceof ReferenceType) {
      refType = handle.type;
    } else if (handle.type.getContainedType() instanceof ReferenceType) {
      refType = handle.type.getContainedType() as ReferenceType;
    }

    this.encoder = new StringEncoder(schema);
    this.decoder = new StringDecoder(schema, refType, handle.storage.pec);
  }

  encodeSingleton(entity: Entity): string {
    return this.encoder.encodeSingleton(entity);
  }

  encodeCollection(entities: Entity[]): string {
    return this.encoder.encodeCollection(entities);
  }

  decodeSingleton(str: string): Storable {
    return this.decoder.decodeSingleton(str);
  }
}

function encodeStr(str: string) {
  return str.length + ':' + str;
}

class StringEncoder {
  constructor(readonly schema: Schema) {}

  encodeSingleton(entity: Entity): string {
    if (entity instanceof Reference) {
      const {id, storageKey} = entity.dataClone();
      return encodeStr(id) + '|' + encodeStr(storageKey) + '|';
    } else {
      const id = Entity.id(entity);
      let encoded = encodeStr(id) + '|';
      for (const [name, value] of Object.entries(entity)) {
        encoded += this.encodeField(this.schema.fields[name], name, value);
      }
      return encoded;
    }
  }

  encodeCollection(entities: Entity[]): string {
    let encoded = entities.length + ':';
    for (const entity of entities) {
      encoded += encodeStr(this.encodeSingleton(entity));
    }
    return encoded;
  }

  static encodeDictionary(dict: Dictionary<string>): string {
    const entries = Object.entries(dict);
    let encoded = entries.length + ':';
    for (const [key, value] of entries) {
      encoded += encodeStr(key) + encodeStr(value);
    }
    return encoded;
  }

  private encodeField(field, name, value) {
    switch (field.kind) {
      case 'schema-primitive':
        return name + ':' + field.type.substr(0, 1) + this.encodeValue(field.type, value) + '|';

      case 'schema-collection':
      case 'schema-union':
      case 'schema-tuple':
      case 'schema-reference':
        throw new Error(`'${field.kind}' not yet supported for entity packaging`);

      default:
        throw new Error(`Unknown field kind '${field.kind}' in schema`);
    }
  }

  private encodeValue(type, value)  {
    switch (type) {
      case 'Text':
      case 'URL':
        return encodeStr(value);

      case 'Number':
        return value + ':';

      case 'Boolean':
        return (value ? '1' : '0');

      case 'Bytes':
      case 'Object':
        throw new Error(`'${type}' not yet supported for entity packaging`);

      default:
        throw new Error(`Unknown primitive value type '${type}' in schema`);
    }
  }
}

class StringDecoder {
  str: string;
  constructor(readonly schema: Schema = null,
              readonly referenceType: ReferenceType = null,
              readonly pec: ParticleExecutionContext = null) {}

  decodeSingleton(str: string): Storable {
    this.str = str;
    const len = Number(this.upTo(':'));
    const id = this.chomp(len);
    this.validate('|');

    if (this.referenceType) {
      const keyLen = Number(this.upTo(':'));
      const storageKey = this.chomp(keyLen);
      this.validate('|');
      return new Reference({id, storageKey}, this.referenceType, this.pec);
    } else {
      const data = {};
      while (this.str.length > 0) {
        const name = this.upTo(':');
        const typeChar = this.chomp(1);
        data[name] = this.decodeValue(typeChar);
        this.validate('|');
      }
      const entity = new (this.schema.entityClass())(data);
      if (id !== '') {
        Entity.identify(entity, id);
      }
      return entity;
    }
  }

  decodeDictionary(str: string): Dictionary<string> {
    this.str = str;
    const dict = {};
    let num = Number(this.upTo(':'));
    while (num--) {
      const klen = Number(this.upTo(':'));
      const key = this.chomp(klen);
      const vlen = Number(this.upTo(':'));
      dict[key] = this.chomp(vlen);
    }
    return dict;
  }

  private upTo(char) {
    const i = this.str.indexOf(char);
    if (i < 0) {
      throw new Error(`Packaged entity decoding fail: expected '${char}' separator in '${this.str}'`);
    }
    const token = this.str.slice(0, i);
    this.str = this.str.slice(i + 1);
    return token;
  }

  private chomp(len) {
    if (len > this.str.length) {
      throw new Error(`Packaged entity decoding fail: expected '${len}' chars to remain in '${this.str}'`);
    }
    const token = this.str.slice(0, len);
    this.str = this.str.slice(len);
    return token;
  }

  private validate(token) {
    if (this.chomp(token.length) !== token) {
      throw new Error(`Packaged entity decoding fail: expected '${token}' at start of '${this.str}'`);
    }
  }

  private decodeValue(typeChar) {
    switch (typeChar) {
      case 'T':
      case 'U': {
        const len = Number(this.upTo(':'));
        return this.chomp(len);
      }

      case 'N':
        return Number(this.upTo(':'));

      case 'B':
        return Boolean(this.chomp(1) === '1');

      default:
        throw new Error(`Packaged entity decoding fail: unknown or unsupported primitive value type '${typeChar}'`);
    }
  }
}

/**
 * Per-language platform environment and startup specializations for Emscripten and Kotlin.
 */
interface WasmDriver {
  /**
   * Adds required import functions into env for a given language runtime and initializes
   * any fields needed on the wasm container, such as memory, tables, etc.
   */
  configureEnvironment(module: WebAssembly.Module, container: WasmContainer, env: {});

  /**
   * Initializes the instantiated WebAssembly, runs any startup lifecycle, and if this
   * runtime manages its own memory initialization, initializes the heap pointers.
   */
  initializeInstance(container: WasmContainer, instance: WebAssembly.Instance);
}

class EmscriptenWasmDriver implements WasmDriver {
  private readonly cfg: {memSize: number, tableSize: number, globalBase: number, dynamicBase: number, dynamictopPtr: number};

  // Records file and line for console logging in C++. This is set by the console/error macros in
  // arcs.h and used immediately in the following printf call (implemented by sysWritev() below).
  private logInfo: [string, number]|null = null;

  constructor(customSection: ArrayBuffer) {
    // Wasm modules built by emscripten require some external memory configuration by the caller,
    // which is usually built into the glue code generated alongside the module. We're not using
    // the glue code, but if we set the EMIT_EMSCRIPTEN_METADATA flag when building, emscripten
    // will provide a custom section in the module itself with the required values.
    const METADATA_SIZE = 11;
    const METADATA_MAJOR = 0;
    const METADATA_MINOR = 2;
    const ABI_MAJOR = 0;
    const ABI_MINOR = 4;

    // The logic for reading metadata values here was copied from the emscripten source.
    const buffer = new Uint8Array(customSection);
    const metadata: number[] = [];
    let offset = 0;
    while (offset < buffer.byteLength) {
      let result = 0;
      let shift = 0;
      while (1) {
        const byte = buffer[offset++];
        result |= (byte & 0x7f) << shift;
        if (!(byte & 0x80)) {
          break;
        }
        shift += 7;
      }
      metadata.push(result);
    }

    // The specifics of the section are not published anywhere official (yet). The values here
    // correspond to emscripten version 1.38.42:
    //   https://github.com/emscripten-core/emscripten/blob/1.38.42/tools/shared.py#L3051
    if (metadata.length < 4) {
      throw new Error(`emscripten metadata section should have at least 4 values; ` +
                      `got ${metadata.length}`);
    }
    if (metadata[0] !== METADATA_MAJOR || metadata[1] !== METADATA_MINOR) {
      throw new Error(`emscripten metadata version should be ${METADATA_MAJOR}.${METADATA_MINOR}; ` +
                      `got ${metadata[0]}.${metadata[1]}`);
    }
    if (metadata[2] !== ABI_MAJOR || metadata[3] !== ABI_MINOR) {
      throw new Error(`emscripten ABI version should be ${ABI_MAJOR}.${ABI_MINOR}; ` +
                      `got ${metadata[2]}.${metadata[3]}`);
    }
    if (metadata.length !== METADATA_SIZE) {
      throw new Error(`emscripten metadata section should have ${METADATA_SIZE} values; ` +
                      `got ${metadata.length}`);
    }

    // metadata[4] is 'Settings.WASM_BACKEND'; whether the binary is from wasm backend or fastcomp.
    // metadata[10] is 'tempdoublePtr'; appears to be related to pthreads and is not used here.
    this.cfg = {
      memSize: metadata[5],
      tableSize: metadata[6],
      globalBase: metadata[7],
      dynamicBase: metadata[8],
      dynamictopPtr: metadata[9],
    };
  }

  configureEnvironment(module: WebAssembly.Module, container: WasmContainer, env: {}) {
    container.memory = new WebAssembly.Memory({initial: this.cfg.memSize, maximum: this.cfg.memSize});
    container.heapU8 = new Uint8Array(container.memory.buffer);
    container.heap32 = new Int32Array(container.memory.buffer);

    // We need to poke the address of the heap base into the memory buffer prior to instantiating.
    container.heap32[this.cfg.dynamictopPtr >> 2] = this.cfg.dynamicBase;

    Object.assign(env, {
      // Memory setup
      memory: container.memory,
      __memory_base: this.cfg.globalBase,
      table: new WebAssembly.Table({initial: this.cfg.tableSize, maximum: this.cfg.tableSize, element: 'anyfunc'}),
      __table_base: 0,
      DYNAMICTOP_PTR: this.cfg.dynamictopPtr,

      // Heap management
      _emscripten_get_heap_size: () => container.heapU8.length,  // Matches emscripten glue js
      _emscripten_resize_heap: (size) => false,  // TODO
      _emscripten_memcpy_big: (dst, src, num) => container.heapU8.set(container.heapU8.subarray(src, src + num), dst),

      // Error handling
      _systemError: (msg) => { throw new Error(container.read(msg)); },
      abortOnCannotGrowMemory: (size)  => { throw new Error(`abortOnCannotGrowMemory(${size})`); },

      // Logging
      _setLogInfo: (file, line) => this.logInfo = [container.read(file), line],
      ___syscall146: (which, varargs) => this.sysWritev(container, which, varargs),
    });
  }

  initializeInstance(container: WasmContainer, instance: WebAssembly.Instance) {
    // Emscripten doesn't need main() invoked
  }

  // C++ printf support cribbed from emscripten glue js - currently only supports ASCII
  sysWritev(container, which, varargs) {
    const get = () => {
      varargs += 4;
      return container.heap32[(((varargs)-(4))>>2)];
    };

    const output = (get() === 1) ? console.log : console.error;
    const iov = get();
    const iovcnt = get();

    // TODO: does this need to be persistent across calls? (i.e. due to write buffering)
    let str = this.logInfo ? `[${this.logInfo[0]}:${this.logInfo[1]}] ` : '';
    let ret = 0;
    for (let i = 0; i < iovcnt; i++) {
      const ptr = container.heap32[(((iov)+(i*8))>>2)];
      const len = container.heap32[(((iov)+(i*8 + 4))>>2)];
      for (let j = 0; j < len; j++) {
        const curr = container.heapU8[ptr+j];
        if (curr === 0 || curr === 10) {  // NUL or \n
          output(str);
          str = '';
        } else {
          str += String.fromCharCode(curr);
        }
      }
      ret += len;
    }
    this.logInfo = null;
    return ret;
  }
}

class KotlinWasmDriver implements WasmDriver {
  configureEnvironment(module: WebAssembly.Module, container: WasmContainer, env: {}) {
    Object.assign(env, {
      // These two are used by launcher.cpp
      Konan_js_arg_size: (index) => 1,
      Konan_js_fetch_arg: (index, ptr) => 'dummyArg',

      // These two are imported, but never used
      Konan_js_allocateArena: (array) => {},
      Konan_js_freeArena: (arenaIndex) => {},

      // These two are used by logging functions
      write: (ptr) => console.log(container.read(ptr)),
      flush: () => {},

      // Apparently used by Kotlin Memory management
      Konan_notify_memory_grow: () => this.updateMemoryViews(container),

      // Kotlin's own glue for abort and exit
      Konan_abort: (pointer) => { throw new Error('Konan_abort(' + container.read(pointer) + ')'); },
      Konan_exit: (status) => {},

      // Needed by some code that tries to get the current time in it's runtime
      Konan_date_now: (pointer) => {
        const now = Date.now();
        const high = Math.floor(now / 0xffffffff);
        const low = Math.floor(now % 0xffffffff);
        container.heap32[pointer] = low;
        container.heap32[pointer + 1] = high;
      },
    });
  }

  // Kotlin manages its own heap construction, as well as tables.
  initializeInstance(container: WasmContainer, instance: WebAssembly.Instance) {
    this.updateMemoryViews(container);
    // Kotlin main() must be invoked before everything else.
    instance.exports.Konan_js_main(1, 0);
  }

  updateMemoryViews(container: WasmContainer) {
    container.memory = container.exports.memory;
    container.heapU8 = new Uint8Array(container.memory.buffer);
    container.heap32 = new Int32Array(container.memory.buffer);
  }
}

type WasmAddress = number;

// Holds an instance of a running wasm module, which may contain multiple particles.
export class WasmContainer {
  loader: Loader;
  apiPort: PECInnerPort;
  memory: WebAssembly.Memory;
  heapU8: Uint8Array;
  heap32: Int32Array;
  wasm: WebAssembly.Instance;
  // tslint:disable-next-line: no-any
  exports: any;
  particleMap = new Map<WasmAddress, WasmParticle>();

  constructor(loader: Loader, apiPort: PECInnerPort) {
    this.loader = loader;
    this.apiPort = apiPort;
  }

  async initialize(buffer: ArrayBuffer) {
    // TODO: vet the imports/exports on 'module'
    // TODO: use compileStreaming? requires passing the fetch() Response, not its ArrayBuffer
    const module = await WebAssembly.compile(buffer);
    const driver = this.driverForModule(module);

    // Shared ENV between Emscripten and Kotlin
    const env = {
      abort: () => { throw new Error('Abort!'); },

      // Inner particle API
      // TODO: guard against null/empty args from the wasm side
      _singletonSet: (p, handle, entity) => this.getParticle(p).singletonSet(handle, entity),
      _singletonClear: (p, handle) => this.getParticle(p).singletonClear(handle),
      _collectionStore: (p, handle, entity) => this.getParticle(p).collectionStore(handle, entity),
      _collectionRemove: (p, handle, entity) => this.getParticle(p).collectionRemove(handle, entity),
      _collectionClear: (p, handle) => this.getParticle(p).collectionClear(handle),
      _onRenderOutput: (p, template, model) => this.getParticle(p).onRenderOutput(template, model),
      _dereference: (p, handle, refId, continuationId) => this.getParticle(p).dereference(handle, refId, continuationId),
      _render: (p, slotName, template, model) => this.getParticle(p).renderImpl(slotName, template, model),
      _serviceRequest: (p, call, args, tag) => this.getParticle(p).serviceRequest(call, args, tag),
      _resolveUrl: (url) => this.resolve(url),
    };

    driver.configureEnvironment(module, this, env);

    const global = {'NaN': NaN, 'Infinity': Infinity};

    this.wasm = await WebAssembly.instantiate(module, {env, global});
    this.exports = this.wasm.exports;
    driver.initializeInstance(this, this.wasm);
  }

  private driverForModule(module: WebAssembly.Module): WasmDriver {
    const customSections = WebAssembly.Module.customSections(module, 'emscripten_metadata');
    if (customSections.length === 1) {
      return new EmscriptenWasmDriver(customSections[0]);
    }
    return new KotlinWasmDriver();
  }

  private getParticle(innerParticle: WasmAddress): WasmParticle {
    return this.particleMap.get(innerParticle);
  }

  register(particle: WasmParticle, innerParticle: WasmAddress) {
    this.particleMap.set(innerParticle, particle);
  }

  // Allocates memory in the wasm container; the calling particle is responsible for freeing.
  resolve(urlPtr: WasmAddress): WasmAddress {
    return this.store(this.loader.resolve(this.read(urlPtr)));
  }

  // Allocates memory in the wasm container.
  store(str: string): WasmAddress {
    const p = this.exports._malloc(str.length + 1);
    for (let i = 0; i < str.length; i++) {
      this.heapU8[p + i] = str.charCodeAt(i);
    }
    this.heapU8[p + str.length] = 0;
    return p;
  }

  // Convenience function for freeing one or more wasm memory allocations. Null pointers are ignored.
  free(...ptrs: WasmAddress[]) {
    ptrs.forEach(p => p && this.exports._free(p));
  }

  // Currently only supports ASCII. TODO: unicode
  read(idx: WasmAddress): string {
    let str = '';
    while (idx < this.heapU8.length && this.heapU8[idx] !== 0) {
      str += String.fromCharCode(this.heapU8[idx++]);
    }
    return str;
  }
}

// Creates and interfaces to a particle inside a WasmContainer's module.
export class WasmParticle extends Particle {
  private id: string;
  private container: WasmContainer;
  // tslint:disable-next-line: no-any
  private exports: any;
  private innerParticle: WasmAddress;
  private handleMap = new Map<Handle, WasmAddress>();
  private revHandleMap = new Map<WasmAddress, Handle>();
  private converters = new Map<Handle, EntityPackager>();

  constructor(id: string, container: WasmContainer) {
    super();
    this.id = id;
    this.container = container;
    this.exports = container.exports;

    const fn = `_new${this.spec.name}`;
    if (!(fn in this.exports)) {
      throw new Error(`wasm module does not export instantiator function '${fn}' for particle '${this.spec.name}'`);
    }
    this.innerParticle = this.exports[fn]();
    this.container.register(this, this.innerParticle);
    // TODO(sjmiles): probably too soon: we need to render at least once, but we may have handle
    // work pending. @shans says: if the particle has readable handles, onHandleUpdate is guaranteed
    // to be called, otherwise we need `renderOutput` manually. Need to optimize this across all
    // particle bases.
    setTimeout(() => this.renderOutput(), 100);
  }

  renderOutput() {
    // TODO(sjmiles): not yet implemented in CPP
    if (this.exports['_renderOutput']) {
      this.exports._renderOutput(this.innerParticle);
    }
  }

  // TODO: for now we set up Handle objects with onDefineHandle and map them into the
  // wasm container through this call, which creates corresponding Handle objects in there.
  // That means entity transfer goes from the StorageProxy, deserializes at the outer Handle
  // which then notifies this class (calling onHandle*), and we then serialize into the wasm
  // transfer format. Obviously this can be improved.
  async setHandles(handles: ReadonlyMap<string, Handle>) {
    for (const [name, handle] of handles) {
      const p = this.container.store(name);
      const wasmHandle = this.exports._connectHandle(this.innerParticle, p, handle.canRead, handle.canWrite);
      this.container.free(p);
      if (wasmHandle === 0) {
        throw new Error(`Wasm particle failed to connect handle '${name}'`);
      }
      this.handleMap.set(handle, wasmHandle);
      this.revHandleMap.set(wasmHandle, handle);
      this.converters.set(handle, new EntityPackager(handle));
    }
    this.exports._init(this.innerParticle);
  }

  async onHandleSync(handle: Handle, model) {
    const wasmHandle = this.handleMap.get(handle);
    if (!model) {
      this.exports._syncHandle(this.innerParticle, wasmHandle, 0);
      return;
    }
    const converter = this.converters.get(handle);
    if (!converter) {
      throw new Error('cannot find handle ' + handle.name);
    }
    let encoded;
    if (handle instanceof Singleton) {
      encoded = converter.encodeSingleton(model);
    } else {
      encoded = converter.encodeCollection(model);
    }
    const p = this.container.store(encoded);
    this.exports._syncHandle(this.innerParticle, wasmHandle, p);
    this.container.free(p);
  }

  // tslint:disable-next-line: no-any
  async onHandleUpdate(handle: Handle, update: {data?: any, oldData?: any, added?: any, removed?: any, originator?: any}) {
    if (update.originator) {
      return;
    }
    const wasmHandle = this.handleMap.get(handle);
    const converter = this.converters.get(handle);
    if (!converter) {
      throw new Error('cannot find handle ' + handle.name);
    }

    let p1 = 0;
    let p2 = 0;
    if (handle instanceof Singleton) {
      if (update.data) {
        p1 = this.container.store(converter.encodeSingleton(update.data));
      }
    } else {
      p1 = this.container.store(converter.encodeCollection(update.added || []));
      p2 = this.container.store(converter.encodeCollection(update.removed || []));
    }
    this.exports._updateHandle(this.innerParticle, wasmHandle, p1, p2);
    this.container.free(p1, p2);
  }

  // Ignored for wasm particles.
  async onHandleDesync(handle: Handle) {}

  // Store API.
  //
  // Each of these calls an async storage method, but we don't want to await them because returning
  // a Promise to wasm doesn't work, and control (surprisingly) returns to the calling wasm function
  // at the first await point anyway. However, our CRDTs make it safe to fire-and-forget the storage
  // updates, and the wasm handles already have the updated version of the stored data, so it's safe
  // to leave the promises floating.

  // If the given entity doesn't have an id, this will create one for it and return the new id
  // in allocated memory that the wasm particle must free. If the entity already has an id this
  // returns 0 (nulltpr).
  singletonSet(wasmHandle: WasmAddress, entityPtr: WasmAddress): WasmAddress {
    const singleton = this.getHandle(wasmHandle) as Singleton;
    const entity = this.decodeEntity(singleton, entityPtr);
    const p = this.ensureIdentified(entity, singleton);
    void singleton.set(entity);
    return p;
  }

  singletonClear(wasmHandle: WasmAddress) {
    const singleton = this.getHandle(wasmHandle) as Singleton;
    void singleton.clear();
  }

  // If the given entity doesn't have an id, this will create one for it and return the new id
  // in allocated memory that the wasm particle must free. If the entity already has an id this
  // returns 0 (nulltpr).
  collectionStore(wasmHandle: WasmAddress, entityPtr: WasmAddress): WasmAddress {
    const collection = this.getHandle(wasmHandle) as Collection;
    const entity = this.decodeEntity(collection, entityPtr);
    const p = this.ensureIdentified(entity, collection);
    void collection.store(entity);
    return p;
  }

  collectionRemove(wasmHandle: WasmAddress, entityPtr: WasmAddress) {
    const collection = this.getHandle(wasmHandle) as Collection;
    void collection.remove(this.decodeEntity(collection, entityPtr));
  }

  collectionClear(wasmHandle: WasmAddress) {
    const collection = this.getHandle(wasmHandle) as Collection;
    void collection.clear();
  }

  // Called by particles to retrieve the entity held by a reference-typed handle.
  async dereference(wasmHandle: WasmAddress, refIdPtr: WasmAddress, continuationId: number) {
    const handle = this.getHandle(wasmHandle);
    const converter = this.converters.get(handle);
    if (!converter) {
      throw new Error('cannot find handle ' + handle.name);
    }
    const refId = this.container.read(refIdPtr);

    let ref: Reference;
    if (handle instanceof Singleton) {
      ref = await handle.get() as Reference;
    } else if (handle instanceof Collection) {
      ref = await handle.get(refId);
    } else {
      throw new Error(`wasm particle '${this.spec.name}' dereferenced an unsupported handle type ${handle._id}`);
    }
    let p = 0;
    if (ref) {
      const entity = await ref.dereference();
      p = this.container.store(converter.encodeSingleton(entity));
    }
    this.exports._dereferenceResponse(this.innerParticle, continuationId, p);
    this.container.free(p);
  }

  private getHandle(wasmHandle: WasmAddress) {
    const handle = this.revHandleMap.get(wasmHandle);
    if (!handle) {
      const err = new Error(`wasm particle '${this.spec.name}' attempted to write to unconnected handle`);
      const userException = new UserException(err, 'WasmParticle::getHandle', this.id, this.spec.name);
      this.container.apiPort.ReportExceptionInHost(userException);
      throw err;
    }
    return handle;
  }

  private decodeEntity(handle: Handle, entityPtr: WasmAddress): Storable {
    const converter = this.converters.get(handle);
    return converter.decodeSingleton(this.container.read(entityPtr));
  }

  private ensureIdentified(entity: Storable, handle: Handle): WasmAddress {
    let p = 0;
    // TODO: rework Reference/Entity internals to avoid this instance check?
    if (entity instanceof Entity && !Entity.isIdentified(entity)) {
      handle.createIdentityFor(entity);
      p = this.container.store(Entity.id(entity));
    }
    return p;
  }

  // TODO(sjmiles): UiBroker changes ... we don't have `capabilities` yet,
  // so just go straight to output
  output(content) {
    this.container.apiPort.Output(this, content);
  }

  // render request call-back from wasm
  onRenderOutput(templatePtr: WasmAddress, modelPtr: WasmAddress) {
    const content: Content = {templateName: 'default'};
    content.template = this.container.read(templatePtr);
    content.model = new StringDecoder().decodeDictionary(this.container.read(modelPtr));
    this.output(content);
  }

  /**
   * @deprecated for contexts using UiBroker (e.g Kotlin)
   */
  // Called by the shell to initiate rendering; the particle will call env._render in response.
  renderSlot(slotName: string, contentTypes: string[]) {
    const p = this.container.store(slotName);
    const sendTemplate = contentTypes.includes('template');
    const sendModel = contentTypes.includes('model');
    this.exports._renderSlot(this.innerParticle, p, sendTemplate, sendModel);
    this.container.free(p);
  }

  /**
   * @deprecated for contexts using UiBroker (e.g Kotlin)
   */
  // TODO
  renderHostedSlot(slotName: string, hostedSlotId: string, content: Content) {
    throw new Error('renderHostedSlot not implemented for wasm particles');
  }

  /**
   * @deprecated for contexts using UiBroker (e.g Kotlin)
   */
  // Actually renders the slot. May be invoked due to an external request via renderSlot(),
  // or directly from the wasm particle itself (e.g. in response to a data update).
  // template is a string provided by the particle. model is an encoded Dictionary.
  renderImpl(slotNamePtr: WasmAddress, templatePtr: WasmAddress, modelPtr: WasmAddress) {
    const slot = this.slotProxiesByName.get(this.container.read(slotNamePtr));
    if (slot) {
      const content: Content = {templateName: 'default'};
      if (templatePtr) {
        content.template = this.container.read(templatePtr);
        slot.requestedContentTypes.add('template');
      }
      if (modelPtr) {
        content.model = new StringDecoder().decodeDictionary(this.container.read(modelPtr));
        slot.requestedContentTypes.add('model');
      }
      slot.render(content);
    }
  }

  // Wasm particles can request service calls with a Dictionary of arguments and an optional string
  // tag to disambiguate different requests to the same service call.
  async serviceRequest(callPtr: WasmAddress, argsPtr: WasmAddress, tagPtr: WasmAddress) {
    const call = this.container.read(callPtr);
    const args = new StringDecoder().decodeDictionary(this.container.read(argsPtr));
    const tag = this.container.read(tagPtr);
    // tslint:disable-next-line: no-any
    const response: any = await this.service({call, ...args});

    // Convert the arbitrary response object to key:value string pairs.
    const dict: Dictionary<string> = {};
    if (typeof response === 'object') {
      for (const entry of Object.entries(response)) {
        // tslint:disable-next-line: no-any
        const [key, value]: [string, any] = entry;
        dict[key] = (typeof value === 'object') ? JSON.stringify(value) : (value + '');
      }
    } else {
      // Convert a plain value response to {value: 'string'}
      dict['value'] = response + '';
    }

    // We can't re-use the string pointers passed in as args to this method, because the await
    // point above means the call to internal::serviceRequest inside the wasm module will already
    // have completed, and the memory for those args will have been freed.
    const cp = this.container.store(call);
    const rp = this.container.store(StringEncoder.encodeDictionary(dict));
    const tp = this.container.store(tag);
    this.exports._serviceResponse(this.innerParticle, cp, rp, tp);
    this.container.free(cp, rp, tp);
  }

  fireEvent(slotName: string, event) {
    const sp = this.container.store(slotName);
    const hp = this.container.store(event.handler);
    this.exports._fireEvent(this.innerParticle, sp, hp);
    this.container.free(sp, hp);
  }
}
