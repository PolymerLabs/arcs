/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {StorageKey} from './storage-key.js';
import {CapabilitiesResolver} from '../capabilities-resolver.js';
import {Capabilities} from '../capabilities.js';
import {Capabilities as CapabilitiesNew, Persistence, Encryption, Queryable, Ttl, Shareable} from '../capabilities-new.js';
import {CapabilitiesResolver as CapabilitiesResolverNew} from '../capabilities-resolver-new.js';
import {StorageKeyFactory, StorageKeyOptions} from '../storage-key-factory.js';

export abstract class DatabaseStorageKey extends StorageKey {
  protected static readonly dbNameDefault = 'arcs';

  constructor(protocol: string,
              public readonly unique: string,
              public readonly entitySchemaHash: string,
              public readonly dbName: string) {
    super(protocol);
    if (!/^[a-zA-Z][a-zA-Z0-1_-]*$/.test(this.dbName)) {
      throw new Error(`Invalid dbName: ${this.dbName}`);
    }
    if (!/^[a-fA-F0-9]+$/.test(this.entitySchemaHash)) {
      throw new Error(`Invalid dbName: ${this.dbName}`);
    }
  }

  toString() {
    return `${this.protocol}://${this.entitySchemaHash}@${this.dbName}/${this.unique}`;
  }

  protected static parseKey(key: string): string[] {
    const match = key.match(/^(db|memdb):\/\/([^@]*)@([^/]+)\/(.*)$/);
    if (!match) {
      throw new Error(`Not a valid DatabaseStorageKey: ${key}.`);
    }
    return match;
  }

  static register() {
    CapabilitiesResolver.registerKeyCreator(
        PersistentDatabaseStorageKey.protocol,
        Capabilities.persistentQueryable,
        (options: StorageKeyOptions) =>
            new PersistentDatabaseStorageKey(options.location(), options.schemaHash));

    // Registering all possible in-memory capabilities with `queryable`.
    for (const capabilities of [Capabilities.queryable, Capabilities.tiedToArcQueryable, Capabilities.tiedToRuntimeQueryable]) {
      CapabilitiesResolver.registerKeyCreator(
          MemoryDatabaseStorageKey.protocol,
          capabilities,
          (options: StorageKeyOptions) =>
              new MemoryDatabaseStorageKey(options.location(), options.schemaHash));
    }

    CapabilitiesResolverNew.registerStorageKeyFactory(new PersistentDatabaseStorageKeyFactory());
    CapabilitiesResolverNew.registerStorageKeyFactory(new MemoryDatabaseStorageKeyFactory());
  }
}

export class PersistentDatabaseStorageKeyFactory extends StorageKeyFactory {
  get protocol() { return PersistentDatabaseStorageKey.protocol; }

  capabilities(): CapabilitiesNew {
    return CapabilitiesNew.create([Persistence.onDisk(), Ttl.any(), Queryable.any(), Shareable.any()]);
  }

  create(options: StorageKeyOptions): StorageKey {
    return new PersistentDatabaseStorageKey(options.location(), options.schemaHash);
  }
}

export class MemoryDatabaseStorageKeyFactory extends StorageKeyFactory {
  get protocol() { return MemoryDatabaseStorageKey.protocol; }

  capabilities(): CapabilitiesNew {
    return CapabilitiesNew.create([Persistence.inMemory(), Ttl.any(), Queryable.any(), Shareable.any()]);
  }

  create(options: StorageKeyOptions): StorageKey {
    return new MemoryDatabaseStorageKey(options.location(), options.schemaHash);
  }
}

export class PersistentDatabaseStorageKey extends DatabaseStorageKey {
  public static readonly protocol = 'db';

  constructor(
      unique: string,
      entitySchemaHash: string,
      dbName: string = DatabaseStorageKey.dbNameDefault) {
    super(PersistentDatabaseStorageKey.protocol, unique, entitySchemaHash, dbName);
  }

  childWithComponent(component: string) {
    return new PersistentDatabaseStorageKey(
        `${this.unique}/${component}`, this.entitySchemaHash, this.dbName);
  }

  static fromString(key: string): PersistentDatabaseStorageKey {
    const [_, protocol, entitySchemaHash, dbName, unique] =
        DatabaseStorageKey.parseKey(key);
    assert(protocol === PersistentDatabaseStorageKey.protocol);
    return new PersistentDatabaseStorageKey(unique, entitySchemaHash, dbName);
  }
}

export class MemoryDatabaseStorageKey extends DatabaseStorageKey {
  public static readonly protocol = 'memdb';

  constructor(
      unique: string,
      entitySchemaHash: string,
      dbName: string = DatabaseStorageKey.dbNameDefault) {
    super(MemoryDatabaseStorageKey.protocol, unique, entitySchemaHash, dbName);
  }

  childWithComponent(component: string) {
    return new MemoryDatabaseStorageKey(
        `${this.unique}/${component}`, this.entitySchemaHash, this.dbName);
  }

  static fromString(key: string): MemoryDatabaseStorageKey {
    const [_, protocol, entitySchemaHash, dbName, unique] =
        DatabaseStorageKey.parseKey(key);
    assert(protocol === MemoryDatabaseStorageKey.protocol);
    return new MemoryDatabaseStorageKey(unique, entitySchemaHash, dbName);
  }
}
