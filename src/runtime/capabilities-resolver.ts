/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../platform/assert-web.js';

import {ArcId} from './id.js';
import {Capabilities} from './capabilities.js';
import {StorageKey} from './storageNG/storage-key.js';
import {DriverFactory} from './storageNG/drivers/driver-factory.js';

export type StorageKeyOptions = Readonly<{
  arcId: ArcId;
}>;

export type StorageKeyCreator = (options: StorageKeyOptions) => StorageKey;
export type StorageKeyCreatorsMap =
    Map<string, {capabilities: Capabilities, create: StorageKeyCreator}>;

export class CapabilitiesResolver {
  private static defaultCreators: StorageKeyCreatorsMap = new Map();
  private static registeredCreators: StorageKeyCreatorsMap = new Map();

  private creators: StorageKeyCreatorsMap;

  constructor(public readonly options: StorageKeyOptions,
              creators?: StorageKeyCreatorsMap) {
    if (creators) {
      // TBD: should defaultCreators be included as well here or not?
      this.creators = new Map(creators);
    } else {
      this.creators = CapabilitiesResolver.getDefaultCreators();
      for (const [protocol, {capabilities, create}] of CapabilitiesResolver.registeredCreators.entries()) {
        this.creators.set(protocol, {capabilities, create});
      }
    }
  }

  static getDefaultCreators(): StorageKeyCreatorsMap {
    return new Map(CapabilitiesResolver.defaultCreators);
  }

  static registerDefaultKeyCreator(
      protocol: string,
      capabilities: Capabilities,
      create: StorageKeyCreator): void {
        CapabilitiesResolver.defaultCreators.set(protocol, {capabilities, create});
  }

  static registerKeyCreator(
      protocol: string,
      capabilities: Capabilities,
      create: StorageKeyCreator): void {
    if (CapabilitiesResolver.registeredCreators.get(protocol)) {
      throw new Error(`Key creator for protocol ${protocol} already registered.`);
    }
    CapabilitiesResolver.registeredCreators.set(protocol, {capabilities, create});
  }

  static reset() {
    CapabilitiesResolver.registeredCreators = new Map();
  }

  createStorageKey(capabilities: Capabilities): StorageKey {
    // TODO: This is a naive and basic solution for picking the appropriate
    // storage key creator for the given capabilities. As more capabilities are
    // added the heuristics is to become more robust.
    const protocols = this.findStorageKeyProtocols(capabilities);
    if (protocols.size === 0) {
      throw new Error(`Cannot create a suitable storage key for ${capabilities.toString()}`);
    } else if (protocols.size > 1) {
      console.warn(`Multiple storage key creators for ${capabilities.toString()}`);
    }
    return this.creators.get([...protocols][0]).create(this.options);
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
}
