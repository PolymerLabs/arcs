// @
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../../platform/assert-web.js';
import {StorageBase, StorageProviderBase} from './storage-provider-base.js';
import {KeyBase} from './key-base.js';
import {FirebaseStorage} from './firebase-storage.js';
import {Id} from '../id.js';
import {Type} from '../type.js';
import {Manifest} from '../manifest.js';
import {setDiffCustom} from '../util.js';
import firebase from 'firebase/app';

enum Scope {
  arc = 1  // target must be a storage key referring to a serialized manifest
}

enum Category {
  handles = 1
}

// Format is 'synthetic://<scope>/<category>/<target>'
class SyntheticKey extends KeyBase {
  scope: Scope;
  category: Category;
  target: string;
  constructor(key: string) {
    super();
    const match = key.match(/^synthetic:\/\/([^/]*)\/([^/]*)\/(.*)$/);
    assert(match && match.length === 4, `invalid synthetic key: ${key}`);
    this.scope = Scope[match[1]];
    this.category = Category[match[2]];
    this.target = match[3];
    assert(this.scope, `invalid scope '${match[1]}' for synthetic key: ${key}`);
    assert(this.category, `invalid category '${match[2]}' for synthetic key: ${key}`);
  }

  get protocol() {
    return 'synthetic';
  }

  childKeyForHandle(id): SyntheticKey {
    assert(false, 'childKeyForHandle not supported for synthetic keys');
    return null;
  }

  toString() {
    return `${this.protocol}://${Scope[this.scope]}/${Category[this.category]}/${this.target}`;
  }
}

// TODO: unhack this
function isFirebaseKey(key) {
  return key && key.startsWith('firebase:');
}

export class SyntheticStorage extends StorageBase {
  private firebaseStorage: FirebaseStorage;

  constructor(arcId: Id, firebaseStorage) {
    super(arcId);
    this.firebaseStorage = firebaseStorage;
  }

  async construct(id: string, type: Type, keyFragment: string) : Promise<SyntheticCollection> {
    throw new Error('cannot construct synthetic storage providers; use connect');
  }

  async connect(id: string, type: Type, key: string) : Promise<SyntheticCollection> {
    // TODO: add handle type to the type system
    assert(type === null, 'synthetic storage does not accept a type parameter');

    const synthKey = new SyntheticKey(key);
    if (isFirebaseKey(synthKey.target)) {
      const {reference} = this.firebaseStorage.attach(synthKey.target);
      return new SyntheticCollection(Type.newSynthesized(), id, key, reference);
    } else {
      throw new Error('synthetic storage target must be a firebase storage key (for now)');
    }
  }

  async baseStorageFor(type: Type, key: string) {
    assert(false, 'baseStorageFor not implemented for SyntheticStorage');
    return Promise.reject();
  }

  baseStorageKey(type: Type, key: string) {
    assert(false, 'baseStorageKey not implemented for SyntheticStorage');
    return '';
  }

  parseStringAsKey(s: string) : SyntheticKey {
    return new SyntheticKey(s);
  }
}

class SyntheticCollection extends StorageProviderBase {
  private readonly reference: firebase.database.Reference;
  private readonly initialized: Promise<void>;
  private resolveInitialized: () => void | null;
  private model: {storageKey: string, type: Type, tags: string[]}[];

  constructor(type, id, key, reference) {
    super(type, undefined, id, key);
    this.reference = reference;
    this.model = [];
    this.initialized = new Promise(resolve => this.resolveInitialized = resolve);
    this.reference.on('value', snapshot => this.remoteStateChanged(snapshot));
  }

  private async remoteStateChanged(snapshot) {
    let handles;
    try {
      if (snapshot.exists() && snapshot.val()) {
        // TODO: remove the import-removal hack when import statements no longer appear in
        // serialised manifests, or deal with them correctly if they end up staying
        const manifest = await Manifest.parse(snapshot.val().replace(/\bimport .*\n/g, ''), {});
        handles = manifest.activeRecipe && manifest.activeRecipe.handles;
      }
    } catch (e) {
      console.warn(`Error parsing manifest at ${this._storageKey}:\n${e.message}`);
    }

    const newModel = [];
    for (const handle of handles || []) {
      if (isFirebaseKey(handle._storageKey)) {
        newModel.push({
          storageKey: handle.storageKey,
          type: handle.mappedType,
          tags: handle.tags
        });
      }
    }
    const diff = setDiffCustom(this.model, newModel, JSON.stringify);
    this.model = newModel;

    if (this.resolveInitialized) {
      this.resolveInitialized();
      this.resolveInitialized = null;
    }
    this._fire('change', diff);
  }

  async toList() {
    await this.initialized;
    return this.model;
  }

  async toLiteral() {
    return this.toList();
  }

  cloneFrom() {
    throw new Error("cloneFrom should never be called on SyntheticCollection!");
  }

  ensureBackingStore() {
    throw new Error("ensureBackingStore should never be called on SyntheticCollection!");
  }

  backingStore = undefined;
}
