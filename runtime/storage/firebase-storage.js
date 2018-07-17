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

async function realTransaction(reference, transactionFunction) {
  let realData = undefined;
  await reference.once('value', data => {realData = data.val(); });
  return reference.transaction(data => {
    if (data == null)
      data = realData;
    let result = transactionFunction(data);
    assert(result);
    return result;
  }, undefined, false);
}

let _nextAppNameSuffix = 0;

export class FirebaseStorage {
  constructor(arcId) {
    this._arcId = arcId;
    // TODO: We need a mechanism to shut call `app.delete()` in tests,
    // otherwise the test process will not exit. Perhaps each store should
    // have a `close` function, and once all the stores for a given app
    // are closed, the app is deleted.
    this._apps = {};
  }

  async construct(id, type, keyFragment) {
    return this._join(id, type, keyFragment, false);
  }

  async connect(id, type, key) {
    return this._join(id, type, key, true);
  }

  parseStringAsKey(string) {
    return new FirebaseKey(string);
  }

  async _join(id, type, key, shouldExist) {
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

    let result = await realTransaction(reference, data => {
      if ((data == null) == shouldExist)
        return; // abort transaction
      if (!shouldExist) {
        return {version: 0};
      }
      assert(data);
      return data;
    });


    if (!result.committed)
      return null;

    return FirebaseStorageProvider.newProvider(type, this._arcId, id, reference, key);
  }
}

class FirebaseStorageProvider extends StorageProviderBase {
  constructor(type, arcId, id, reference, key) {
    super(type, arcId, undefined, id, key.toString());
    this.firebaseKey = key;
    this.reference = reference;

    // Resolved when local modifications complete being persisted
    // to firebase. Null when not persisting.
    this._persisting = null;

  }

  static newProvider(type, arcId, id, reference, key) {
    if (type.isCollection)
      return new FirebaseCollection(type, arcId, id, reference, key);
    return new FirebaseVariable(type, arcId, id, reference, key);
  }

  static encodeKey(key) {
    key = btoa(key);
    return key.replace(/\//g, '*');
  }
  static decodeKey(key) {
    key = key.replace(/\*/g, '/');
    return atob(key);
  }

  get _hasLocalChanges() {
    assert(false, 'subclass should implement _hasLocalChanges');
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
  constructor(type, arcId, id, reference, firebaseKey) {
    super(type, arcId, id, reference, firebaseKey);

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

    this.reference.on('value', dataSnapshot => this._remoteValueChanged(dataSnapshot));
  }

  _remoteValueChanged(dataSnapshot) {
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
    let result = await realTransaction(this.reference, data => {
      assert(this._version >= version);
      return {
        version: Math.max(data.version + 1, version),
        value: value,
      };
    });
    assert(result.committed, 'uncommited transaction (offline?) not supported yet');
    let data = result.snapshot.val();
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
    return this._value;
  }

  async set(value, originatorId=null, barrier=null) {
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

    this.reference.on('value', dataSnapshot => this._remoteStateChange(dataSnapshot));
  }

  _remoteStateChange(dataSnapshot) {
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

    let ids = new Set([
      ...Object.keys(newRemoteState.items),
      ...Object.keys(this._remoteState.items),
    ]);

    // Diff the old state (this._remoteState) with the new state (newRemoteState) to determine
    // which keys have been added/removed.
    for (let id of ids) {
      let suppression = this._addSuppressions.get(id);
      if (id in newRemoteState.items) {
        let {keys, value} = newRemoteState.items[id];
        keys = Object.keys(keys);
        if (id in this._remoteState.items) {
          // 1. possibly updated remotely.
          let oldkeys = Object.keys(this._remoteState.items[id].keys);
          let {add: addKeys, remove: removeKeys} = setDiff(oldkeys, keys);
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
          let addKeys = keys;
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
            let effective = this._model.add(id, value, keys);
            add.push({value, keys, effective});
          }
        }
      } else {
        // 3. Removed remotely.
        let {keys, value} = this._remoteState.items[id];
        keys = Object.keys(keys);
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
    return this._model.getValue(id);
  }

  async remove(id, keys=[], originatorId=null) {
    await this._initialized;
    if (keys.length == 0) {
      keys = this._model.getKeys(id);
    }

    // 1. Apply the change to the local model.
    let value = this._model.getValue(id);
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
      let result = await realTransaction(this.reference, data => {
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
          changesPersisted.set(id, {add: [...add], remove: [...remove]});
          // Don't add keys that we have also removed.
          add = add.filter(key => !(remove.indexOf(key) >= 0));
          let item = data.items[id] || {value: null, keys: {}};
          // Propagate keys added locally.
          for (let key of add) {
            item.keys[key] = data.version;
          }
          // Remove keys removed locally.
          for (let key of remove) {
            delete item.keys[key];
          }
          // If we've added a key, also propagate the value. (legacy mutation).
          if (add.length > 0) {
            assert(this._model.has(id));
            item.value = this._model.getValue(id);
          }
          let keys = Object.keys(item.keys);
          if (keys.length > 0) {
            data.items[id] = item;
          } else {
            // Remove the entry entirely if there are no keys left.
            delete data.items[id];
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
    return this._model.toList();
  }

  async cloneFrom(handle) {
    this.fromLiteral(await handle.toLiteral());
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
