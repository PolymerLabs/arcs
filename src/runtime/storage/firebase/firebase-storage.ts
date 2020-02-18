/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {firebase} from '../../../../concrete-storage/firebase.js';
import {assert} from '../../../platform/assert-web.js';
import {atob} from '../../../platform/atob-web.js';
import {btoa} from '../../../platform/btoa-web.js';
import {Id} from '../../id.js';
import {Runnable} from '../../hot.js';
import {BigCollectionType, CollectionType, ReferenceType, Type, TypeVariable} from '../../type.js';
import {setDiff} from '../../util.js';
import {CrdtCollectionModel, ModelValue, SerializedModelEntry} from '../crdt-collection-model.js';
import {KeyBase} from '../key-base.js';
import {BigCollectionStorageProvider, ChangeEvent, CollectionStorageProvider, StorageBase, StorageProviderBase, SingletonStorageProvider} from '../storage-provider-base.js';
import {Dictionary} from '../../hot.js';

export {firebase};

export async function resetStorageForTesting(key) {
  key = new FirebaseKey(key);
  const app = firebase.initializeApp({
    apiKey: key.apiKey,
    projectId: key.projectId,
    databaseURL: key.databaseUrl
  });

  const reference = firebase.database(app).ref(key.location);
  await reference.remove();
  await app.delete();
}

class FirebaseKey extends KeyBase {
  databaseUrl?: string;
  projectId?: string;
  apiKey?: string;

  constructor(key: string) {
    super();
    let parts = key.split('://');
    this.protocol = parts[0];
    assert(this.protocol === 'firebase', `can't construct firebase key for protocol ${this.protocol} (input key ${key})`);
    if (parts[1]) {
      parts = parts[1].split('/');
      this.databaseUrl = parts[0];
      if (this.databaseUrl && this.databaseUrl.endsWith('.firebaseio.com')) {
        this.projectId = this.databaseUrl.split('.')[0];
      } else {
        throw new Error('FirebaseKey must end with .firebaseio.com');
      }
      this.apiKey = parts[1];
      this.location = parts.slice(2).join('/');
    } else {
      this.databaseUrl = undefined;
      this.projectId = undefined;
      this.apiKey = undefined;
      this.location = '';
    }
  }

  base(): string {
    const str = this.toString();
    return str.substring(0, str.length - this.arcId.length);
  }

  get arcId(): string {
    return this.location.substring(this.location.lastIndexOf('/') + 1);
  }

  childKeyForHandle(id): FirebaseKey {
    return this.buildChildKey(`handles/${id}`);
  }

  childKeyForArcInfo(): FirebaseKey {
    return this.buildChildKey('arc-info');
  }

  childKeyForSuggestions(userId, arcId): KeyBase {
    return this.buildChildKey(`${userId}/suggestions/${arcId}`);
  }

  childKeyForSearch(userId): KeyBase {
    return this.buildChildKey(`${userId}/search`);
  }

  private buildChildKey(leaf) {
    let location = '';
    if (this.location != undefined && this.location.length > 0) {
      location = this.location + '/';
    }
    location += leaf;
    return new FirebaseKey(`${this.protocol}://${this.databaseUrl}/${this.apiKey}/${location}`);
  }

  toString() {
    if (this.databaseUrl && this.apiKey) {
      return `${this.protocol}://${this.databaseUrl}/${this.apiKey}/${this.location}`;
    }
    return `${this.protocol}://`;
  }
}

let _nextAppNameSuffix = 0;

enum Mode {direct, reference, backing}

export class FirebaseStorage extends StorageBase {
  private readonly apps: Dictionary<{app: firebase.app.App, owned: boolean}>;
  private readonly sharedStores: Dictionary<FirebaseStorageProvider|null>;
  private baseStores: Map<string, FirebaseBackingStore>;
  private baseStorePromises: Map<string, Promise<FirebaseBackingStore>>;

  constructor(arcId: Id) {
    super(arcId);
    this.apps = {};
    this.baseStores = new Map();
    this.baseStorePromises = new Map();
  }

  async construct(id: string, type: Type, keyFragment: string) : Promise<FirebaseStorageProvider> {
    let mode = (type instanceof ReferenceType) ? Mode.direct : Mode.reference;
    if (type instanceof BigCollectionType) {
      mode = Mode.direct;
    } else if (type.isTypeContainer() && type.getContainedType() instanceof ReferenceType) {
      mode = Mode.direct;
    }
    return this._join(id, type, keyFragment, false, mode);
  }

  async connect(id: string, type: Type, key: string) : Promise<FirebaseStorageProvider> {
    return this._join(id, type, key, true, Mode.direct);
  }

  // Unit tests should call this in an 'after' block.
  async shutdown() {
    for (const entry of Object.values(this.apps)) {
      if (entry.owned) {
        await entry.app.delete();
        entry.owned = false;
      }
    }
  }

  baseStorageKey(type: Type, keyString: string): string {
    const fbKey = new FirebaseKey(keyString);
    fbKey.location = `${fbKey.location.split('/')[0]}/backingStores/${type.toString()}`;
    return fbKey.toString();
  }

  async baseStorageFor(type, key: string) {
    const typeStr = type.toString();
    const cacheStr = `${new FirebaseKey(key).databaseUrl}!${typeStr}`;
    let storage;
    if (storage = this.baseStores.get(cacheStr)) {
      return storage;
    }
    if (storage = this.baseStorePromises.get(cacheStr)) {
      return storage;
    }
    const storagePromise = this._join(typeStr, type.collectionOf(), key, 'unknown', Mode.backing) as Promise<FirebaseBackingStore>;
    this.baseStorePromises.set(cacheStr, storagePromise);
    storage = await storagePromise;
    assert(storage, 'baseStorageFor should not fail');
    this.baseStores.set(cacheStr, storage);
    this.baseStorePromises.delete(cacheStr);
    return storage;
  }

  parseStringAsKey(s: string) : FirebaseKey {
    return new FirebaseKey(s);
  }

  // mode is only referred to if shouldExist is false, or if shouldExist is 'unknown'
  // but this _join creates the storage location.
  async _join(id: string, type: Type, keyString: string, shouldExist: boolean | 'unknown', mode: Mode) {
    assert(!(type instanceof TypeVariable));
    assert(!type.isTypeContainer() || !(type.getContainedType() instanceof TypeVariable));
    const fbKey = new FirebaseKey(keyString);
    // TODO: is it ever going to be possible to autoconstruct new firebase datastores?
    if (fbKey.databaseUrl == undefined || fbKey.apiKey == undefined) {
      throw new Error('Can\'t complete partial firebase keys');
    }

    if (this.apps[fbKey.projectId] == undefined) {
      for (const app of firebase.apps) {
        if (app.options['databaseURL'] === fbKey.databaseUrl) {
          this.apps[fbKey.projectId] = {app, owned: false};
          break;
        }
      }
    }

    if (this.apps[fbKey.projectId] == undefined) {
      const app = firebase.initializeApp({
        apiKey: fbKey.apiKey,
        projectId: fbKey.projectId,
        databaseURL: fbKey.databaseUrl
      }, `app${_nextAppNameSuffix++}`);

      this.apps[fbKey.projectId] = {app, owned: true};
    }

    const reference = firebase.database(this.apps[fbKey.projectId].app).ref(fbKey.location);
    const currentSnapshot = await reference.once('value');
    if (shouldExist !== 'unknown' && shouldExist !== currentSnapshot.exists()) {
      return null;
    }

    let enableReferenceMode = currentSnapshot.exists() && currentSnapshot.val().referenceMode;

    if (shouldExist === false || (shouldExist === 'unknown' && currentSnapshot.exists() === false)) {
      const result = await reference.transaction(data => {
        if (data != null) {
          return undefined;
        }
        return {version: 0, referenceMode: mode === Mode.reference};
      }, undefined, false);

      if (!result.committed) {
        return null;
      }
      enableReferenceMode = (mode === Mode.reference);
    }

    const provider = FirebaseStorageProvider.newProvider(type, this, id, reference, fbKey, shouldExist, mode);
    if (enableReferenceMode) {
      assert(mode !== Mode.backing, 'backing stores should not have referenceMode enabled');
      provider.enableReferenceMode();
    }
    return provider;
  }

  // For reference, Firebase keys cannot contain these chars: .#$/[]
  static encodeKey(key: string): string {
    key = btoa(key);
    return key.replace(/\//g, '*');
  }

  static decodeKey(key: string): string {
    key = key.replace(/\*/g, '/');
    return atob(key);
  }
}

abstract class FirebaseStorageProvider extends StorageProviderBase {
  private firebaseKey: string;
  protected persisting: Promise<void>|null;
  protected reference: firebase.database.Reference;
  backingStore: FirebaseBackingStore|null;
  protected storageEngine: FirebaseStorage;
  private pendingBackingStore: Promise<FirebaseBackingStore>|null;

  protected constructor(type, storageEngine, id, reference, key) {
    super(type, undefined, id, key.toString());
    this.storageEngine = storageEngine;
    this.firebaseKey = key;
    this.reference = reference;
    this.backingStore = null;
    this.pendingBackingStore = null;

    // Resolved when local modifications complete being persisted
    // to firebase. Null when not persisting.
    this.persisting = null;
  }

  // A consequence of awaiting this function is that this.backingStore
  // is guaranteed to exist once the await completes. This is because
  // if backingStore doesn't yet exist, the assignment in the then()
  // is guaranteed to execute before anything awaiting this function.
  async ensureBackingStore() {
    if (this.backingStore) {
      return this.backingStore;
    }
    if (!this.pendingBackingStore) {
      const key = this.storageEngine.baseStorageKey(this.backingType(), this.storageKey);
      this.pendingBackingStore = this.storageEngine.baseStorageFor(this.type, key);
      await this.pendingBackingStore.then(backingStore => this.backingStore = backingStore);
    }
    return this.pendingBackingStore;
  }

  abstract backingType() : Type;

  static newProvider(type, storageEngine, id, reference, key, shouldExist, mode) {
    if (mode === Mode.backing) {
      return new FirebaseBackingStore(type, storageEngine, id, reference, key);
    }
    if (type instanceof CollectionType) {
      return new FirebaseCollection(type, storageEngine, id, reference, key);
    }
    if (type instanceof BigCollectionType) {
      return new FirebaseBigCollection(type, storageEngine, id, reference, key);
    }
    return new FirebaseVariable(type, storageEngine, id, reference, key, shouldExist);
  }

  async _transaction(transactionFunction) {
    const result = await this.reference.transaction(data => {
      if (data == null) {
        // If the data is not cached locally, firebase will speculatively
        // attempt to run the transaction against `null`. This should never
        // actually commit, but we can't just abort the transaction or
        // raise an error here -- both will prevent firebase from continuing
        // to apply our write. So we return a dummy value and assert that
        // we never actually commit it.
        return 0;
      }
      const newData = transactionFunction(data);
      // TODO(sjmiles): remove `undefined` values from the object tree
      return JSON.parse(JSON.stringify(newData));
    }, undefined, false);
    if (result.committed) {
      assert(result.snapshot.val() !== 0);
    }
    return result;
  }

  abstract get _hasLocalChanges(): boolean;

  abstract async _persistChangesImpl(): Promise<void>;

  // Only one invokation of _persistChangesImpl should ever
  // be in-flight at a time. This loop preserves that property.
  async _persistChanges() {
    while (this._hasLocalChanges) {
      if (!this.persisting) {
        this.persisting = this._persistChangesImpl();
        await this.persisting;
        this.persisting = null;
      } else {
        await this.persisting;
      }
    }
  }
}

/**
 * Models a Singleton that is persisted to firebase in a
 * last-writer-wins scheme.
 *
 * Initialization: After construct/connect the singleton is
 * not fully initialized, calls to `get` and `toLiteral`
 * will not complete until either:
 *  * The initial value is supplied via the firebase `.on`
 *    subscription.
 *  * A value is written to the store by a call to `set`.
 *
 * Updates from firebase: Each time an update is received
 * from firebase we update the local version and value,
 * unless there is a pending local modification (see below).
 *
 * Local modifications: When a local modification is applied
 * by a call to `set` we increment the version number,
 * mark this singleton as locally modified, and start a
 * process to atomically persist the change to firebase.
 * Until this process has completed we suppress incoming
 * changes from firebase. The version that we have chosen
 * (by incrementing) may not match the final state that is
 * written to firebase (if there are concurrent changes in
 * firebase, or if we have queued up multiple local
 * modifications), but the result will always be
 * monotonically increasing.
 */
class FirebaseVariable extends FirebaseStorageProvider implements SingletonStorageProvider {
  private value: {storageKey: string, id: string}|null;
  private localModified: boolean;
  private readonly initialized: Promise<void>;
  // TODO(sjmiles): localKeyId collisions occur when using device-client-pipe,
  // so I'll randomize localKeyId a bit
  private localKeyId = Date.now();
  private pendingWrites: {storageKey: string, value: {}}[] = [];
  wasConnect: boolean; // for debugging
  private resolveInitialized: Runnable;
  private readonly valueChangeCallback: (dataSnapshot: firebase.database.DataSnapshot, s?: string) => void;

  constructor(type, storageEngine, id, reference, firebaseKey, shouldExist) {
    super(type, storageEngine, id, reference, firebaseKey);
    this.wasConnect = shouldExist;

    // Current value stored in this singleton. Reflects either a
    // value that was stored in firebase, or a value that was
    // written locally.
    this.value = null;

    // Monotonic version, initialized via response from firebase,
    // or a call to `set` (as 0). Updated on changes from firebase
    // or during local modifications.

    // TODO Replace this nullness with a uninitialized boolean.
    this._version = null;

    // Whether `this.value` is affected by a local modification.
    // When this is true we are still in the process of writing
    // the value to the remote store and will suppress any
    // incoming changes from firebase.
    this.localModified = false;

    // Resolved when data is first available. The earlier of
    // * the initial value is supplied via firebase `reference.on`
    // * a value is written to the singleton by a call to `set`.
    this.initialized = new Promise(resolve => this.resolveInitialized = resolve);

    this.valueChangeCallback =
        this.reference.on('value', dataSnapshot => this.remoteStateChanged(dataSnapshot));
  }

  dispose() {
    this.reference.off('value', this.valueChangeCallback);
  }

  backingType() {
    return this.type;
  }

  async remoteStateChanged(dataSnapshot: firebase.database.DataSnapshot) {
    if (this.localModified) {
      return;
    }
    const data = dataSnapshot.val();
    assert(this._version == null || data.version > this._version);

    // NOTE that remoteStateChanged will be invoked immediately by the
    // this.reference.on(...) call in the constructor; this means that it's possible for this
    // function to receive data with storageKeys before referenceMode has been switched on (as
    // that happens after the constructor has completed). This doesn't matter as data can't
    // be accessed until the constructor's returned (nothing has a handle on the object before
    // that).

    this.value = data.value || null;
    this._version = data.version;

    this.resolveInitialized();
    // Firebase doesn't maintain a distinction between null and undefined, but we explicitly
    // require empty variables to store 'null'.
    if (this.referenceMode && this.value) {
      const version = this._version;
      await this.ensureBackingStore().then(async store => {
        const data = await store.fetchAll(this.value.id);
        await this._fire(new ChangeEvent({data, version}));
      });
    } else {
      await this._fire(new ChangeEvent({data: data.value || null, version: this._version}));
    }
  }

  get _hasLocalChanges() {
    return this.localModified;
  }

  async _persistChangesImpl(): Promise<void> {
    assert(this.localModified);
    // Guard the specific version that we're writing. If we receive another
    // local mutation, these versions will be different when the transaction
    // completes indicating that we need to continue the process of sending
    // local modifications.
    const version = this._version;

    // the await required for fetching baseStorage can cause initialization/localModified
    // flag reordering if done before persisting a change.
    const value = this.value;

    // We have to write the underlying storage before the local value, or it won't be present
    // when another connected storage object gets the update of the local value.
    if (this.referenceMode && this.pendingWrites.length > 0) {
      await this.ensureBackingStore();

      // TODO(shans): mutating the storageKey here to provide unique keys is a hack
      // that can be removed once entity mutation is distinct from collection updates.
      // Once entity mutation exists, it shouldn't ever be possible to write
      // different values with the same id.
      const pendingWrites = this.pendingWrites.slice();
      this.pendingWrites = [];
      await Promise.all(pendingWrites.map(pendingItem => this.backingStore.store(pendingItem.value, [this.storageKey + this.localKeyId++])));
    }

    const result = await this._transaction(data => {
      assert(this._version >= version);
      return {
        version: Math.max(data.version + 1, version),
        value,
        referenceMode: this.referenceMode
      };
    });
    assert(result.committed, 'uncommitted transaction (offline?) not supported yet');
    const data = result.snapshot.val();
    assert(data !== 0);
    assert(data.version >= version);

    if (this._version !== version) {
      // A new local modification happened while we were writing the previous one.
      return this._persistChangesImpl();
    }

    this.localModified = false;
    this._version = data.version;
    // Firebase will return 'undefined' when data is set to null, but should
    this.value = data.value || null;

  }

  get versionForTesting() {
    return this._version;
  }

  async fetch() {
    await this.initialized;
    if (this.referenceMode && this.value) {
      const referredType = this.type;
      await this.ensureBackingStore();
      return await this.backingStore.fetchAll(this.value.id);
    }
    return this.value;
  }

  async set(value, originatorId=null, barrier=null) {
    assert(value !== undefined);
    if (this._version == null) {
      assert(!this.localModified);
      // If the first modification happens before init, this becomes
      // init. We pick the initial version which will be updated by the
      // transaction in _persistChanges.
      this._version = 0;
      this.resolveInitialized();
    } else if (!this.referenceMode) {
      // If in reference mode, we can't actually determine if this value is identical to the previous
      // one.
      if (JSON.stringify(this.value) === JSON.stringify(value)) {
         return;
      }
    }

    this._version++;
    const version = this._version;
    let storageKey;
    if (this.referenceMode && value) {
      storageKey = this.storageEngine.baseStorageKey(this.type, this.storageKey);
      this.value = {id: value.id, storageKey};
      this.pendingWrites.push({value, storageKey});
    } else {
      this.value = value;
    }
    this.localModified = true;

    await this._persistChanges();

    await this._fire(new ChangeEvent({data: value, version, originatorId, barrier}));
  }

  async clear(originatorId:string = null, barrier: string = null) {
    return this.set(null, originatorId, barrier);
  }

  async cloneFrom(handle): Promise<void> {
    this.referenceMode = handle.referenceMode;
    const literal = await handle.serializeContents();
    const data = literal.model[0].value;
    if (this.referenceMode && literal.model.length > 0) {
      await Promise.all([this.ensureBackingStore(), handle.ensureBackingStore()]);
      literal.model = literal.model.map(({id, value}) => ({id, value: {id, storageKey: this.backingStore.storageKey}}));
      const underlying = await handle.backingStore.getMultiple(literal.model.map(({id}) => id));
      await this.backingStore.storeMultiple(underlying, [this.storageKey]);
    }
    this.fromLiteral(literal);
    this.localModified = true;
    this.resolveInitialized();
    // TODO: do we need to fire an event here?
    await this._fire(new ChangeEvent({data: this.referenceMode ? data : this.value, version: this._version}));
    await this._persistChanges();
  }

  async modelForSynchronization() {
    await this.initialized;
    if (this.value && !this.referenceMode) {
      assert((this.value as {storageKey: string}).storageKey == undefined, `values in non-referenceMode stores shouldn't have storageKeys. This store is ${this.storageKey}`);
    }
    if (this.referenceMode && this.value !== null) {
      const value = this.value as {id: string, storageKey: string};

      await this.ensureBackingStore();
      const result = await this.backingStore.fetchAll(value.id);
      return {
        version: this._version,
        model: [{id: value.id, value: result}]
      };
    }

    return super.modelForSynchronization();
  }

  async serializeContents(): Promise<{version: number, model: SerializedModelEntry[]}> {
    await this.initialized;
    // fixme: think about if there are local mutations...
    const value = this.value;
    // TODO: what should keys be set to?
    const model = (value == null) ? [] : [{id: value.id, value, keys: []}];

    return {version: this._version, model};
  }

  private fromLiteral({version, model}) {
    const value = model.length === 0 ? null : model[0].value;
    assert(value !== undefined);
    assert(this.referenceMode || !value.storageKey);
    this.value = value;
    this._version = version;
  }
}


/**
 * Models a Collection that is persisted to firebase in scheme similar
 * to the CRDT OR-set. We don't model sets of both observed
 * and removed keys but instead we maintain a list of current keys and
 * add/remove as the corresponding operations are received. We're
 * able to do this as we only ever synchronize between the same two points
 * (the client & firebase).
 *
 * Initialization: The collection is not initialized and calls to read
 * and mutate the collection will not complete until the initial state
 * is received via the firebase `.on` subscription.
 * Note, this is different to FirebaseVariable as mutations do not cause
 * the collection to become initialized (since we do not have enough state
 * to generate events).
 *
 * Updates from firebase: Each time an update is received from firebase
 * we compare the new remote state with the previous remote state. We are
 * able to detect which entries (and the corresponding keys) that have been
 * added and removed remotely. These are filtered by a set of suppressions
 * for adds that we have previously issued and then applied to our local
 * model. Each time we receive an update from firebase, we update our local
 * version number. We align it with the remote version when possible.
 *
 * Local modifications: Additions and removal of entries (and membership
 * keys) are tracked in a local structure, `localChanges`, and a process
 * is started to persist remotely. These changes are applied to the remote
 * state and committed atomically. Any added keys are added to sets in
 * `addSuppressions` to prevent applying our own writes when they
 * are received back in a subsequent update from firebase. Each time we
 * receive a local modification we increment our local version number.
 * When we persist our changes to firebase we align it with the remote
 * version.
 */
class FirebaseCollection extends FirebaseStorageProvider implements CollectionStorageProvider {
  private localChanges: Map<string, {add: string[], remove: string[]}>;
  private addSuppressions: Map<string, {keys: Set<string>, barrierVersion: number}>;
  private model: CrdtCollectionModel;
  private remoteState: {items: Dictionary<{value: {}, keys: Dictionary<null>}>};
  private readonly initialized: Promise<void>;
  private pendingWrites: {value: {}, storageKey: string}[] = [];
  private resolveInitialized: Runnable;
  private localKeyId = Date.now();
  private readonly valueChangeCallback: (dataSnapshot: firebase.database.DataSnapshot, s?: string) => void;

  constructor(type, storageEngine, id, reference, firebaseKey) {
    super(type, storageEngine, id, reference, firebaseKey);

    // Lists mapped by id containing membership keys that have been
    // added or removed by local modifications. Entries in this
    // structure are still pending persistance remotely. Empty
    // when there are no pending local modifications.
    // id => {add: [key], remove: [key]}
    this.localChanges = new Map();

    // Sets mapped by id containing keys that were added locally
    // and have been persisted to firebase. Entries here must be
    // suppressed when they are echoed back as updates from firebase.
    // They can be removed once the state received from firebase
    // reaches `barrierVersion`.
    // id => {keys: Set[key], barrierVersion}
    this.addSuppressions = new Map();

    // Local model of entries stored in this collection. Updated
    // by local modifications and when we receive remote updates
    // from firebase.
    this.model = new CrdtCollectionModel();

    // Monotonic version. Updated each time we receive an update
    // from firebase, or when a local modification is applied.
    this._version = null;

    // The last copy of the serialized state received from firebase.
    // {items: id => {value, keys: {[key]: null}}}
    this.remoteState = {items: {}};

    // Whether our model has been initialized after receiving the first
    // copy of state from firebase.
    this.initialized = new Promise(resolve => this.resolveInitialized = resolve);

    this.valueChangeCallback =
        this.reference.on('value', dataSnapshot => this.remoteStateChanged(dataSnapshot));
  }

  dispose() {
    this.reference.off('value', this.valueChangeCallback);
  }

  backingType() {
    return this.type.getContainedType();
  }

  async remoteStateChanged(dataSnapshot) {
    const newRemoteState = dataSnapshot.val();
    if (!newRemoteState.items) {
      // This is the inital remote state, where we have only {version: 0}
      // fixme: assert this.
      newRemoteState.items = {};
    }

    // [{id, value, keys}]
    const add = [];
    // [{id, keys}]
    const remove = [];

    const encIds = new Set([
      ...Object.keys(newRemoteState.items),
      ...Object.keys(this.remoteState.items),
    ]);


    // Diff the old state (this.remoteState) with the new state (newRemoteState) to determine
    // which keys have been added/removed.
    for (const encId of encIds) {
      const id = FirebaseStorage.decodeKey(encId);
      const suppression = this.addSuppressions.get(id);
      if (encId in newRemoteState.items) {
        let {keys: encKeys, value} = newRemoteState.items[encId];
        encKeys = Object.keys(encKeys);
        if (encId in this.remoteState.items) {
          // 1. possibly updated remotely.
          const encOldkeys = Object.keys(this.remoteState.items[encId].keys);
          const {add: encAddKeys, remove: encRemoveKeys} = setDiff(encOldkeys, encKeys);
          let addKeys = encAddKeys.map(FirebaseStorage.decodeKey);
          const removeKeys = encRemoveKeys.map(FirebaseStorage.decodeKey);
          if (suppression) {
            addKeys = addKeys.filter(key => !suppression.keys.has(key));
          }
          if (addKeys.length) {
            // If there's a local add for this id, retain the existing value,
            // to preserve the legacy behavior of updating in place.
            if (this.localChanges.has(id) && this.localChanges.get(id).add.length > 0 && this.model.has(id)) {
              value = this.model.getValue(id);
            }
            const effective = this.model.add(id, value, addKeys);
            if (effective) {
              add.push({value, keys: addKeys, effective});
            }
          }
          if (removeKeys.length) {
            const value = this.model.getValue(id);
            const effective = this.model.remove(id, removeKeys);
            if (effective) {
              remove.push({value, keys: removeKeys, effective});
            }
          }
        } else {
          // 2. added remotely.
          let addKeys = encKeys.map(FirebaseStorage.decodeKey);
          if (suppression) {
            // Remove any keys that *we* added previously.
            addKeys = addKeys.filter(key => !suppression.keys.has(key));
          }
          if (addKeys.length) {
            // If there's a local add for this id, retain the existing value,
            // to preserve the legacy behavior of updating in place.
            if (this.localChanges.has(id) && this.localChanges.get(id).add.length > 0 && this.model.has(id)) {
              value = this.model.getValue(id);
            }
            const keys = encKeys.map(FirebaseStorage.decodeKey);
            const effective = this.model.add(id, value, keys);
            if (effective) {
              add.push({value, keys, effective});
            }
          }
        }
      } else {
        // 3. Removed remotely.
        const {keys: encKeys, value} = this.remoteState.items[encId];
        const encKeysList = Object.keys(encKeys);
        const keys = encKeysList.map(FirebaseStorage.decodeKey);
        const effective = this.model.remove(id, keys);
        if (effective) {
          remove.push({value, keys, effective});
        }
      }
    }

    // Clean up any suppressions that have reached the barrier version.
    for (const [id, {barrierVersion}] of this.addSuppressions.entries()) {
      if (newRemoteState.version >= barrierVersion) {
        this.addSuppressions.delete(id);
      }
    }

    if (add.length === 0 && remove.length === 0) {
      // The update had no effect.
      this.resolveInitialized();
      return;
    }

    // Bump version monotonically. Ideally we would use the remote
    // version, but we might not be able to if there have been local
    // modifications in the meantime. We'll recover the remote version
    // once we persist those.
    this._version = Math.max(this._version + 1, newRemoteState.version);
    this.remoteState = newRemoteState;
    this.resolveInitialized();

    if (this.referenceMode) {
      const ids = add.map(({value}) => value.id).concat(remove.map(({value}) => value.id));
      await this.ensureBackingStore().then(async backingStore => {
        const values = await backingStore.getMultiple(ids);
        const valueMap = {};
        values.forEach(value => valueMap[value.id] = value);
        const addPrimitives = add.map(({value, keys, effective}) => ({value: valueMap[value.id], keys, effective}));
        const removePrimitives = remove.map(({value, keys, effective}) => ({value: valueMap[value.id], keys, effective}));
        await this._fire(new ChangeEvent({add: addPrimitives, remove: removePrimitives, version: this._version}));
      });

    } else {
      await this._fire(new ChangeEvent({add, remove, version: this._version}));
    }
  }

  get versionForTesting() {
    return this._version;
  }

  async fetchAll(id: string) {
    await this.initialized;
    if (this.referenceMode) {
      const ref = this.model.getValue(id);
      if (ref == null) {
        return null;
      }
      await this.ensureBackingStore();
      return await this.backingStore.fetchAll(ref.id);
    }
    return this.model.getValue(id);
  }

  async removeMultiple(items, originatorId=null) {
    await this.initialized;
    if (items.length === 0) {
      items = this.model.toList().map(item => ({id: item.id, keys: []}));
    }
    items.forEach(item => {
      // 1. Apply the change to the local model.
      item.value = this.model.getValue(item.id);
      if (item.value === null) {
        return;
      }
      if (item.keys.length === 0) {
        item.keys = this.model.getKeys(item.id);
      }

      // TODO: These keys might already have been removed (concurrently).
      // We should exit early in that case.
      item.effective = this.model.remove(item.id, item.keys);
    });
    this._version++;

    // 2. Notify listeners.
    items = items.filter(item => item.value);
    await this._fire(new ChangeEvent({remove: items, version: this._version, originatorId}));

    // 3. Add this modification to the set of local changes that need to be persisted.
    items.forEach(item => {
      if (!this.localChanges.has(item.id)) {
        this.localChanges.set(item.id, {add: [], remove: []});
      }
      const localChange = this.localChanges.get(item.id);
      for (const key of item.keys) {
        localChange.remove.push(key);
      }
    });

    // 4. Wait for the changes to persist.
    await this._persistChanges();
  }

  async remove(id: string, keys: string[] = [], originatorId=null) {
    await this.initialized;

    // 1. Apply the change to the local model.
    const value = this.model.getValue(id);
    if (value === null) {
      return;
    }
    if (keys.length === 0) {
      keys = this.model.getKeys(id);
    }

    // TODO: These keys might already have been removed (concurrently).
    // We should exit early in that case.
    const effective = this.model.remove(id, keys);
    this._version++;

    // 2. Notify listeners.
    await this._fire(new ChangeEvent({remove: [{value, keys, effective}], version: this._version, originatorId}));

    // 3. Add this modification to the set of local changes that need to be persisted.
    if (!this.localChanges.has(id)) {
      this.localChanges.set(id, {add: [], remove: []});
    }
    const localChange = this.localChanges.get(id);
    for (const key of keys) {
      localChange.remove.push(key);
    }

    // 4. Wait for the changes to persist.
    await this._persistChanges();
  }

  async store(value, keys, originatorId=null) {
    assert(keys != null && keys.length > 0, 'keys required');
    await this.initialized;
    const id = value.id;
    let effective;
    // 1. Apply the change to the local model.
    if (this.referenceMode) {
      const referredType = this.type.getContainedType();
      const storageKey = this.storageEngine.baseStorageKey(referredType, this.storageKey);
      effective = this.model.add(id, {id, storageKey}, keys);
      this._version++;
      this.pendingWrites.push({value, storageKey});
    } else {
      effective = this.model.add(id, value, keys);
      this._version++;
    }

    // 2. Notify listeners.
    await this._fire(new ChangeEvent({add: [{value, keys, effective}], version: this._version, originatorId}));

    // 3. Add this modification to the set of local changes that need to be persisted.
    if (!this.localChanges.has(id)) {
      this.localChanges.set(id, {add: [], remove: []});
    }
    const localChange = this.localChanges.get(id);
    for (const key of keys) {
      localChange.add.push(key);
    }


    // 4. Wait for persistence to complete.
    await this._persistChanges();
  }

  get _hasLocalChanges() {
    return this.localChanges.size > 0 || this.pendingWrites.length > 0;
  }

  async _persistChangesImpl(): Promise<void> {
    if (this.pendingWrites.length > 0) {
      await this.ensureBackingStore();
      assert(this.backingStore);
      const pendingWrites = this.pendingWrites.slice();
      this.pendingWrites = [];

      // TODO(shans): mutating the storageKey here to provide unique keys is a hack
      // that can be removed once entity mutation is distinct from collection updates.
      // Once entity mutation exists, it shouldn't ever be possible to write
      // different values with the same id.
      await Promise.all(pendingWrites.map(pendingItem => this.backingStore.store(pendingItem.value, [this.storageKey + this.localKeyId++])));

      // TODO(shans): Returning here prevents us from writing localChanges while there
      // are pendingWrites. This in turn prevents change events for being generated for
      // localChanges that have outstanding pendingWrites.
      // A better approach would be to tie pendingWrites more closely to localChanges.
      return;
    }

    if (this.localChanges.size > 0) {

      // Record the changes that are persisted by the transaction.
      let changesPersisted;
      const result = await this._transaction(data => {
        // Updating the inital state with no items.
        if (!data.items) {
          // Ideally we would be able to assert that version is 0 here.
          // However it seems firebase will remove an empty object.
          data.items = {};
        }
        data.version = Math.max(data.version + 1, this._version);
        // Record the changes that we're attempting to write. We'll remove
        // these from this.localChanges if this transaction commits.
        changesPersisted = new Map();
        for (let [id, {add, remove}] of this.localChanges.entries()) {
          const encId = FirebaseStorage.encodeKey(id);
          changesPersisted.set(id, {add: [...add], remove: [...remove]});
          // Don't add keys that we have also removed.
          add = add.filter(key => !(remove.indexOf(key) >= 0));
          const item = data.items[encId] || {value: null, keys: {}};
          // Propagate keys added locally.
          for (const key of add) {
            const encKey = FirebaseStorage.encodeKey(key);
            item.keys[encKey] = data.version;
          }
          // Remove keys removed locally.
          for (const key of remove) {
            const encKey = FirebaseStorage.encodeKey(key);
            delete item.keys[encKey];
          }
          // If we've added a key, also propagate the value. (legacy mutation).
          if (add.length > 0) {
            assert(this.model.has(id));
            item.value = this.model.getValue(id);
          }
          const keys = Object.keys(item.keys);
          if (keys.length > 0) {
            data.items[encId] = item;
          } else {
            // Remove the entry entirely if there are no keys left.
            delete data.items[encId];
          }
        }
        data.referenceMode = this.referenceMode;
        return data;
      });

      // We're assuming that firebase won't deliver updates between the
      // transaction committing and the result promise resolving :/

      assert(result.committed);
      const data = result.snapshot.val();

      // While we were persisting changes, we may have received new ones.
      // We remove any changes that were just persisted, `changesPersisted`
      // from `this.localChanges`.
      for (let [id, {add, remove}] of changesPersisted.entries()) {
        add = new Set(add);
        remove = new Set(remove);
        const localChange = this.localChanges.get(id);
        localChange.add = localChange.add.filter(key => !add.has(key));
        localChange.remove = localChange.remove.filter(key => !remove.has(key));
        if (localChange.add.length === 0 && localChange.remove.length === 0) {
          this.localChanges.delete(id);
        }
        // Record details about keys added, so that we can suppress them
        // when echoed back in an update from firebase.
        if (this.addSuppressions.has(id)) {
          // If we already have a suppression, we augment it and bump the
          // barrier version.
          const suppression = this.addSuppressions.get(id);
          for (const key of add) {
            suppression.keys.add(key);
          }
          suppression.barrierVersion = data.version;
        } else {
          this.addSuppressions.set(id, {
            keys: add,
            barrierVersion: data.version,
          });
        }
      }
    }
  }

  async _toList(): Promise<SerializedModelEntry[]> {
    await this.initialized;
    if (this.referenceMode) {
      const items = (await this.serializeContents()).model;
      if (items.length === 0) {
        return [];
      }
      const referredType = this.type.getContainedType();

      const refSet = new Set();

      items.forEach(item => refSet.add(item.value.storageKey));
      assert(refSet.size === 1);
      const ref = refSet.values().next().value;

      await this.ensureBackingStore();
      const retrieveItem = async item => {
        const ref = item.value;
        return {id: ref.id, value: await this.backingStore.fetchAll(ref.id), keys: item.keys};
      };

      return await Promise.all(items.map(retrieveItem));
    }
    return (await this.serializeContents()).model;
  }

  async modelForSynchronization() {
    const model = await this._toList();
    return {version: this._version, model};
  }

  async toList(): Promise<ModelValue[]> {
    return (await this._toList()).map(item => item.value);
  }

  async getMultiple(ids: string[]) {
    assert(!this.referenceMode, 'getMultiple not implemented for referenceMode stores');
    await this.initialized;
    return ids.map(id => this.model.getValue(id));
  }

  async storeMultiple(values, keys: string[], originatorId=null): Promise<void> {
    assert(!this.referenceMode, 'storeMultiple not implemented for referenceMode stores');
    values.map(value => {
      this.model.add(value.id, value, keys);
      if (!this.localChanges.has(value.id)) {
        this.localChanges.set(value.id, {add: [], remove: []});
      }
      const localChanges = this.localChanges.get(value.id);
      for (const key of keys) {
        localChanges.add.push(key);
      }
    });
    await this._persistChanges();
  }

  async cloneFrom(handle): Promise<void> {
    this.referenceMode = handle.referenceMode;
    const literal = await handle.serializeContents();
    if (this.referenceMode && literal.model.length > 0) {
      await Promise.all([this.ensureBackingStore(), handle.ensureBackingStore()]);
      if (this.backingStore !== handle.backingStore) {
        literal.model = literal.model.map(({id, value}) => ({id, value: {id: value.id, storageKey: this.backingStore.storageKey}}));
        const underlying = await handle.backingStore.getMultiple(literal.model.map(({id}) => id));
        await this.backingStore.storeMultiple(underlying, [this.storageKey]);
      }
    }
    this.fromLiteral(literal);
    // Don't notify about the contents that have just been cloned.
    // However, do record local changes for persistence.
    for (const item of this.model.toLiteral()) {
      assert(item.value.id !== undefined);
      this.localChanges.set(item.value.id, {add: [...item.keys], remove: []});
    }

    await this._persistChanges();
  }

  async serializeContents(): Promise<{version: number, model: SerializedModelEntry[]}> {
    await this.initialized;
    // TODO: think about what to do here, do we really need toLiteral for a firebase store?
    // if yes, how should it represent local modifications?
    await this.persisting;
    return {
      version: this._version,
      model: this.model.toLiteral(),
    };
  }

  private fromLiteral({version, model}) {
    this._version = version;
    this.model = new CrdtCollectionModel(model);
  }
}


enum CursorState {new, init, stream, removed, done}

/**
 * FirebaseCursor provides paginated reads over the contents of a BigCollection, locked to the
 * version of the collection at which the cursor was created.
 *
 * This class technically conforms to the iterator protocol but is not marked as iterable because
 * next() is async, which is currently not supported by implicit iteration in Javascript.
 *
 * NOTE: entity mutation removes elements from a streamed read; the entity will be updated with an
 * index past the cursor's end but Firebase doesn't issue a child_removed event for it.
 */
class FirebaseCursor {
  private orderByIndex: firebase.database.Query;
  private readonly pageSize: number;
  private readonly forward: boolean;
  private state: CursorState;
  private removed: {}[];
  private baseQuery: firebase.database.Query|null;
  private nextBoundary: string|null;
  private end: number|null;
  private removedFn: ((removed: firebase.database.DataSnapshot) => void) | null;

  constructor(reference, pageSize, forward) {
    this.orderByIndex = reference.child('items').orderByChild('index');
    this.pageSize = pageSize;
    this.forward = forward;
    this.state = CursorState.new;
    this.removed = [];
    this.baseQuery = null;
    this.nextBoundary = null;
    this.end = null;
    this.removedFn = null;
  }

  // This must be called exactly once after construction and before any other methods are called.
  async _init() {
    assert(this.state === CursorState.new);

    // Retrieve the current last item to establish our streaming version.
    const lastEntry = await this.orderByIndex.limitToLast(1).once('value');
    lastEntry.forEach(entry => this.end = entry.val().index);

    // Read one past the page size each time to establish the boundary index for the next page.
    this.baseQuery = this.forward
        ? this.orderByIndex.limitToFirst(this.pageSize + 1)
        : this.orderByIndex.limitToLast(this.pageSize + 1);

    // Attach a listener for removed items and capture any that occur ahead of our streaming
    // frame. These will be returned after the cursor reaches the item at this.end.
    this.removedFn = this.orderByIndex.on('child_removed', snapshot => {
      const index = snapshot.val().index;
      if (index > this.end) return;
      if (this.nextBoundary === null || (this.forward && index >= this.nextBoundary)
                                     || (!this.forward && index <= this.nextBoundary)) {
        this.removed.push(snapshot.val().value);
      }
    });
    this.state = CursorState.init;
  }

  // Returns the BigCollection version at which this cursor is reading.
  get version(): number {
    return this.end;
  }

  // Returns {value: [items], done: false} while there are items still available, or {done: true}
  // when the cursor has completed reading the collection.
  async next() {
    assert(this.state !== CursorState.new);

    if (this.state === CursorState.done) {
      return {done: true};
    }

    let query: firebase.database.Query;
    if (this.state === CursorState.init) {
      query = this.baseQuery.endAt(this.end);
      this.state = CursorState.stream;
    } else if (this.state === CursorState.stream) {
      assert(this.nextBoundary !== null);
      query = this.forward
          ? this.baseQuery.startAt(this.nextBoundary).endAt(this.end)
          : this.baseQuery.endAt(this.nextBoundary);
    }

    const value = [];
    if (this.state === CursorState.stream) {
      this.nextBoundary = null;
      const queryResults = await query.once('value');
      if (this.forward) {
        // For non-final pages, the last entry is the start of the next page.
        queryResults.forEach(entry => {
          if (value.length < this.pageSize) {
            value.push(entry.val().value);
          } else {
            this.nextBoundary = entry.val().index;
          }
        });
      } else {
        // For non-final pages, the first entry is the end of the next page.
        let startIndex = null;
        queryResults.forEach(entry => {
          value.push(entry.val().value);
          if (startIndex === null) {
            startIndex = entry.val().index;
          }
        });
        if (value.length > this.pageSize) {
          value.shift();
          this.nextBoundary = startIndex;
        }
        value.reverse();
      }
      if (this.nextBoundary === null) {
        this._detach();
        this.state = CursorState.removed;
      }
    }

    if (this.state === CursorState.removed) {
      while (this.removed.length && value.length < this.pageSize) {
        value.push(this.removed.pop());
      }
      if (this.removed.length === 0) {
        this.state = CursorState.done;
      }
    }
    assert(value.length > 0);
    return {value, done: false};
  }

  // Terminates the streamed read. This must be called if a cursor is no longer needed but has not
  // yet completed streaming (i.e. next() hasn't returned {done: true}).
  close() {
    this._detach();
    this.state = CursorState.done;
  }

  _detach() {
    if (this.removedFn) {
      this.orderByIndex.off('child_removed', this.removedFn);
      this.removedFn = null;
    }
  }
}

/**
 * Provides access to large collections without pulling the entire contents locally.
 *
 * get(), store() and remove() all call immediately through to the backing Firebase collection.
 * There is currently no option for bulk instantiations of these methods.
 *
 * The full collection can be read via a paginated FirebaseCursor returned by stream(). This views
 * a snapshot of the collection, locked to the version at which the cursor is created.
 *
 * To get pagination working, we need to add an index field to items as they are stored, and that
 * field must be marked for indexing in the Firebase rules:
 *
 * ```
 *    "rules": {
 *      "<storage-root>": {
 *        "$collection": {
 *          "items": {
 *            ".indexOn": ["index"]
 *          }
 *        }
 *      }
 *    }
 * ```
 */
class FirebaseBigCollection extends FirebaseStorageProvider implements BigCollectionStorageProvider {
  private cursors: Map<number, FirebaseCursor>;
  private cursorIndex: number;

  constructor(type, storageEngine, id, reference, firebaseKey) {
    super(type, storageEngine, id, reference, firebaseKey);
    this.cursors = new Map();
    this.cursorIndex = 0;
  }

  backingType() {
    return this.type.getContainedType();
  }

  enableReferenceMode() {
    assert(false, 'referenceMode is not supported for BigCollection');
  }

  // TODO: rename this to avoid clashing with Singleton and allow particles some way to specify the id
  async fetchAll(id: string) {
    const encId = FirebaseStorage.encodeKey(id);
    const snapshot = await this.reference.child('items/' + encId).once('value');
    return (snapshot.val() !== null) ? snapshot.val().value : null;
  }

  // originatorId is included to maintain parity with Collection.store but is not used.
  async store(value, keys: string[], originatorId?: string) {
    // Technically we don't really need keys here; Firebase provides the central replicated storage
    // protocol and the mutating ops here are all pass-through (so no local CRDT management is
    // required). This may change in the future - we may well move to full CRDT support in the
    // backing stores - so it's best to keep the API in line with regular Collections.
    assert(keys != null && keys.length > 0, 'keys required');

    // Firebase does not support multi-location transactions. To modify both 'version' and a child
    // of 'items', we'd need to transact directly on this.reference, which would pull the entire
    // collection contents locally, avoiding which is the explicit intent of this class. So we have
    // to double-step the operation, leaving a small window where another reader could see the new
    // version but not the added/updated item, which actually isn't much of a problem. Concurrent
    // store ops from different clients will work fine thanks to transaction(); both will correctly
    // increment the version regardless of the order in which they occur.
    let version;
    await this.reference.child('version').transaction(data => {
      version = (data || 0) + 1;
      return version;
    }, undefined, false);

    const encId = FirebaseStorage.encodeKey(value.id);
    await this.reference.child('items/' + encId).transaction(data => {
      if (data === null) {
        data = {value, keys: {}};
      } else {
        // Allow legacy mutation for now.
        data.value = value;
      }
      for (const key of keys) {
        const encKey = FirebaseStorage.encodeKey(key);
        data.keys[encKey] = version;
      }

      // If we ever have bulk additions for BigCollection, the index will need to be changed to an
      // encoded string with version as the 'major' component and an index within the bulk add as
      // the 'minor' component:
      //   width = Math.ceil(Math.log(batchSize) / Math.log(36))
      //   version.toString(36).padStart(6, '0') + '.' + itemIndex.toString(36).padStart(width, '0')
      data.index = version;
      return data;
    }, undefined, false);
  }

  // keys and originatorId are included to maintain parity with Collection.remove but are not used.
  async remove(id: string, keys: string[], originatorId?: string) {
    await this.reference.child('version').transaction(data => {
      return (data || 0) + 1;
    }, undefined, false);

    const encId = FirebaseStorage.encodeKey(id);
    await this.reference.child('items/' + encId).remove();
  }

  /**
   * Returns a FirebaseCursor id for paginated reads of the current version of this BigCollection.
   * The id should be passed to cursorNext() to retrive the contained entities. The cursor itself
   * is held internally by this collection so we can discard it once the stream read has completed.
   *
   * By default items are returned in order of original insertion into the collection (with the
   * caveat that items removed during a streamed read may be returned at the end). Set forward to
   * false to return items in reverse insertion order.
   */
  async stream(pageSize: number, forward = true) {
    assert(!isNaN(pageSize) && pageSize > 0);
    this.cursorIndex++;
    const cursor = new FirebaseCursor(this.reference, pageSize, forward);
    await cursor._init();
    this.cursors.set(this.cursorIndex, cursor);
    return this.cursorIndex;
  }

  /**
   * Calls next() on the cursor identified by cursorId. The cursor will be discarded once the end
   * of the stream has been reached.
   */
  async cursorNext(cursorId: number) {
    const cursor = this.cursors.get(cursorId);
    if (!cursor) {
      return {done: true};
    }
    const data = await cursor.next();
    if (data.done) {
      this.cursors.delete(cursorId);
    }
    return data;
  }

  /** Calls close() on and discards the cursor identified by cursorId. */
  cursorClose(cursorId: number): void {
    const cursor = this.cursors.get(cursorId);
    if (cursor) {
      this.cursors.delete(cursorId);
      cursor.close();
    }
  }

  /**
   * Returns the version at which the cursor identified by cursorId is reading.
   */
  cursorVersion(cursorId: number) {
    const cursor = this.cursors.get(cursorId);
    return cursor ? cursor.version : null;
  }

  async _persistChangesImpl(): Promise<void> {
    throw new Error('FireBaseBigCollection does not implement _persistChangesImpl');
  }

  get _hasLocalChanges(): boolean {
    return false;
  }

  // TODO: cloneFrom, toLiteral, fromLiteral
  // A cloned instance will probably need to reference the same Firebase URL but collect all
  // modifications locally for speculative execution.

  async cloneFrom(handle): Promise<void> {
    throw new Error('FirebaseBigCollection does not yet implement cloneFrom');
  }

  async serializeContents(): Promise<{version: number, model: SerializedModelEntry[]}> {
    throw new Error('FirebaseBigCollection does not yet implement toLiteral');
  }

  private fromLiteral({version, model}) {
    throw new Error('FirebaseBigCollection does not yet implement fromLiteral');
  }

  clearItemsForTesting() {
    throw new Error('unimplemented');
  }
}

/**
 * Thin wrapper providing a Collection API for a Firebase reference. This is used by
 * FirebaseVariable and FirebaseCollection to access their underlying backing store
 * collections without pulling the entirety of those collections locally.
 */
class FirebaseBackingStore extends FirebaseStorageProvider implements CollectionStorageProvider {
  public maxConcurrentRequests = 5;

  private childRef(id) {
    return this.reference.child('items/' + FirebaseStorage.encodeKey(id));
  }

  async store(value, keys: string[]) {
    await this.storeSingle(value, keys);
  }

  async storeMultiple(values, keys: string[]): Promise<void> {
    while (values.length > 0) {
      const chunk = values.splice(0, this.maxConcurrentRequests);
      await Promise.all(chunk.map(value => this.storeSingle(value, keys)));
    }
  }

  private async storeSingle(value, keys: string[]) {
    return this.childRef(value.id).transaction(data => {
      if (data === null) {
        data = {value, keys: {}};
      } else {
        // Allow legacy mutation for now.
        data.value = value;
      }
      for (const key of keys) {
        const encKey = FirebaseStorage.encodeKey(key);
        data.keys[encKey] = 1;
      }
      return data;
    }, undefined, false);
  }

  async remove(id: string, keys: string[]) {
    await this.removeSingle(id, keys);
  }

  async removeMultiple(items) {
    if (items.length === 0) {
      await this.reference.child('items').remove();
    } else {
      while (items.length > 0) {
        const chunk = items.splice(0, this.maxConcurrentRequests);
        await Promise.all(chunk.map(item => this.removeSingle(item.id, item.keys)));
      }
    }
  }

  private async removeSingle(id: string, keys: string[]) {
    return this.childRef(id).transaction(data => {
      if (data === null) {
        return null;
      }
      if (keys.length > 0) {
        keys.forEach(key => delete data.keys[FirebaseStorage.encodeKey(key)]);
        if (Object.keys(data.keys).length > 0) {
          return data;
        }
      }
      // Returning an empty object deletes the Firebase node.
      return {};
    }, undefined, false);
  }

  async fetchAll(id: string) {
    const snapshot = await this.childRef(id).once('value');
    return (snapshot.val() !== null) ? snapshot.val().value : null;
  }

  async getMultiple(ids: string[]) {
    const values = [];
    while (ids.length > 0) {
      const chunk = ids.splice(0, this.maxConcurrentRequests);
      const snapshots = await Promise.all(chunk.map(id => this.childRef(id).once('value')));
      values.push(...snapshots.map(s => (s.val() !== null) ? s.val().value : null));
    }
    return values;
  }

  async toList() {
    const snapshot = await this.reference.child('items').once('value');
    // tslint:disable-next-line: no-any
    return snapshot.val() ? Object.values(snapshot.val()).map((x: any) => x.value) : [];
  }

  backingType() {
    return this.type;
  }

  get _hasLocalChanges() {
    return false;
  }

  async _persistChangesImpl() {
    throw new Error('FirebaseBackingStore does not implement _persistChangesImpl');
  }

  enableReferenceMode() {
    throw new Error('FirebaseBackingStore does not implement enableReferenceMode');
  }

  async ensureBackingStore(): Promise<FirebaseBackingStore> {
    throw new Error('FirebaseBackingStore does not implement ensureBackingStore');
  }

  on(callback): number {
    throw new Error('FirebaseBackingStore does not implement on');
  }

  off(callback) {
    throw new Error('FirebaseBackingStore does not implement off');
  }

  async serializeContents(): Promise<{version: number, model: SerializedModelEntry[]}> {
    throw new Error('FirebaseBackingStore does not implement toLiteral');
  }

  async cloneFrom(store: StorageProviderBase): Promise<void> {
    throw new Error('FirebaseBackingStore does not implement cloneFrom');
  }
}
