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
import {VolatileStorageKey} from './drivers/volatile.js';
import {FirebaseStorageKey} from './drivers/firebase.js';
import {RamDiskStorageKey} from './drivers/ramdisk.js';

type Parser = (key: string) => StorageKey;

/**
 * Parses storage key string representations back into real StorageKey
 * instances.
 *
 * Singleton class with static methods. If you modify the default set of storage
 * keys in a test, remember to call StorageKeyParser.reset() in the tear-down
 * method.
 */
export class StorageKeyParser {
  private static parsers = StorageKeyParser.getDefaultParsers();

  private static getDefaultParsers(): Map<string, Parser> {
    return new Map<string, Parser>([
      ['volatile', VolatileStorageKey.fromString],
      ['firebase', FirebaseStorageKey.fromString],
      ['ramdisk', RamDiskStorageKey.fromString],
    ]);
  }

  static parse(key: string): StorageKey {
    const match = key.match(/^(\w+):\/\/(.*)$/);
    if (!match) {
      throw new Error('Failed to parse storage key: ' + key);
    }
    const protocol = match[1];
    const parser = this.parsers.get(protocol);
    if (!parser) {
      throw new Error(`Unknown storage key protocol ${protocol} in key ${key}.`);
    }
    return parser(key);
  }

  static reset() {
    this.parsers = this.getDefaultParsers();
  }

  static addParser(protocol: string, parser: Parser) {
    if (this.parsers.has(protocol)) {
      throw new Error(`Parser for storage key protocol ${protocol} already exists.`);
    }
    this.parsers.set(protocol, parser);
  }
}
