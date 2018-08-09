// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {StorageProviderBase} from './storage-provider-base.js';
import {firebase} from '../../platform/firebase-web.js';
import {assert} from '../../platform/assert-web.js';
import {KeyBase} from './key-base.js';
import {atob} from '../../platform/atob-web.js';
import {btoa} from '../../platform/btoa-web.js';
import {CrdtCollectionModel} from './crdt-collection-model.js';

export async function resetStorageForTesting(key) {
  key = new FirebaseKey(key);
  let app = firebase.initializeApp({
    apiKey: key.apiKey,
    databaseURL: key.databaseUrl
  });

  let reference = firebase.database(app).ref(key.location);
  await new Promise(resolve => {
    reference.remove(resolve);
  });

  reference = firebase.database(app).ref('backingStores');
  await new Promise(resolve => {
    reference.remove(resolve);
  });

  app.delete();
}

class FirebaseKey extends KeyBase {
  constructor(key) {
    super();
    let parts = key.split('://');
    this.protocol = parts[0];
    assert(this.protocol == 'firebase');
    if (parts[1]) {
      parts = parts[1].split('/');
      assert(parts[0].endsWith('.firebaseio.com'));
      this.databaseUrl = parts[0];
      this.projectId = this.databaseUrl.split('.')[0];
      this.apiKey = parts[1];
      this.location = parts.slice(2).join('/');
    } else {
      this.databaseUrl = undefined;
      this.projectId = undefined;
      this.apiKey = undefined;
      this.location = '';
    }
  }

  childKeyForHandle(id) {
    let location = '';
    if (this.location != undefined && this.location.length > 0)
      location = this.location + '/';
    location += `handles/${id}`;
    return new FirebaseKey(`${this.protocol}://${this.databaseUrl}/${this.apiKey}/${location}`);
  }

  toString() {
    if (this.databaseUrl && this.apiKey)
      return `${this.protocol}://${this.databaseUrl}/${this.apiKey}/${this.location}`;
    return `${this.protocol}://`;
  }
}

let _nextAppNameSuffix = 0;

export class FirebaseStorage {
  constructor(arcId) {
    this._arcId = arcId;
    this._apps = {};
    this._sharedStores = {};
    this._baseStores = new Map();
  }

  async construct(id, type, keyFragment) {
    return this._join(id, type, keyFragment, false);
  }

  async connect(id, type, key) {
    return this._join(id, type, key, true);
  }

  // Unit tests should call this in an 'after' block.
  async shutdown() {
    return Promise.all(Object.keys(this._apps).map(k => this._apps[k].delete()));
  }
  
  async share(id, type, key) {
    if (!this._sharedStores[id])
      this._sharedStores[id] = await this._join(id, type, key, true);
    return this._sharedStores[id];
  }

  async baseStorageFor(type, key) {
    key = new FirebaseKey(key);
    key.location = `backingStores/${type.toString()}`;
    
    if (!this._baseStores.has(type)) {
      this._baseStores.set(type, await this._join(type.toString(), type.collectionOf(), key.toString(), 'unknown'));
    }

    return this._baseStores.get(type);
  }

  parseStringAsKey(string) {
    return new FirebaseKey(string);
  }

  async _join(id, type, key, shouldExist) {
    assert(typeof id == 'string');
    key = new FirebaseKey(key);
    // TODO: is it ever going to be possible to autoconstruct new firebase datastores?
    if (key.databaseUrl == undefined || key.apiKey == undefined)
      throw new Error('Can\'t complete partial firebase keys');

    if (this._apps[key.projectId] == undefined) {
      for (let app of firebase.apps) {
        if (app.options.databaseURL == key.databaseURL) {
          this._apps[key.projectId] = app;
          break;
        }
      }
    }

    if (this._apps[key.projectId] == undefined) {
      this._apps[key.projectId] = firebase.initializeApp({
        apiKey: key.apiKey,
        databaseURL: key.databaseUrl
      }, `app${_nextAppNameSuffix++}`);
    }

    let reference = firebase.database(this._apps[key.projectId]).ref(key.location);

    let currentSnapshot;
    await reference.once('value', snapshot => currentSnapshot = snapshot);
    if (shouldExist !== 'unknown' && shouldExist !== currentSnapshot.exists()) {
      return null;
    }

    if (shouldExist == false || (shouldExist == 'unknown' && currentSnapshot.exists() == false)) {
      let result = await reference.transaction(data => {
        if (data != null)
          return undefined;
        return {version: 0};
      }, undefined, false);

      if (!result.committed)
        return null;
    }

    return FirebaseStorageProvider.newProvider(type, this, id, reference, key);
  }

  static encodeKey(key) {
    key = btoa(key);
    return key.replace(/\//g, '*');
  }

  static decodeKey(key) {
    key = key.replace(/\*/g, '/');
    return atob(key);
  }
}

class FirebaseStorageProvider extends StorageProviderBase {
  constructor(type, storageEngine, id, reference, key) {
    super(type, undefined, id, key.toString());
    this._storageEngine = storageEngine;
    this._firebaseKey = key;
    this._reference = reference;
    this._backingStore = null;

    // Resolved when local modifications complete being persisted
    // to firebase. Null when not persisting.
    this._persisting = null;
  }

  static newProvider(type, storageEngine, id, reference, key) {
    if (type.isCollection) {
      // FIXME: implement a mechanism for specifying BigCollections in manifests
      if (id.startsWith('~big~'))
        return new FirebaseBigCollection(type, storageEngine, id, reference, key);
      else
        return new FirebaseCollection(type, storageEngine, id, reference, key);
    }
    return new FirebaseVariable(type, storageEngine, id, reference, key);
  }

  async _transaction(transactionFunction) {
    let result = await this._reference.transaction(data => {
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


  get _hasLocalChanges() {
    assert(false, 'subclass should implement _hasLocalChanges');
    return undefined;
  }

  async _persistChangesImpl() {
    assert(false, 'subclass should implement _persistChangesImpl');
  }

  async _persistChanges() {
    if (!this._hasLocalChanges) {
      return;
    }
    if (this._persisting) {
      return this._persisting;
    }
    // Ensure we only have one persist process running at a time.
    this._persisting = this._persistChangesImpl();
    await this._persisting;
    assert(!this._hasLocalChanges);
    this._persisting = null;
  }
}

// Models a Variable that is persisted to firebase in a
// last-writer-wins scheme.
//
// Initialization: After construct/connect the variable is
// not fully initialized, calls to `get` and `toLiteral`
// will not complete until either:
//  * The initial value is supplied via the firebase `.on`
//    subscription.
//  * A value is written to the store by a call to `set`.
//
// Updates from firebase: Each time an update is received
// from firebase we update the local version and value,
// unless there is a pending local modification (see below).
//
// Local modifications: When a local modification is applied
// by a call to `set` we increment the version number,
// mark this variable as locally modified, and start a
// process to atomically persist the change to firebase.
// Until this process has completed we suppress incoming
// changes from firebase. The version that we have chosen
// (by incrementing) may not match the final state that is
// written to firebase (if there are concurrent changes in
// firebase, or if we have queued up multiple local
// modiciations), but the result will always be
// monotonically increasing.
class FirebaseVariable extends FirebaseStorageProvider {
  constructor(type, storageEngine, id, reference, firebaseKey) {
    super(type, storageEngine, id, reference, firebaseKey);

    // Current value stored in this variable. Reflects either a
    // value that was stored in firebase, or a value that was
    // written locally.
    this._value = null;

    // Monotonic version, initialized via response from firebase,
    // or a call to `set` (as 0). Updated on changes from firebase
    // or during local modifications.
    this._version = null;

    // Whether `this._value` is affected by a local modification.
    // When this is true we are still in the process of writing
    // the value to the remote store and will suppress any
    // incoming changes from firebase.
    this._localModified = false;

    // Resolved when data is first available. The earlier of
    // * the initial value is supplied via firebase `reference.on`
    // * a value is written to the variable by a call to `set`.
    this._initialized = new Promise(resolve => {
      this._resolveInitialized = resolve;
    });

    this._reference.on('value', dataSnapshot => this._remoteStateChanged(dataSnapshot));
  }

  _remoteStateChanged(dataSnapshot) {
    if (this._localModified) {
      return;
    }
    let data = dataSnapshot.val();
    assert(this._version == null || data.version > this._version);

    this._value = data.value;
    this._version = data.version;

    this._resolveInitialized();
    this._fire('change', {data: data.value, version: this._version});
  }

  get _hasLocalChanges() {
    return this._localModified;
  }

  async _persistChangesImpl() {
    assert(this._localModified);
    // Guard the specific version that we're writing. If we receive another
    // local mutation, these versions will be different when the transaction
    // completes indicating that we need to continue the process of sending
    // local modifications.
    let version = this._version;
    let value = this._value;
    let result = await this._transaction(data => {
      assert(this._version >= version);
      return {
        version: Math.max(data.version + 1, version),
        value: value,
      };
    });
    assert(result.committed, 'uncommited transaction (offline?) not supported yet');
    let data = result.snapshot.val();
    assert(data !== 0);
    assert(data.version >= this._version);
    if (this._version != version) {
      // A new local modification happened while we were writing the previous one.
      return this._persistChangesImpl();
    }

    this._localModified = false;
    this._version = data.version;
    this._value = data.value;
  }

  get versionForTesting() {
    return this._version;
  }

  async get() {
    await this._initialized;
    if (this.type.isReference) {
      let referredType = this.type.referenceReferredType;
      if (this._backingStore == null)
        this._backingStore = await this._storageEngine.share(referredType.toString(), referredType.collectionOf(), this._value.storageKey);
      return await this._backingStore.get(this._value.id);  
    }
    return this._value;
  }

  async set(value, originatorId=null, barrier=null) {
    let referredType;  
    // the await required for fetching baseStorage can cause initialization/localModified
    // flag reordering if done inline below. So we resolve backingStore if necessary
    // first, before looking at anything else. 
    if (this.type.isReference && this._backingStore == null) {
      referredType = this.type.referenceReferredType;    
      this._backingStore = await this._storageEngine.baseStorageFor(referredType, this.storageKey);
    }

    if (this._version == null) {
      assert(!this._localModified);
      // If the first modification happens before init, this becomes
      // init. We pick the initial version which will be updated by the
      // transaction in _persistChanges.
      this._version = 0;
      this._resolveInitialized();
    } else {
      if (JSON.stringify(this._value) == JSON.stringify(value))
         return;
      this._version++;
    }
    if (this.type.isReference) {
      await this._backingStore.store(value, [this.storageKey]);
      value = {id: value.id, storageKey: this._backingStore.storageKey};
    }

    this._localModified = true;
    this._value = value;
    this._fire('change', {data: this._value, version: this._version, originatorId, barrier});
    await this._persistChanges();
  }

  async clear(originatorId=null, barrier=null) {
    return this.set(null, originatorId, barrier);
  }

  async cloneFrom(handle) {
    let literal = await handle.toLiteral();
    await this.fromLiteral(literal);
  }

  // Returns {version, model: [{id, value}]}
  async toLiteral() {
    await this._initialized;
    // fixme: think about if there are local mutations...
    let value = this._value;
    let model = [];
    if (value != null) {
      model = [{
        id: value.id,
        value,
      }];
    }
    return {
      version: this._version,
      model,
    };
  }

  fromLiteral({version, model}) {
    let value = model.length == 0 ? null : model[0].value;
    assert(value !== undefined);
    this._value = value;
    this._version = version;
  }
}


function setDiff(from, to) {
  let add = [];
  let remove = [];
  let items = new Set([...from, ...to]);
  from = new Set(from);
  to = new Set(to);
  for (let item of items) {
    if (from.has(item)) {
      if (to.has(item)) {
        continue;
      }
      remove.push(item);
      continue;
    }
    assert(to.has(item));
    add.push(item);
  }
  return {remove, add};
}

// Models a Collection that is persisted to firebase in scheme similar
// to the CRDT OR-set. We don't model sets of both observed
// and removed keys but instead we maintain a list of current keys and
// add/remove as the corresponding operations are received. We're
// able to do this as we only ever synchronize between the same two points
// (the client & firebase).
//
// Initialization: The collection is not initialized and calls to read
// and mutate the collection will not complete until the initial state
// is received via the firebase `.on` subscription.
// Note, this is different to FirebaseVariable as mutations do not cause
// the collection to become initialized (since we do not have enough state
// to generate events).
//
// Updates from firebase: Each time an update is received from firebase
// we compare the new remote state with the previous remote state. We are
// able to detect which entries (and the corresponding keys) that have been
// added and removed remotely. These are filtered by a set of suppressions
// for adds that we have previously issued and then applied to our local
// model. Each time we receive an update from firebase, we update our local
// version number. We align it with the remote version when possible.
//
// Local modifications: Additions and removal of entries (and membership
// keys) are tracked in a local structure, `_localChanges`, and a process
// is started to persist remotely. These changes are applied to the remote
// state and committed atomically. Any added keys are added to sets in
// `_addSuppressions` to prevent applying our own writes when they
// are received back in a subsequent update from firebase. Each time we
// receive a local modification we increment our local version number.
// When we persist our changes to firebase we align it with the remote
// version.
class FirebaseCollection extends FirebaseStorageProvider {
  constructor(type, arcId, id, reference, firebaseKey) {
    super(type, arcId, id, reference, firebaseKey);

    // Lists mapped by id containing membership keys that have been
    // added or removed by local modifications. Entries in this
    // structure are still pending persistance remotely. Empty
    // when there are no pending local modifications.
    // id => {add: [key], remove: [key]}
    this._localChanges = new Map();

    // Sets mapped by id containing keys that were added locally
    // and have been persisted to firebase. Entries here must be
    // suppressed when they are echoed back as updates from firebase.
    // They can be removed once the state received from firebase
    // reaches `barrierVersion`.
    // id => {keys: Set[key], barrierVersion}
    this._addSuppressions = new Map();

    // Local model of entries stored in this collection. Updated
    // by local modifications and when we receive remote updates
    // from firebase.
    this._model = new CrdtCollectionModel();

    // Monotonic version. Updated each time we receive an update
    // from firebase, or when a local modification is applied.
    this._version = null;

    // The last copy of the serialized state received from firebase.
    // {items: id => {value, keys: {[key]: null}}}
    this._remoteState = {items: {}};

    // Whether our model has been initialized after receiving the first
    // copy of state from firebase.
    this._initialized = new Promise(resolve => this._resolveInitialized = resolve);

    this._reference.on('value', dataSnapshot => this._remoteStateChanged(dataSnapshot));
  }

  _remoteStateChanged(dataSnapshot) {
    let newRemoteState = dataSnapshot.val();
    if (!newRemoteState.items) {
      // This is the inital remote state, where we have only {version: 0}
      // fixme: assert this.
      newRemoteState.items = {};
    }

    // [{id, value, keys}]
    let add = [];
    // [{id, keys}]
    let remove = [];

    let encIds = new Set([
      ...Object.keys(newRemoteState.items),
      ...Object.keys(this._remoteState.items),
    ]);


    // Diff the old state (this._remoteState) with the new state (newRemoteState) to determine
    // which keys have been added/removed.
    for (let encId of encIds) {
      let id = FirebaseStorage.decodeKey(encId);
      let suppression = this._addSuppressions.get(id);
      if (encId in newRemoteState.items) {
        let {keys: encKeys, value} = newRemoteState.items[encId];
        encKeys = Object.keys(encKeys);
        if (encId in this._remoteState.items) {
          // 1. possibly updated remotely.
          let encOldkeys = Object.keys(this._remoteState.items[encId].keys);
          let {add: encAddKeys, remove: encRemoveKeys} = setDiff(encOldkeys, encKeys);
          let addKeys = encAddKeys.map(FirebaseStorage.decodeKey);
          let removeKeys = encRemoveKeys.map(FirebaseStorage.decodeKey);
          if (suppression) {
            addKeys = addKeys.filter(key => !suppression.keys.has(key));
          }
          if (addKeys.length) {
            // If there's a local add for this id, retain the existing value,
            // to preserve the legacy behavior of updating in place.
            if (this._localChanges.has(id) && this._localChanges.get(id).add.length > 0 && this._model.has(id)) {
              value = this._model.getValue(id);
            }
            let effective = this._model.add(id, value, addKeys);
            add.push({value, keys: addKeys, effective});
          }
          if (removeKeys.length) {
            let value = this._model.getValue(id);
            let effective = this._model.remove(id, removeKeys);
            remove.push({value, keys: removeKeys, effective});
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
            if (this._localChanges.has(id) && this._localChanges.get(id).add.length > 0 && this._model.has(id)) {
              value = this._model.getValue(id);
            }
            let keys = encKeys.map(FirebaseStorage.decodeKey);
            let effective = this._model.add(id, value, keys);
            add.push({value, keys, effective});
          }
        }
      } else {
        // 3. Removed remotely.
        let {keys: encKeys, value} = this._remoteState.items[encId];
        encKeys = Object.keys(encKeys);
        let keys = encKeys.map(FirebaseStorage.decodeKey);
        let effective = this._model.remove(id, keys);
        remove.push({value, keys: keys, effective});
      }
    }

    // Clean up any suppressions that have reached the barrier version.
    for (let [id, {barrierVersion}] of this._addSuppressions.entries()) {
      if (newRemoteState.version >= barrierVersion) {
        this._addSuppressions.delete(id);
      }
    }

    // Bump version monotonically. Ideally we would use the remote
    // version, but we might not be able to if there have been local
    // modifications in the meantime. We'll recover the remote version
    // once we persist those.
    this._version = Math.max(this._version + 1, newRemoteState.version);
    this._remoteState = newRemoteState;
    this._resolveInitialized();

    if (add.length == 0 && remove.length == 0) {
      // The update had no effect.
      return;
    }

    this._fire('change', {
      originatorId: null,
      version: this._version,
      add,
      remove,
    });
  }

  get versionForTesting() {
    return this._version;
  }

  async get(id) {
    await this._initialized;
    if (this.type.primitiveType().isReference) {
      let ref = this._model.getValue(id);
      if (ref == null)
        return null;
      let referredType = this.type.primitiveType().referenceReferredType;
      if (this._backingStore == null)
        this._backingStore = await this._storageEngine.share(referredType.toString(), referredType.collectionOf(), ref.storageKey);
      let result = await this._backingStore.get(ref.id);
      return result;
    }
    return this._model.getValue(id);
  }

  async remove(id, keys=[], originatorId=null) {
    await this._initialized;

    // 1. Apply the change to the local model.
    let value = this._model.getValue(id);
    if (value === null)
      return;
    if (keys.length == 0) {
      keys = this._model.getKeys(id);
    }

    // TODO: These keys might already have been removed (concurrently).
    // We should exit early in that case.
    let effective = this._model.remove(id, keys);
    this._version++;

    // 2. Notify listeners.
    this._fire('change', {remove: [{value, keys, effective}], version: this._version, originatorId});

    // 3. Add this modification to the set of local changes that need to be persisted.
    if (!this._localChanges.has(id)) {
      this._localChanges.set(id, {add: [], remove: []});
    }
    let localChange = this._localChanges.get(id);
    for (let key of keys) {
      localChange.remove.push(key);
    }

    // 4. Wait for the changes to persist.
    await this._persistChanges();
  }

  async store(value, keys, originatorId=null) {
    assert(keys != null && keys.length > 0, 'keys required');
    await this._initialized;

    // 1. Apply the change to the local model.
    if (this.type.primitiveType().isReference) {
      let referredType = this.type.primitiveType().referenceReferredType;
      if (this._backingStore == null)
        this._backingStore = await this._storageEngine.baseStorageFor(referredType, this.storageKey);
      await this._backingStore.store(value, [this.storageKey]);
      value = {id: value.id, storageKey: this._backingStore.storageKey};
    }
    let id = value.id;
    let effective = this._model.add(value.id, value, keys);
    this._version++;

    // 2. Notify listeners.
    this._fire('change', {add: [{value, keys, effective}], version: this._version, originatorId});

    // 3. Add this modification to the set of local changes that need to be persisted.
    if (!this._localChanges.has(id)) {
      this._localChanges.set(id, {add: [], remove: []});
    }
    let localChange = this._localChanges.get(id);
    for (let key of keys) {
      localChange.add.push(key);
    }

    // 4. Wait for persistence to complete.
    await this._persistChanges();
  }

  get _hasLocalChanges() {
    return this._localChanges.size > 0;
  }

  async _persistChangesImpl() {
    while (this._localChanges.size > 0) {
      // Record the changes that are persisted by the transaction.
      let changesPersisted;
      let result = await this._transaction(data => {
        // Updating the inital state with no items.
        if (!data.items) {
          // Ideally we would be able to assert that version is 0 here.
          // However it seems firebase will remove an empty object.
          data.items = {};
        }
        data.version = Math.max(data.version + 1, this._version);
        // Record the changes that we're attempting to write. We'll remove
        // these from this._localChanges if this transaction commits.
        changesPersisted = new Map();
        for (let [id, {add, remove}] of this._localChanges.entries()) {
          let encId = FirebaseStorage.encodeKey(id);
          changesPersisted.set(id, {add: [...add], remove: [...remove]});
          // Don't add keys that we have also removed.
          add = add.filter(key => !(remove.indexOf(key) >= 0));
          let item = data.items[encId] || {value: null, keys: {}};
          // Propagate keys added locally.
          for (let key of add) {
            let encKey = FirebaseStorage.encodeKey(key);
            item.keys[encKey] = data.version;
          }
          // Remove keys removed locally.
          for (let key of remove) {
            let encKey = FirebaseStorage.encodeKey(key);
            delete item.keys[encKey];
          }
          // If we've added a key, also propagate the value. (legacy mutation).
          if (add.length > 0) {
            assert(this._model.has(id));
            item.value = this._model.getValue(id);
          }
          let keys = Object.keys(item.keys);
          if (keys.length > 0) {
            data.items[encId] = item;
          } else {
            // Remove the entry entirely if there are no keys left.
            delete data.items[encId];
          }
        }
        return data;
      });

      // We're assuming that firebase won't deliver updates between the
      // transaction committing and the result promise resolving :/

      assert(result.committed);
      let data = result.snapshot.val();

      // While we were persisting changes, we may have received new ones.
      // We remove any changes that were just persisted, `changesPersisted`
      // from `this._localChanges`.
      for (let [id, {add, remove}] of changesPersisted.entries()) {
        add = new Set(add);
        remove = new Set(remove);
        let localChange = this._localChanges.get(id);
        localChange.add = localChange.add.filter(key => !add.has(key));
        localChange.remove = localChange.remove.filter(key => !remove.has(key));
        if (localChange.add.length == 0 && localChange.remove.length == 0) {
          this._localChanges.delete(id);
        }
        // Record details about keys added, so that we can suppress them
        // when echoed back in an update from firebase.
        if (this._addSuppressions.has(id)) {
          // If we already have a suppression, we augment it and bump the
          // barrier version.
          let suppression = this._addSuppressions.get(id);
          for (let key of add) {
            suppression.keys.add(key);
          }
          suppression.barrierVersion = data.version;
        } else {
          this._addSuppressions.set(id, {
            keys: add,
            barrierVersion: data.version,
          });
        }
      }
    }
  }

  async toList() {
    await this._initialized;
    if (this.type.primitiveType().isReference) {
      let items = this._model.toList();
      let referredType = this.type.primitiveType().referenceReferredType;

      let refSet = new Set();

      items.forEach(item => refSet.add(item.storageKey));
      assert(refSet.size == 1);
      let ref = refSet.values().next().value;

      if (this._backingStore == null)
        this._backingStore = await this._storageEngine.share(referredType.toString(), referredType.collectionOf(), ref);
      
      let retrieveItem = async item => {
        return this._backingStore.get(item.id);
      };

      return await Promise.all(items.map(retrieveItem));
    }
    return this._model.toList();
  }

  async cloneFrom(handle) {
    this.fromLiteral(await handle.toLiteral());
    // Don't notify about the contents that have just been cloned.
    // However, do record local changes for persistence.
    for (let item of this._model._items.values()) {
      assert(item.value.id !== undefined);
      this._localChanges.set(item.value.id, {add: [...item.keys], remove: []});
    }

    await this._persistChanges();
  }

  // Returns {version, model: [{id, value, keys: []}]}
  async toLiteral() {
    await this._initialized;
    // TODO: think about what to do here, do we really need toLiteral for a firebase store?
    // if yes, how should it represent local modifications?
    await this._persisting;
    return {
      version: this._version,
      model: this._model.toLiteral(),
    };
  }

  fromLiteral({version, model}) {
    this._version = version;
    this._model = new CrdtCollectionModel(model);
  }
}

const CursorState = {new: 0, init: 1, stream: 2, removed: 3, done: 4};

// Cursor provides paginated reads over the contents of a BigCollection, locked to the version
// of the collection at which the cursor was created.
//
// This class technically conforms to the iterator protocol but is not marked as iterable because
// next() is async, which is currently not supported by implicit iteration in Javascript.
class Cursor {
  constructor(reference, pageSize) {
    assert(!isNaN(pageSize) && pageSize > 0);
    this._orderByIndex = reference.child('items').orderByChild('index');
    this._pageSize = pageSize;
    this._state = CursorState.new;
    this._removed = [];
    this._baseQuery = null;
    this._nextStart = null;
    this._end = null;
    this._removedFn = null;
  }

  // This must be called exactly once after construction and before any other methods are called.
  async _init() {
    assert(this._state === CursorState.new);

    // Retrieve the current last item to establish our streaming version.
    await this._orderByIndex.limitToLast(1).once('value', snapshot => snapshot.forEach(entry => {
      this._end = entry.val().index;
    }));

    // Read one past the page size each time to establish the starting index for the next page.
    this._baseQuery = this._orderByIndex.endAt(this._end).limitToFirst(this._pageSize + 1);

    // Attach a listener for removed items and capture any that occur ahead of our streaming
    // frame. These will be returned after the cursor reaches the item at this._end.
    this._removedFn = snapshot => {
      if (snapshot.val().index <= this._end &&
          (this._nextStart === null || snapshot.val().index >= this._nextStart)) {
        this._removed.push(snapshot.val());
      }
    };
    await this._orderByIndex.on('child_removed', this._removedFn);
    this._state = CursorState.init;
  }

  // Returns the BigCollection version at which this cursor is reading.
  get version() {
    return this._end;
  }

  // Returns {value: [items], done: false} while there are items still available, or {done: true}
  // when the cursor has completed reading the collection.
  async next() {
    assert(this._state !== CursorState.new);

    if (this._state === CursorState.done) {
      return {done: true};
    }

    let query;
    if (this._state === CursorState.init) {
      query = this._baseQuery;
      this._state = CursorState.stream;
    } else if (this._state === CursorState.stream) {
      assert(this._nextStart !== null);
      query = this._baseQuery.startAt(this._nextStart);
    }

    let value = [];
    if (this._state === CursorState.stream) {
      this._nextStart = null;
      await query.once('value', snapshot => snapshot.forEach(entry => {
        if (value.length < this._pageSize) {
          value.push(entry.val());
        } else {
          this._nextStart = entry.val().index;
        }
      }));
      if (this._nextStart === null) {
        await this._detach();
        this._state = CursorState.removed;
      }
    }

    if (this._state === CursorState.removed) {
      while (this._removed.length && value.length < this._pageSize) {
        value.push(this._removed.pop());
      }
      if (this._removed.length === 0) {
        this._state = CursorState.done;
      }
    }
    assert(value.length > 0);
    return {value, done: false};
  }

  // This must be called if a cursor is no longer needed but has not yet completed streaming
  // (i.e. next() hasn't returned {done: true}).
  async close() {
    await this._detach();
    this._state = CursorState.done;
  }

  async _detach() {
    if (this._removedFn) {
      await this._orderByIndex.off('child_removed', this._removedFn);
      this._removedFn = null;
    }
  }
}

// Provides access to large collections without pulling the entire contents locally.
//
// get(), store() and remove() all call immediately through to the backing Firebase collection.
// There is currently no option for bulk instantiations of these methods.
//
// The full collection can be read via a paginated Cursor returned by stream(). This views a
// snapshot of the collection, locked to the version at which the cursor is created.
//
// To get pagination working, we need to add an index field to items as they are stored, and that
// field must be marked for indexing in the Firebase rules:
//    "rules": {
//      "<storage-root>": {
//        "$collection": {
//          "items": {
//            ".indexOn": ["index"]
//          }
//        }
//      }
//    }
class FirebaseBigCollection extends FirebaseStorageProvider {
  constructor(type, arcId, id, reference, firebaseKey) {
    super(type, arcId, id, reference, firebaseKey);
  }

  async get(id) {
    let value;
    let encId = FirebaseStorage.encodeKey(id);
    await this._reference.child('items/' + encId).once('value', snapshot => {
      value = (snapshot.val() !== null) ? snapshot.val().value : null;
    });
    return value;
  }

  async store(value, keys) {
    // Technically we don't really need keys here; Firebase provides the central replicated storage
    // protocol and the mutating ops here are all pass-through (so no local CRDT management is
    // required). This may change in the future - we may well move to full CRDT support in the
    // backing stores - so it's best to keep the API in line with regular Collections.
    assert(keys != null && keys.length > 0, 'keys required');

    // Firebase does not support multi-location transactions. To modify both 'version' and a child
    // of 'items', we'd need to transact directly on this._reference, which would pull the entire
    // collection contents locally, avoiding which is the explicit intent of this class. So we have
    // to double-step the operation, leaving a small window where another reader could see the new
    // version but not the added/updated item, which actually isn't much of a problem. Concurrent
    // store ops from different clients will work fine thanks to transaction(); both will correctly
    // increment the version regardless of the order in which they occur.
    let version;
    await this._reference.child('version').transaction(data => {
      version = (data || 0) + 1;
      return version;
    }, undefined, false);

    let encId = FirebaseStorage.encodeKey(value.id);
    return this._reference.child('items/' + encId).transaction(data => {
      if (data === null) {
        data = {value, keys: {}};
      } else {
        // Allow legacy mutation for now.
        data.value = value;
      }
      for (let key of keys) {
        let encKey = FirebaseStorage.encodeKey(key);
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

  async remove(id) {
    await this._reference.child('version').transaction(data => {
      return (data || 0) + 1;
    }, undefined, false);

    let encId = FirebaseStorage.encodeKey(id);
    return this._reference.child('items/' + encId).remove();
  }

  // Returns a Cursor for paginated reads of the current version of this BigCollection.
  async stream(pageSize) {
    let cursor = new Cursor(this._reference, pageSize);
    await cursor._init();
    return cursor;
  }

  // TODO: cloneFrom, toLiteral, fromLiteral ?
  // A cloned instance will probably need to reference the same Firebase URL but collect all
  // modifications locally for speculative execution.
}
