/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// A set of routines that help with debugging. Use the @Identified annotation
// on classes to give every instance a unique id, optionally filter on that id,
// then use logWithIdentity to opt into filtering and display of the id.

import {Dictionary} from '../hot.js';
import {ProxyMessage, ProxyMessageType} from '../storage/store.js';
import {CRDTTypeRecord} from '../crdt/crdt.js';

const nameRegistry: Dictionary<number> = {};
const name = Symbol('Identified_name');
const originalConstructor = Symbol('Original_constructor');

const filter: Dictionary<string[]> = {};

// Annotate classes with @Identified to assign a unique identity to each instance
// tslint:disable-next-line no-any
export function Identified<T extends {new(...args:any[]):{}}>(constructor:T) {
  if (!nameRegistry[constructor.name]) {
    nameRegistry[constructor.name] = 0;
  }

  return class extends constructor {
    [name] = `${constructor.name}${nameRegistry[constructor.name]++}`;
    [originalConstructor] = constructor.name;
  };
}

// Log (potentially filtered) messages to the console, including the unique identity of the first argument.
export function logWithIdentity(item, ...args) {
  const id = getId(item);
  if (id == undefined) {
    return;
  }
  const allowed = filter[item[originalConstructor]];
  if (allowed && !allowed.includes(id)) {
    return;
  }
  console.log(id, ...args);
}

export function getId(item) {
  return item[name];
}

// Filter log messages from the class with the provided name to just be the ones that come from the provided identity number.
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
      return output + '!?!?';
  }
}
