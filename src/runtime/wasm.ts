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
import {EntityInterface, EntityRawData} from './entity.js';
import {Particle} from './particle.js';
import {Handle, Singleton, Collection} from './handle.js';

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
// Examples:
//   Singleton:   4:id05|txt:T3:abc|lnk:U10:http://def|num:N37:|flg:B1|
//   Collection:  3:29:4:id12|txt:T4:qwer|num:N9.2:|18:6:id2670|num:N-7:|15:5:id501|flg:B0|
export class EntityPackager {
  readonly schema: Schema;
  private encoder = new StringEncoder();
  private decoder = new StringDecoder();

  constructor(schema: Schema) {
    assert(schema.names.length > 0, 'At least one schema name is required for entity packaging');
    this.schema = schema;
  }

  encodeSingleton(entity: EntityInterface): string {
    return this.encoder.encodeSingleton(this.schema, entity);
  }

  encodeCollection(entities: EntityInterface[]): string {
    return this.encoder.encodeCollection(this.schema, entities);
  }

  decodeSingleton(str: string): EntityInterface {
    const {id, data} = this.decoder.decodeSingleton(str);
    const entity = new (this.schema.entityClass())(data);
    entity.identify(id);
    return entity;
  }
}

class StringEncoder {
  encodeSingleton(schema: Schema, entity: EntityInterface): string {
    let encoded = entity.id.length + ':' + entity.id + '|';
    for (const [name, value] of Object.entries(entity.toLiteral())) {
      encoded += this.encodeField(schema.fields[name], name, value);
    }
    return encoded;
  }

  encodeCollection(schema: Schema, entities: EntityInterface[]): string {
    let encoded = entities.length + ':';
    for (const entity of entities) {
      const str = this.encodeSingleton(schema, entity);
      encoded += str.length + ':' + str;
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
        return (value as string).length + ':' + value;

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

  decodeSingleton(str: string): {id: string; data: EntityRawData} {
    this.str = str;
    const len = Number(this.upTo(':'));
    const id = this.chomp(len);
    this.validate('|');

    const data = {};
    while (this.str.length > 0) {
      const name = this.upTo(':');
      const typeChar = this.chomp(1);
      data[name] = this.decodeValue(typeChar);
      this.validate('|');
    }
    return {id, data};
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


// Wasm modules built by emscripten require some external memory configuration by the caller,
// which is usually built into the glue code generated alongside the module. We're not using
// the glue code, but if we set the EMIT_EMSCRIPTEN_METADATA flag when building, emscripten
// will provide a custom section in the module itself with the required values.
const EMSCRIPTEN_METADATA_MAJOR = 0;
const EMSCRIPTEN_METADATA_MINOR = 1;
const EMSCRIPTEN_ABI_MAJOR = 0;
const EMSCRIPTEN_ABI_MINOR = 3;

// TODO: reconcile with Kotlin-based particles
function readEmscriptenMetadata(module: WebAssembly.Module) {
  const customSections = WebAssembly.Module.customSections(module, 'emscripten_metadata');
  assert(customSections.length === 1, 'wasm particles must be built with EMIT_EMSCRIPTEN_METADATA');

  const buffer = new Uint8Array(customSections[0]);
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
  // correspond to emscripten version 1.38.34:
  //   https://github.com/emscripten-core/emscripten/blob/1.38.34/tools/shared.py#L3065

  // TODO: use real errors (and handle them gracefully upstream)
  assert(metadata.length === 10);
  assert(metadata[0] === EMSCRIPTEN_METADATA_MAJOR);
  assert(metadata[1] === EMSCRIPTEN_METADATA_MINOR);
  assert(metadata[2] === EMSCRIPTEN_ABI_MAJOR);
  assert(metadata[3] === EMSCRIPTEN_ABI_MINOR);
  return {
    memSize: metadata[4],
    tableSize: metadata[5],
    globalBase: metadata[6],
    dynamicBase: metadata[7],
    dynamictopPtr: metadata[8],
    tempdoublePtr: metadata[9],  // unused; appears to be related to pthreads
  };
}


type WasmAddress = number;

export class WasmParticle extends Particle {
  private memory: WebAssembly.Memory;
  private heapU8: Uint8Array;
  private heap32: Int32Array;
  private wasm: WebAssembly.Instance;
  // tslint:disable-next-line: no-any
  private exports: any;

  private innerParticle: WasmAddress;
  private handleMap = new Map<Handle, WasmAddress>();
  private revHandleMap = new Map<WasmAddress, Handle>();
  private converters = new Map<Handle, EntityPackager>();
  private logInfo: [string, number]|null = null;

  // TODO: errors in this call (e.g. missing import or failure in particle ctor) generate two console outputs
  async initialize(buffer: ArrayBuffer) {
    assert(this.spec.name.length > 0);

    // TODO: vet the imports/exports on 'module'
    const module = await WebAssembly.compile(buffer);
    const emc = readEmscriptenMetadata(module);

    this.memory = new WebAssembly.Memory({initial: emc.memSize, maximum: emc.memSize});
    this.heapU8 = new Uint8Array(this.memory.buffer);
    this.heap32 = new Int32Array(this.memory.buffer);

    // We need to poke the address of the heap base into the memory buffer prior to instantiating.
    this.heap32[emc.dynamictopPtr >> 2] = emc.dynamicBase;

    const env = {
      // Memory setup
      memory: this.memory,
      __memory_base: emc.globalBase,
      table: new WebAssembly.Table({initial: emc.tableSize, maximum: emc.tableSize, element: 'anyfunc'}),
      __table_base: 0,
      DYNAMICTOP_PTR: emc.dynamictopPtr,

      // Heap management
      _emscripten_get_heap_size: () => this.heapU8.length,  // Matches emscripten glue js
      _emscripten_resize_heap: size => false,  // TODO
      _emscripten_memcpy_big: (dst, src, num) => this.heapU8.set(this.heapU8.subarray(src, src + num), dst),

      // Error handling
      _systemError: msg => { throw new Error(this.read(msg)); },

      // TODO: can't seem to embed these in the C++ code
      abort: () => { throw new Error('abort'); },
      abortOnCannotGrowMemory: size  => { throw new Error(`abortOnCannotGrowMemory(${size})`); },

      // Logging
      _setLogInfo: (file, line) => this.logInfo = [this.read(file), line],
      ___syscall146: (which, varargs) => this.sysWritev(which, varargs),

      // Inner particle API
      _singletonSet: async (handle, encoded) => this.singletonSet(handle, encoded),
      _singletonClear: async (handle) => this.singletonClear(handle),
      _collectionStore: async (handle, encoded) => this.collectionStore(handle, encoded),
      _collectionRemove: async (handle, encoded) => this.collectionRemove(handle, encoded),
      _collectionClear: async (handle) => this.collectionClear(handle),
      _render: (slotName, content) => this.renderImpl(slotName, content),
    };
    const global = {'NaN': NaN, 'Infinity': Infinity};

    this.wasm = await WebAssembly.instantiate(module, {env, global});
    this.exports = this.wasm.exports;
    this.innerParticle = this.exports[`_new${this.spec.name}`]();
  }

  // TODO: for now we set up Handle objects with onDefineHandle and map them into the
  // wasm container through this call, which creates corresponding Handle objects in there.
  // That means entity transfer goes from the StorageProxy, deserializes at the outer Handle
  // which then notifies this class (calling onHandle*), and we then serialize into the wasm
  // transfer format. Obviously this can be improved.
  async setHandles(handles: ReadonlyMap<string, Handle>) {
    for (const [name, handle] of handles) {
      const p = this.store(name);
      const wasmHandle = this.exports._connectHandle(this.innerParticle, p, handle.canRead);
      this.exports._free(p);
      if (wasmHandle === 0) {
        throw new Error(`Wasm particle failed to connect handle '${name}'`);
      }
      this.handleMap.set(handle, wasmHandle);
      this.revHandleMap.set(wasmHandle, handle);
      this.converters.set(handle, new EntityPackager(handle.entityClass.schema));
    }
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
    const p = this.store(encoded);
    this.exports._syncHandle(this.innerParticle, wasmHandle, p);
    this.exports._free(p);
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
        p1 = this.store(converter.encodeSingleton(update.data));
      }
    } else {
      p1 = this.store(converter.encodeCollection(update.added || []));
      p2 = this.store(converter.encodeCollection(update.removed || []));
    }
    this.exports._updateHandle(this.innerParticle, wasmHandle, p1, p2);
    if (p1) this.exports._free(p1);
    if (p2) this.exports._free(p2);
  }

  // Ignored for wasm particles.
  async onHandleDesync(handle: Handle) {}

  // Store API.
  async singletonSet(wasmHandle: WasmAddress, encoded: WasmAddress) {
    const singleton = this.revHandleMap.get(wasmHandle) as Singleton;
    await singleton.set(this.decodeEntity(singleton, encoded));
  }

  async singletonClear(wasmHandle: WasmAddress) {
    const singleton = this.revHandleMap.get(wasmHandle) as Singleton;
    await singleton.clear();
  }

  async collectionStore(wasmHandle: WasmAddress, encoded: WasmAddress) {
    const collection = this.revHandleMap.get(wasmHandle) as Collection;
    await collection.store(this.decodeEntity(collection, encoded));
  }

  async collectionRemove(wasmHandle: WasmAddress, encoded: WasmAddress) {
    const collection = this.revHandleMap.get(wasmHandle) as Collection;
    await collection.remove(this.decodeEntity(collection, encoded));
  }

  async collectionClear(wasmHandle: WasmAddress) {
    const collection = this.revHandleMap.get(wasmHandle) as Collection;
    await collection.clear();
  }

  private decodeEntity(handle: Handle, encoded: WasmAddress): EntityInterface {
    const converter = this.converters.get(handle);
    return converter.decodeSingleton(this.read(encoded));
  }

  // Called by the shell to initiate rendering; the particle will call env._render in response.
  // TODO: handle contentTypes
  renderSlot(slotName: string, contentTypes: string[]) {
    const p = this.store(slotName);
    this.exports._requestRender(this.innerParticle, p);
    this.exports._free(p);
  }

  // TODO
  renderHostedSlot(slotName: string, hostedSlotId: string, content: string) {}

  // Actually renders the slot. May be invoked due to an external request via renderSlot(),
  // or directly from the wasm particle itself (e.g. in response to a data update).
  renderImpl(slotName: WasmAddress, content: WasmAddress) {
    const slot = this.slotProxiesByName.get(this.read(slotName));
    if (slot) {
      ['template', 'model'].forEach(ct => slot.requestedContentTypes.add(ct));
      slot.render({template: this.read(content), model: {}, templateName: 'default'});
    }
  }

  fireEvent(slotName: string, event) {
    const sp = this.store(slotName);
    const hp = this.store(event.handler);
    this.exports._fireEvent(this.innerParticle, sp, hp);
    this.exports._free(sp);
    this.exports._free(hp);
  }

  // Allocates memory in the wasm container.
  private store(str: string): WasmAddress {
    const p = this.exports._malloc(str.length + 1);
    for (let i = 0; i < str.length; i++) {
      this.heapU8[p + i] = str.charCodeAt(i);
    }
    this.heapU8[p + str.length] = 0;
    return p;
  }

  // Currently only supports ASCII. TODO: unicode
  private read(idx: WasmAddress): string {
    let str = '';
    while (idx < this.heapU8.length && this.heapU8[idx] !== 0) {
      str += String.fromCharCode(this.heapU8[idx++]);
    }
    return str;
  }

  // printf support cribbed from emscripten glue js - currently only supports ASCII
  private sysWritev(which, varargs) {
    const get = () => {
      varargs += 4;
      return this.heap32[(((varargs)-(4))>>2)];
    };

    const output = (get() === 1) ? console.log : console.error;
    const iov = get();
    const iovcnt = get();

    // TODO: does this need to be persistent across calls? (i.e. due to write buffering)
    let str = this.logInfo ? `[${this.spec.name}|${this.logInfo[0]}:${this.logInfo[1]}] ` : '';
    let ret = 0;
    for (let i = 0; i < iovcnt; i++) {
      const ptr = this.heap32[(((iov)+(i*8))>>2)];
      const len = this.heap32[(((iov)+(i*8 + 4))>>2)];
      for (let j = 0; j < len; j++) {
        const curr = this.heapU8[ptr+j];
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
