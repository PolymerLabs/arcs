/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {StorageKey, StorageKeyLiteral} from './storage-key.js';
import {ReferenceModeStorageKey} from './reference-mode-storage-key.js';
import {VolatileStorageKey} from './drivers/volatile.js';

type ParserTopLevel = (key: string) => StorageKey;
type Parser = (key: string, parse: ParserTopLevel) => StorageKey;

let staticParser;

/**
 * Parses storage key string representations back into real StorageKey
 * instances.
 *
 * If you modify the default set of storage
 * keys in a test, remember to call StorageKeyParser.reset() in the tear-down
 * method.
 */
export class StorageKeyParser {
  private parsers;

  constructor() {
    this.parsers = this.getDefaultParsers();
    staticParser = this;
  }

  private defaultParsers: [string, Parser][] = [
    [ReferenceModeStorageKey.protocol, ReferenceModeStorageKey.fromString],
    [VolatileStorageKey.protocol, VolatileStorageKey.fromString]
  ];

  private getDefaultParsers(): Map<string, Parser> {
    return new Map<string, Parser>(this.defaultParsers);
  }

  parse(key: string): StorageKey {
    const match = key.match(/^((?:\w|-)+):\/\/(.*)$/);
    if (!match) {
      throw new Error('Failed to parse storage key: ' + key);
    }
    const protocol = match[1];
    const parser = this.parsers.get(protocol);
    if (!parser) {
      throw new Error(`Unknown storage key protocol ${protocol} in key ${key}.`);
    }
    return parser(key, this.parse.bind(this));
  }

  reset() {
    this.parsers = this.getDefaultParsers();
  }

  addParser(protocol: string, parser: Parser) {
    if (this.parsers.has(protocol)) {
      throw new Error(`Parser for storage key protocol ${protocol} already exists.`);
    }
    this.parsers.set(protocol, parser);
  }

  addDefaultParser(protocol: string, parser: Parser) {
    this.defaultParsers.push([protocol, parser]);
    if (!this.parsers.has(protocol)) {
      this.parsers.set(protocol, parser);
    }
  }

  static parse(key): StorageKey {
    return staticParser.parse(key);
  }
}

staticParser = new StorageKeyParser();

StorageKey.fromLiteral = (literal: StorageKeyLiteral) => StorageKeyParser.parse(literal.key);
