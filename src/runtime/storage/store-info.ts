/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Comparable, compareStrings, IndentingStringBuilder} from '../../utils/lib-utils.js';
import {Type} from '../../types/lib-types.js';
import {StorageKey} from './storage-key.js';
import {ClaimIsTag} from '../arcs-types/claim.js';
import {AnnotationRef} from '../arcs-types/annotation.js';
import {ReferenceModeStorageKey} from './reference-mode-storage-key.js';
import {Exists} from './drivers/driver.js';
import {StorageMode} from './store-interface.js';

/** Assorted properties about a store. */
export class StoreInfo<T extends Type> implements Comparable<StoreInfo<T>> {
  readonly id: string;
  name: string;  // TODO: Find a way to make this readonly.
  readonly originalId?: string;
  readonly source?: string;
  readonly origin?: 'file' | 'resource' | 'storage' | 'inline';
  readonly description?: string;

  /** Trust tags claimed by this data store. */
  readonly claims?: StoreClaims;
  readonly annotations?: AnnotationRef[];

  readonly versionToken?: string;
  readonly model?: {};
  readonly mode: StorageMode;

  /**
   * If set, include this storage key in the serialization.
   * Used to ensure that the location of volatile storage is stable
   * across serialization/deserialization.
   */
  readonly includeKey?: string;

  readonly storageKey: StorageKey;
  readonly type: T;
  exists: Exists;

  constructor(opts: {id: string, type: T, name?: string, originalId?: string, source?: string, origin?: 'file' | 'resource' | 'storage' | 'inline', description?: string, includeKey?: string, storageKey?: StorageKey, claims?: StoreClaims, annotations?: AnnotationRef[], model?: {}, versionToken?: string, exists?: Exists}) {
    this.id = opts.id;
    this.name = opts.name;
    this.originalId = opts.originalId;
    this.source = opts.source;
    this.origin = opts.origin;
    this.description = opts.description;
    this.includeKey = opts.includeKey;
    this.storageKey = opts.storageKey;
    this.claims = opts.claims;
    this.annotations = opts.annotations;
    this.type = opts.type;
    this.model = opts.model;
    this.versionToken = opts.versionToken;
    this.exists = opts.exists;
    if (this.type && this.type.isMux) {
      this.mode = StorageMode.Backing;
    } else {
      this.mode = this.storageKey instanceof ReferenceModeStorageKey ? StorageMode.ReferenceMode : StorageMode.Direct;
    }
  }

  clone(overrides: Partial<StoreInfo<T>>) {
    return new StoreInfo({
        id: overrides.id || this.id,
        name: overrides.name || this.name,
        originalId: overrides.originalId || this.originalId,
        source: overrides.source || this.source,
        origin: overrides.origin || this.origin,
        includeKey: overrides.includeKey || this.includeKey,
        storageKey: overrides.storageKey || this.storageKey,
        type: overrides.type || this.type,
        claims: overrides.claims || this.claims,
        annotations: overrides.annotations || this.annotations,
        model: overrides.model || this.model,
        versionToken: overrides.versionToken || this.versionToken
    });
  }

  get apiChannelMappingId() { return this.id; }

  _compareTo(other: StoreInfo<T>): number {
    let cmp: number;
    cmp = compareStrings(this.name, other.name);
    if (cmp !== 0) return cmp;
    cmp = compareStrings(this.versionToken, other.versionToken);
    if (cmp !== 0) return cmp;
    cmp = compareStrings(this.source, other.source);
    if (cmp !== 0) return cmp;
    cmp = compareStrings(this.id, other.id);
    if (cmp !== 0) return cmp;
    return 0;
  }

  // TODO: Make these tags live inside StoreInfo.
  toManifestString(opts?: {handleTags?: string[], overrides?: Partial<StoreInfo<T>>}) : string {
    opts = opts || {};
    if (opts.overrides) {
      return this.clone(opts.overrides).toManifestString({handleTags: opts.handleTags});
    }
    const builder = new IndentingStringBuilder();
    if ((this.annotations || []).length > 0) {
      builder.push(...this.annotations.map(a => a.toString()));
    }
    const handleStr: string[] = [];
    handleStr.push(`store`);
    if (this.name) {
      handleStr.push(`${this.name}`);
    }
    handleStr.push(`of ${this.type.toString()}`);
    if (this.id) {
      handleStr.push(`'${this.id}'`);
    }
    if (this.originalId) {
      handleStr.push(`!!${this.originalId}`);
    }
    if (this.versionToken != null) {
      handleStr.push(`@${this.versionToken}`);
    }
    if (opts.handleTags && opts.handleTags.length) {
      handleStr.push(`${opts.handleTags.map(tag => `#${tag}`).join(' ')}`);
    }
    if (this.source) {
      if (this.origin === 'file') {
        handleStr.push(`in '${this.source}'`);
      } else {
        handleStr.push(`in ${this.source}`);
        if (this.includeKey) {
          handleStr.push(`at '${this.includeKey}'`);
        }
      }
    } else if (this.storageKey) {
      handleStr.push(`at '${this.storageKey}'`);
    }
    builder.push(handleStr.join(' '));
    builder.withIndent(builder => {
      if (this.claims && this.claims.size > 0) {
        for (const [target, claims] of this.claims) {
          const claimClause = target.length ? `claim field ${target}` : 'claim';
          builder.push(`${claimClause} is ${claims.map(claim => claim.tag).join(' and is ')}`);
        }
      }
      if (this.description) {
        builder.push(`description \`${this.description}\``);
      }
    });
    return builder.toString();
  }
}

/**
 * Dataflow claims defined on a store. Maps from target field to a list of tags
 * claimed on the field. Target can be an empty string, meaning it applies to
 * the entire schema for the store, or a dotted string pointing to a field
 * inside it (e.g. someField.myRef.foo).
 */
export type StoreClaims = Map<string, ClaimIsTag[]>;
