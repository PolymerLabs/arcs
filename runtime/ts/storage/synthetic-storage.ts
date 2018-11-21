// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../../platform/assert-web.js';
import {StorageBase, StorageProviderBase, ChangeEvent} from './storage-provider-base.js';
import {StorageProviderFactory} from './storage-provider-factory.js';
import {KeyBase} from './key-base.js';
import {Id} from '../id.js';
import {Type} from '../type.js';
import {Manifest} from '../manifest.js';
import {setDiffCustom} from '../util.js';
import firebase from 'firebase/app';

export class ArcHandle {
  public readonly storageKey: string;
  public readonly type: Type;
  public readonly tags: string[];

  constructor(storageKey, type, tags) {
    this.storageKey = storageKey;
    this.type = type;
    this.tags = tags;
  }
}

enum Scope {
  arc = 1  // target must be a storage key for an ArcInfo Variable
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

  constructor(key: string) {
    super();
    const match = key.match(/^synthetic:\/\/([^/]+)\/([^/]+)\/(.+)$/);
    if (match === null || match.length !== 4) {
      throw new Error(`invalid synthetic key: ${key}`);
    }

    this.scope = Scope[match[1]];
    this.category = Category[match[2]];
    this.targetKey = match[3];

    if (this.scope === Scope.arc) {
      this.targetType = Type.newArcInfo();
    } else {
      throw new Error(`invalid scope '${match[1]}' for synthetic key: ${key}`);
    }
    if (this.category === Category.handles) {
      this.syntheticType = Type.newHandleInfo();
    } else {
      throw new Error(`invalid category '${match[2]}' for synthetic key: ${key}`);
    }
  }

  get protocol() {
    return 'synthetic';
  }

  childKeyForHandle(id): SyntheticKey {
    assert(false, 'childKeyForHandle not supported for synthetic keys');
    return null;
  }

  toString() {
    return `${this.protocol}://${Scope[this.scope]}/${Category[this.category]}/${this.targetKey}`;
  }
}

export class SyntheticStorage extends StorageBase {
  private readonly storageFactory: StorageProviderFactory;

  constructor(arcId: Id, storageFactory) {
    super(arcId);
    this.storageFactory = storageFactory;
  }

  async construct(id: string, type: Type, keyFragment: string) : Promise<SyntheticCollection> {
    throw new Error('cannot construct SyntheticStorage providers; use connect');
  }

  async connect(id: string, type: Type, key: string) : Promise<SyntheticCollection> {
    assert(type === null, 'SyntheticStorage does not accept a type parameter');
    const synthKey = new SyntheticKey(key);
    const targetStore = await this.storageFactory.connect(id, synthKey.targetType, synthKey.targetKey);
    if (targetStore === null) {
      return null;
    }
    return new SyntheticCollection(synthKey.syntheticType, id, key, targetStore, this.storageFactory);
  }

  async baseStorageFor(type: Type, key: string) : Promise<StorageProviderBase> {
    throw new Error('baseStorageFor not implemented for SyntheticStorage');
  }

  baseStorageKey(type: Type, key: string) : string {
    throw new Error('baseStorageKey not implemented for SyntheticStorage');
  }

  parseStringAsKey(s: string) : SyntheticKey {
    return new SyntheticKey(s);
  }
}

// Currently hard-wired to parse serialized data in an ArcInfo Variable to provide a list of ArcHandles.
class SyntheticCollection extends StorageProviderBase {
  private readonly targetStore: StorageProviderBase;
  private readonly storageFactory: StorageProviderFactory;
  private readonly initialized: Promise<void>;
  private model: ArcHandle[] = [];
  backingStore = undefined;

  constructor(type, id, key, targetStore, storageFactory) {
    super(type, undefined, id, key);
    this.targetStore = targetStore;
    this.storageFactory = storageFactory;

    let resolveInitialized;
    this.initialized = new Promise(resolve => resolveInitialized = resolve);
    targetStore.get().then(async data => {
      await this.process(data, false);
      resolveInitialized();
      targetStore.on('change', details => this.process(details.data, true), this);
    });
  }

  private async process(data, fireEvent) {
    let handles;
    try {
      if (data) {
        // TODO: remove the import-removal hack when import statements no longer appear in
        // serialized manifests, or deal with them correctly if they end up staying
        const manifest = await Manifest.parse(data.serialized.replace(/\bimport .*\n/g, ''), {});
        handles = manifest.activeRecipe && manifest.activeRecipe.handles;
      }
    } catch (e) {
      console.warn(`Error parsing manifest at ${this.storageKey}:\n${e.message}`);
    }

    const oldModel = this.model;
    this.model = [];
    for (const handle of handles || []) {
      if (this.storageFactory.isPersistent(handle._storageKey)) {
        this.model.push(new ArcHandle(handle.storageKey, handle.mappedType, handle.tags));
      }
    }
    if (fireEvent) {
      const diff = setDiffCustom(oldModel, this.model, JSON.stringify);
      const add = diff.add.map(arcHandle => ({value: arcHandle}));
      const remove = diff.remove.map(arcHandle => ({value: arcHandle}));
      this._fire('change', new ChangeEvent({add, remove}));
    }
  }

  async toList() {
    await this.initialized;
    return this.model;
  }

  async toLiteral() {
    return this.toList();
  }

  cloneFrom() {
    throw new Error('cloneFrom should never be called on SyntheticCollection!');
  }

  ensureBackingStore() {
    throw new Error('ensureBackingStore should never be called on SyntheticCollection!');
  }
}
