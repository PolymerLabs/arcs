/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageKey} from './storage-key.js';
import {ArcId} from '../id.js';
import {Capabilities} from '../capabilities.js';

export type StorageKeyOptions = Readonly<{
  arcId: ArcId;
}>;

export type StorageKeyCreator = (options: StorageKeyOptions) => StorageKey;
export type StorageKeyCreatorsMap =
    Map<string, {capabilities: Capabilities, create: StorageKeyCreator}>;

/**
 * StorageKeyFactory is a per-arc registry of StorageKey creators supported in
 * the current Runtime environment. A StorageKeyCreator requires an `arcId` to
 * provide a specific location inside the shared storage for the given Arc,
 * when laying arcs into a shared storage.
 */
export class StorageKeyFactory {
  private static defaultCreators: StorageKeyCreatorsMap = new Map();
  private static registeredCreators: StorageKeyCreatorsMap = new Map();

  private creators: StorageKeyCreatorsMap;

  constructor(public readonly options: StorageKeyOptions,
              creators?: StorageKeyCreatorsMap) {
    if (creators) {
      // TBD: should defaultCreators be included as well here or not?
      this.creators = new Map(creators);
    } else {
      this.creators = StorageKeyFactory.getDefaultCreators();
      for (const [protocol, {capabilities, create}] of StorageKeyFactory.registeredCreators.entries()) {
        this.creators.set(protocol, {capabilities, create});
      }
    }
  }

  static getDefaultCreators(): StorageKeyCreatorsMap {
    return new Map(StorageKeyFactory.defaultCreators);
  }

  static registerDefaultKeyCreator(
      protocol: string,
      capabilities: Capabilities,
      create: StorageKeyCreator): void {
    StorageKeyFactory.defaultCreators.set(protocol, {capabilities, create});
  }

  static registerKeyCreator(
      protocol: string,
      capabilities: Capabilities,
      create: StorageKeyCreator): void {
    if (StorageKeyFactory.registeredCreators.get(protocol)) {
      throw new Error(`Key creator for protocol ${protocol} already registered.`);
    }
    StorageKeyFactory.registeredCreators.set(protocol, {capabilities, create});
  }

  static reset() {
    StorageKeyFactory.registeredCreators = new Map();
  }

  findStorageKeyProtocols(capabilities: Capabilities): Set<string> {
    const protocols: Set<string> = new Set();
    for (const protocol of this.creators.keys()) {
      if (this.creators.get(protocol).capabilities.contains(capabilities)) {
        protocols.add(protocol);
      }
    }
    return protocols;
  }

  createStorageKey(protocol: string): StorageKey {
    if (this.creators.has(protocol)) {
      return this.creators.get(protocol).create(this.options);
    }
    throw new Error(`No key creator was found for protocol ${protocol}`);
  }
}
