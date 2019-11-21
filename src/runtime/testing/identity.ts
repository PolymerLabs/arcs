/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Dictionary} from '../hot.js';
import {ProxyMessage, ProxyMessageType} from '../storageNG/store.js';
import {CRDTTypeRecord} from '../crdt/crdt.js';

const nameRegistry: Dictionary<number> = {};
const name = Symbol('Identified_name');
const originalConstructor = Symbol('Original_constructor');

const filter: Dictionary<string[]> = {};

// tslint:disable-next-line no-any
export function Identified<T extends {new (...args:any[]):{}}>(constructor:T) {
  if (!nameRegistry[constructor.name]) {
    nameRegistry[constructor.name] = 0;
  }

  return class extends constructor {
    [name] = `${constructor.name}${nameRegistry[constructor.name]++}`;
    [originalConstructor] = constructor.name;
  };
}

export function logWithIdentity(item, ...args) {
  const allowed = filter[item[originalConstructor]];
  if (allowed && !allowed.includes(item[name])) {
    return;
  }
  console.log(item[name], ...args);
}

export function setLogFilterById(name, id: number) {
  filter[name] = [`${name}${id}`];
}

export function operation<T extends CRDTTypeRecord>(op: T['operation']) {
  if (op['value'] && op['type'] === 0) {
    return `+{id: ${op['value']['id']} ${JSON.stringify(op['value']['rawData'])}} @${JSON.stringify(op[`clock`])} by ${op[`actor`]}`;
  }
  return JSON.stringify(op);
}

export function operations<T extends CRDTTypeRecord>(ops: T['operation'][]) {
  return ops.map(operation).join(', ');
}

export function proxyMessage<T extends CRDTTypeRecord>(message: ProxyMessage<T>) {
  const output = `${message.id} `;
  switch (message.type) {
    case ProxyMessageType.ModelUpdate:
      return output + `ModelUpdate: ${message.model}`;
    case ProxyMessageType.Operations:
      return output + `Operations: ${operations(message.operations)}`;
    case ProxyMessageType.SyncRequest:
      return output + 'SyncRequest';
    default:
      return output + "!?!?";
  }
}
