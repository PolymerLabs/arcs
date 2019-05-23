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
import {protobufjs} from '../platform/protobufjs-web.js';
import {Schema} from './schema.js';
import {EntityInterface} from './entity.js';
import {Particle} from './particle.js';
import {Handle, Variable} from './handle.js';

function jsonBaseType(type) {
  const kind = (type.kind === 'schema-primitive') ? type.type : type.kind;
  switch (kind) {
    case 'Text':
      return 'string';

    case 'URL':
      return 'Url';

    case 'Number':
      return 'double';

    case 'Boolean':
      return 'bool';

    case 'Bytes':
    case 'Object':
    case 'schema-union':
    case 'schema-tuple':
    case 'schema-reference':
      throw new Error(`'${kind}' not yet supported for schema to proto-json conversion`);

    case 'schema-collection':
      throw new Error(`Nested collections not yet supported for schema to proto-json conversion`);

    default:
      throw new Error(`Unknown type '${kind}' in schema`);
  }
}

// Returns a JSON representation that protobufjs can use to de/serialize entity data as protobufs.
export function toProtoJSON(schema: Schema) {
  let id = 0;
  let hasUrl = false;
  const fields = {};
  for (const [name, type] of Object.entries(schema.fields).sort()) {
    id++;
    let field;
    if (type.kind === 'schema-collection') {
      field = {rule: 'repeated', type: jsonBaseType(type.schema), id};
    } else {
      field = {type: jsonBaseType(type), id};
    }
    hasUrl = hasUrl || (field.type === 'Url');
    fields[name] = field;
  }
  const json = {
    nested: {
      [schema.name]: {fields}
    }
  };
  if (hasUrl) {
    json.nested.Url = {fields: {href: {type: 'string', id: 1}}};
  }
  return json;
}

export class EntityProtoConverter {
  readonly schema: Schema;
  readonly message: protobufjs.Type;

  constructor(schema: Schema) {
    assert(schema.names.length > 0, 'At least one schema name is required for proto conversion');

    const protoRoot = protobufjs.Root.fromJSON(toProtoJSON(schema));
    this.schema = schema;
    this.message = protoRoot.lookupType(schema.name);
  }

  encode(entity: EntityInterface): Uint8Array {
    const proto = this.message.create();
    const scalar = (field, value) => (field.type === 'URL') ? {href: value} : value;
    for (const [name, value] of Object.entries(entity.toLiteral())) {
      const field = this.schema.fields[name];
      if (field.kind === 'schema-collection') {
        // tslint:disable-next-line: no-any
        proto[name] = [...(value as Set<any>)].map(v => scalar(field.schema, v));
      } else {
        proto[name] = scalar(field, value);
      }
    }
    return this.message.encode(proto).finish();
  }

  decode(buffer: Uint8Array): EntityInterface {
    const proto = this.message.decode(buffer);
    const scalar = (field, value) => (field.type === 'URL') ? value.href : value;
    const data = {};
    for (const [name, value] of Object.entries(proto.toJSON()) as [string, []][]) {
      const field = this.schema.fields[name];
      if (field.kind === 'schema-collection') {
        data[name] = value.map(v => scalar(field.schema, v));
      } else {
        data[name] = scalar(field, value);
      }
    }
    return new (this.schema.entityClass())(data);
  }
}


// Encodes/decodes the wire format for transferring entities over the wasm boundary.
//
//  <encoded> = <name>:<value>|<name>:<value>| ... |
//
//  <value> depends on the field type:
//    Text       <name>:T<length>:<text>
//    URL        <name>:U<length>:<text>
//    Number     <name>:N<number>
//    Boolean    <name>:B<zero-or-one>
//
//    [Text]     <name>:CT<num-items>:<length>:<text><length>:<text> ... <length>:<text>
//    [URL]      <name>:CU<num-items>:<length>:<text><length>:<text> ... <length>:<text>
//    [Number]   <name>:CN<num-items>:<number>:<number>: ... <number>:
//    [Boolean]  <name>:CB<num-items>:<digits>
//
export class EntityPackager {
  readonly schema: Schema;

  constructor(schema: Schema) {
    assert(schema.names.length > 0, 'At least one schema name is required for entity packaging');
    this.schema = schema;
  }

  encode(entity: EntityInterface): string {
    let encoded = '';
    for (const [name, value] of Object.entries(entity.toLiteral())) {
      encoded += this.encodeField(this.schema.fields[name], name, value);
    }
    return encoded;
  }

  private encodeField(field, name, value) {
    switch (field.kind) {
      case 'schema-primitive':
        return name + ':' + field.type.substr(0, 1) + this.encodeValue(field.type, value) + '|';

      case 'schema-collection': {
        if (field.schema.kind !== 'schema-primitive') {
          throw new Error(`Collections of type '${field.schema.kind}' not yet supported for entity packaging`);
        }
        assert(value instanceof Set);
        let encoded = name + ':C' + field.schema.type.slice(0, 1) + value.size + ':';
        for (const item of value) {
          encoded += this.encodeValue(field.schema.type, item);
        }
        return encoded + '|';
      }

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

  decode(str: string): EntityInterface {
    const data = new StringDecoder(str).decode();
    return new (this.schema.entityClass())(data);
  }
}

class StringDecoder {
  str: string;

  constructor(str: string) {
    this.str = str;
  }

  decode() {
    const data = {};
    while (!this.done()) {
      const name = this.upTo(':');
      const typeChar = this.chomp(1);
      if (typeChar === 'C') {
        const items = new Set();
        const containedType = this.chomp(1);
        const size = Number(this.upTo(':'));
        for (let i = 0; i < size; i++) {
          items.add(this.decodeValue(containedType));
        }
        data[name] = items;
      } else {
        data[name] = this.decodeValue(typeChar);
      }
      this.validate('|');
    }
    return data;
  }

  done() {
    return this.str.length === 0;
  }

  upTo(char) {
    const i = this.str.indexOf(char);
    if (i < 0) {
      throw new Error(`Packaged entity decoding fail: expected '${char}' separator in '${this.str}'`);
    }
    const token = this.str.slice(0, i);
    this.str = this.str.slice(i + 1);
    return token;
  }

  chomp(len) {
    if (len > this.str.length) {
      throw new Error(`Packaged entity decoding fail: expected '${len}' chars to remain in '${this.str}'`);
    }
    const token = this.str.slice(0, len);
    this.str = this.str.slice(len);
    return token;
  }

  validate(token) {
    if (this.chomp(token.length) !== token) {
      throw new Error(`Packaged entity decoding fail: expected '${token}' at start of '${this.str}'`);
    }
  }

  decodeValue(typeChar) {
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


// TODO
async function setVariable(handle, num) {
  const entity = new handle.entityClass({num});
  await handle.set(entity);
}

function errFunc(label: string) {
  return err => { throw new Error(label + ': ' + err); };
}

function returnZero() {
  return 0;
}

type WasmAddress = number;

export class WasmParticle extends Particle {
  private memory: WebAssembly.Memory;
  private heap: Uint8Array;
  private wasm: WebAssembly.ResultObject;
  // tslint:disable-next-line: no-any
  private exports: any;

  private innerParticle: WasmAddress;
  private handleMap = new Map<Handle, WasmAddress>();
  private revHandleMap = new Map<WasmAddress, Handle>();
  private converters = new Map<Schema, EntityPackager>();
  private logInfo: [string, number] = null;

  async initialize(buffer: ArrayBuffer) {
    assert(this.spec.name.length > 0);

    // TODO: detect errors when this memory size doesn't match up with the wasm's declared values?
    this.memory = new WebAssembly.Memory({initial: 256, maximum: 256});
    this.heap = new Uint8Array(this.memory.buffer);

    const env = {
      // Memory setup
      memory: this.memory,
      __memory_base: 1024,  // TODO
      table: new WebAssembly.Table({initial: 1, maximum: 1, element: 'anyfunc'}),
      __table_base: 0,
      DYNAMICTOP_PTR: 4096,  // TODO

      // Heap management
      _emscripten_get_heap_size: () => this.heap.length,  // Matches emscripten glue js
      _emscripten_resize_heap: size => false,  // TODO
      _emscripten_memcpy_big: (dst, src, num) => this.heap.set(this.heap.subarray(src, src + num), dst),

      // Error handling
      abort: errFunc('abort'),
      _abort: errFunc('_abort'),
      ___assert_fail: errFunc('___assert_fail'),
      ___setErrNo: errFunc('___setErrNo'),
      abortOnCannotGrowMemory: errFunc('abortOnCannotGrowMemory'),
      ___cxa_throw: errFunc('___cxa_throw'),
      ___cxa_allocate_exception: errFunc('___cxa_allocate_exception'),
      ___cxa_uncaught_exception: errFunc('___cxa_uncaught_exception'),

      // API for inner particle operations
      _handleSet: async (wasmHandle, num) => setVariable(this.revHandleMap.get(wasmHandle), num),
      _render: (slotName, content) => this.renderImpl(slotName, content),

      // Logging
      __setLogInfo: (file, line) => this.logInfo = [this.readString(file), line],
      ___syscall146: (which, varargs) => this.sysWritev(which, varargs),
      ___syscall140: returnZero,  // llseek
      ___syscall6: returnZero,    // close
      ___syscall54: returnZero,   // ioctl
    };
    const global = {'NaN': NaN, 'Infinity': Infinity};

    // The size of the function pointer table is specified by the wasm binary but there doesn't
    // seem to be a simple way to get it, so we'll just extract it from the error :-/
    try {
      this.wasm = await WebAssembly.instantiate(buffer, {env, global});
    } catch (err) {
      const match = err.message.match(/table import .* initial ([0-9]+)/);
      if (!match) {
        throw err;
      }
      const n = Number(match[1]);
      env.table = new WebAssembly.Table({initial: n, maximum: n, element: 'anyfunc'});
      this.wasm = await WebAssembly.instantiate(buffer, {env, global});
    }

    this.exports = this.wasm.instance.exports;
    this.innerParticle = this.exports[`_new${this.spec.name}`]();
    console.clear();  // TODO: remove
  }

  async setHandles(handles: ReadonlyMap<string, Handle>) {
    for (const [name, handle] of handles) {
      // TODO: currently only Variables are supported.
      assert(handle instanceof Variable);

      // Ownership of 'name' is passed to the inner particle.
      const p = this.storeString(name);
      const wasmHandle = this.exports._newHandle(this.innerParticle, p);
      this.handleMap.set(handle, wasmHandle);
      this.revHandleMap.set(wasmHandle, handle);
    }
    this.exports._initParticle(this.innerParticle);
  }

  async onHandleSync(handle: Handle, model) {
    if (!model) {
      // Send a nullptr to indicate an empty model.
      this.exports._syncHandle(this.innerParticle, this.handleMap.get(handle), 0);
      return;
    }

    let converter = this.converters.get(model.schema);
    if (!converter) {
      converter = new EntityPackager(model.schema);
      this.converters.set(model.schema, converter);
    }
    const p = this.storeString(converter.encode(model));
    this.exports._syncHandle(this.innerParticle, this.handleMap.get(handle), p);
    this.exports._free(p);
  }

  // TODO
  // tslint:disable-next-line: no-any
  async onHandleUpdate(handle: Handle, update: {data?: any, oldData?: any, added?: any, removed?: any, originator?: any}) {}

  // TODO
  async onHandleDesync(handle: Handle) {}

  // Called by the shell to initiate rendering; the particle will call env._render in response.
  // TODO: handle contentTypes
  renderSlot(slotName: string, contentTypes: string[]) {
    const p = this.storeString(slotName);
    this.exports._requestRender(this.innerParticle, p);
    this.exports._free(p);
  }

  // TODO
  renderHostedSlot(slotName: string, hostedSlotId: string, content: string) {}

  // Actually renders the slot. May be invoked due to an external request via renderSlot(),
  // or directly from the wasm particle itself (e.g. in response to a data update).
  renderImpl(slotName: WasmAddress, content: WasmAddress) {
    const slot = this.slotProxiesByName.get(this.readString(slotName));
    if (slot) {
      ['template', 'model'].forEach(ct => slot.requestedContentTypes.add(ct));
      slot.render({template: this.readString(content), model: {}, templateName: 'default'});
    }
  }

  fireEvent(slotName: string, event) {
    const sp = this.storeString(slotName);
    const hp = this.storeString(event.handler);
    this.exports._fireEvent(this.innerParticle, sp, hp);
    this.exports._free(sp);
    this.exports._free(hp);
  }

  // Allocates memory in the wasm container.
  private storeBuffer(buf: Uint8Array): WasmAddress {
    const p = this.exports._malloc(buf.length);
    this.heap.set(buf, p);
    return p;
  }

  // Allocates memory in the wasm container.
  private storeString(str: string): WasmAddress {
    const p = this.exports._malloc(str.length + 1);
    for (let i = 0; i < str.length; i++) {
      this.heap[p + i] = str.charCodeAt(i);
    }
    this.heap[p + str.length] = 0;
    return p;
  }

  // Currently only supports ASCII. TODO: support unicode
  private readString(idx: number): string {
    let str = '';
    while (idx < this.heap.length && this.heap[idx] !== 0) {
      str += String.fromCharCode(this.heap[idx++]);
    }
    return str;
  }

  // printf support cribbed from emscripten glue js - currently only supports ASCII
  private sysWritev(which, varargs) {
    const heap32 = new Int32Array(this.memory.buffer);
    const get = () => {
      varargs += 4;
      return heap32[(((varargs)-(4))>>2)];
    };

    const output = (get() === 1) ? console.log : console.error;
    const iov = get();
    const iovcnt = get();

    // TODO: does this need to be persistent across calls? (i.e. due to write buffering)
    let str = this.logInfo ? `[${this.spec.name}|${this.logInfo[0]}:${this.logInfo[1]}] ` : '';
    let ret = 0;
    for (let i = 0; i < iovcnt; i++) {
      const ptr = heap32[(((iov)+(i*8))>>2)];
      const len = heap32[(((iov)+(i*8 + 4))>>2)];
      for (let j = 0; j < len; j++) {
        const curr = this.heap[ptr+j];
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
