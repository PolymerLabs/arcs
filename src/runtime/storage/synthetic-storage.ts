/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {ModelValue, SerializedModelEntry} from './crdt-collection-model.js';
import {Id} from '../id.js';
import {Manifest} from '../manifest.js';
import {Handle} from '../recipe/handle.js';
import {ArcHandle, ArcInfo} from '../synthetic-types.js';
import {ArcType, HandleType, Type} from '../type.js';
import {setDiffCustom} from '../util.js';
import {KeyBase} from './key-base.js';
import {ChangeEvent, CollectionStorageProvider, StorageBase, StorageProviderBase, SingletonStorageProvider} from './storage-provider-base.js';
import {StorageProviderFactory} from './storage-provider-factory.js';
import {HandleRetriever} from './handle-retriever.js';

enum Scope {
  arc = 1  // target must be a storage key for an ArcInfo Singleton
}

enum Category {
  handles = 1  // synthetic data will be a collection of ArcHandles
}

// Format is 'synthetic://<scope>/<category>/<target>'
class SyntheticKey extends KeyBase {
  readonly scope: Scope;
  readonly category: Category;
  readonly targetKey: string;
  readonly targetType: Type;
  readonly syntheticType: Type;

  constructor(key: string, storageFactory: StorageProviderFactory) {
    super();
    const match = key.match(/^synthetic:\/\/([^/]+)\/([^/]+)\/(.+)$/);
    if (match === null || match.length !== 4) {
      throw new Error(`invalid synthetic key: ${key}`);
    }

    this.scope = Scope[match[1]];
    this.category = Category[match[2]];

    if (this.scope === Scope.arc) {
      this.targetType = new ArcType();
      const key = storageFactory.parseStringAsKey(match[3]).childKeyForArcInfo();
      this.targetKey = key.toString();
    } else {
      throw new Error(`invalid scope '${match[1]}' for synthetic key: ${key}`);
    }
    if (this.category === Category.handles) {
      this.syntheticType = new HandleType();
    } else {
      throw new Error(`invalid category '${match[2]}' for synthetic key: ${key}`);
    }
  }

  get protocol() {
    return 'synthetic';
  }

  base(): string {
    assert(false, 'base not supported for synthetic keys');
    return null;
  }

  get arcId(): string {
    assert(false, 'arcId not supported for synthetic keys');
    return null;
  }

  childKeyForHandle(id): SyntheticKey {
    assert(false, 'childKeyForHandle not supported for synthetic keys');
    return null;
  }

  childKeyForArcInfo(): SyntheticKey {
    assert(false, 'childKeyForArcInfo not supported for synthetic keys');
    return null;
  }

  childKeyForSuggestions(userId, arcId): KeyBase {
    assert(false, 'childKeyForSuggestions not supported for synthetic keys');
    return null;
  }

  childKeyForSearch(userId): KeyBase {
    assert(false, 'childKeyForSearch not supported for synthetic keys');
    return null;
  }

  toString() {
    return `${this.protocol}://${Scope[this.scope]}/${Category[this.category]}/${this.targetKey}`;
  }
}

export class SyntheticStorage extends StorageBase {
  private readonly storageFactory: StorageProviderFactory;

  constructor(arcId: Id, storageFactory: StorageProviderFactory) {
    super(arcId);
    this.storageFactory = storageFactory;
  }

  async construct(id: string, type: Type, keyFragment: string) : Promise<SyntheticCollection> {
    throw new Error('cannot construct SyntheticStorage providers; use connect');
  }

  async connect(id: string, type: Type, key: string) : Promise<SyntheticCollection> {
    assert(type === null, 'SyntheticStorage does not accept a type parameter');
    const synthKey = new SyntheticKey(key, this.storageFactory);
    const targetStore = await this.storageFactory.connect(id, synthKey.targetType, synthKey.targetKey) as SingletonStorageProvider;
    if (targetStore === null) {
      return null;
    }
    return SyntheticCollection.create(synthKey.syntheticType, id, key, targetStore, this.storageFactory);
  }

  async baseStorageFor(type: Type, key: string) : Promise<StorageProviderBase> {
    throw new Error('baseStorageFor not implemented for SyntheticStorage');
  }

  baseStorageKey(type: Type, key: string) : string {
    throw new Error('baseStorageKey not implemented for SyntheticStorage');
  }

  parseStringAsKey(s: string) : SyntheticKey {
    return new SyntheticKey(s, this.storageFactory);
  }
}

// Currently hard-wired to parse serialized data in an ArcInfo Singleton to provide a list of ArcHandles.
class SyntheticCollection extends StorageProviderBase implements CollectionStorageProvider {
  private readonly targetStore: StorageProviderBase;
  private readonly storageFactory: StorageProviderFactory;
  private model: ArcHandle[] = [];
  backingStore = undefined;

  static async create(
      type: Type,
      id: string,
      key: string,
      targetStore: SingletonStorageProvider,
      storageFactory: StorageProviderFactory) {
    const sc = new SyntheticCollection(type, id, key, targetStore, storageFactory);
    const data = await targetStore.fetch();
    const retriever = storageFactory.getHandleRetriever();
    await sc.process(data, false, retriever);
    targetStore.legacyOn(details => sc.process(details.data, true, retriever));
    return sc;
  }

  private constructor(type: Type, id: string, key: string, targetStore: SingletonStorageProvider, storageFactory: StorageProviderFactory) {
    super(type, undefined, id, key);
    this.targetStore = targetStore;
    this.storageFactory = storageFactory;
  }

  private async process(data, fireEvent, handleRetriever) {
    let handles: Handle[];
    if (data) {
      try {
        const manifestContent = ArcInfo.extractSerialization(data);
        handles = await handleRetriever.getHandlesFromManifest(manifestContent);
      } catch (error) {
        console.warn(`Error parsing manifest at ${this.storageKey}:\n${error.message}`);
      }
    }

    const oldModel = this.model;
    this.model = [];
    for (const handle of handles || []) {
      if (this.storageFactory.isPersistent(handle.storageKey)) {
        if (typeof handle.storageKey === 'string') {
          this.model.push(new ArcHandle(handle.id, handle.storageKey, handle.mappedType, handle.tags));
        } else {
          throw new Error(`Can't use old storage stack with NG StorageKey objects`);
        }
      }
    }
    if (fireEvent) {
      const diff = setDiffCustom(oldModel, this.model, JSON.stringify);
      const add = diff.add.map(arcHandle => ({value: arcHandle}));
      const remove = diff.remove.map(arcHandle => ({value: arcHandle}));
      await this._fire(new ChangeEvent({add, remove}));
    }
  }

  async toList(): Promise<ModelValue[]> {
    return this.model;
  }

  async serializeContents(): Promise<{version: number, model: SerializedModelEntry[]}> {
    throw new Error('unimplemented');
  }

  async cloneFrom(): Promise<void> {
    throw new Error('cloneFrom should never be called on SyntheticCollection!');
  }


  async ensureBackingStore() {
    throw new Error('ensureBackingStore should never be called on SyntheticCollection!');
  }

  // tslint:disable-next-line: no-any
  async getMultiple(ids: string[]): Promise<any[]> {
    throw new Error('unimplemented');
  }

  async storeMultiple(values, keys, originatorId) {
    throw new Error('unimplemented');
  }

  async removeMultiple(items, originatorId: string) : Promise<void> {
    throw new Error('unimplemented');
  }

  async fetchAll(id: string): Promise<{}> {
    throw new Error('unimplemented');
  }

  remove(id: string, keys: string[], originatorId: string): never {
    throw new Error('unimplemented');
  }

  store(value, keys: string[], originatorId?: string): never {
    throw new Error('unimplemented');
  }
}
