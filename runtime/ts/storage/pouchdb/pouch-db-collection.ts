import {CrdtCollectionModel, Model} from '../crdt-collection-model.js';
import {Tracing} from '../../../../tracelib/trace.js';
import {assert} from '../../../../platform/assert-web.js';
import {PouchDbStorageProvider} from "./pouch-db-storage-provider.js";
import {Type} from "../../type.js";
import {PouchDbStorage} from "./pouch-db-storage";

export class PouchDbCollection extends PouchDbStorageProvider {
  _model: CrdtCollectionModel;

  constructor(type: Type, storageEngine: PouchDbStorage, name: string, id: string, key: string) {
    super(type, name, id, key);
    console.log("COL" + ' name='  + name + ' key=' + key + ' id=' + id + ' type=' + type);

    this._model = new CrdtCollectionModel();
    this.storageEngine = storageEngine;
    assert(this.version !== null);

    // Load the Collection from PouchDB
//    this.db.get(this.storageKey)
//      .then((doc) => {
//        console.log('TODO: non-async', doc);
//      })
//      .catch(() => {});
  }

  backingType() {
    return this.type.primitiveType();
  }

  clone() {
    const handle = new PouchDbCollection(this.type, this.storageEngine, this.name, this.id, null);
    handle.cloneFrom(this);
    return handle;
  }

  async cloneFrom(handle) {
    console.log('COL cloneFrom');
    this.referenceMode = handle.referenceMode;
    const literal = await handle.toLiteral();
    if (this.referenceMode && literal.model.length > 0) {
      await Promise.all([this.ensureBackingStore(), handle.ensureBackingStore()]);
      literal.model = literal.model.map(({id, value}) => ({id, value: {id: value.id, storageKey: this.backingStore.storageKey}}));
      const underlying = await handle.backingStore.getMultiple(literal.model.map(({id}) => id));
      await this.backingStore.storeMultiple(underlying, [this.storageKey]);
    }
    this.fromLiteral(literal);
  }

  async modelForSynchronization() {
    console.log('COL modelForSync', this.version);
    return {
      version: this.version,
      model: await this._toList()
    };
  }

  // Returns {version, model: [{id, value, keys: []}]}
  toLiteral() {
    return {
      version: this.version,
      model: this._model.toLiteral()
    };
  }

  fromLiteral({version, model}) {
    this.version = version;
    this._model = new CrdtCollectionModel(model);
  }

  async _toList() {
    if (this.referenceMode) {
      const items = this.toLiteral().model;
      if (items.length === 0) {
        return [];
      }
      const refSet = new Set();
      items.forEach(item => refSet.add(item.value.storageKey));
      assert(refSet.size === 1, `multiple storageKeys in reference set of collection not yet supported.`);
      const ref = refSet.values().next().value;

      await this.ensureBackingStore();

      const retrieveItem = async item => {
        const ref = item.value;
        return {id: ref.id, value: await this.backingStore.get(ref.id), keys: item.keys};
      };

      return await Promise.all(items.map(retrieveItem));
    }
    return this.toLiteral().model;
  }

  async toList() {
    return (await this._toList()).map(item => item.value);
  }

  async getMultiple(ids) {
    assert(!this.referenceMode, "getMultiple not implemented for referenceMode stores");
    return ids.map(id => this._model.getValue(id));
  }

  async storeMultiple(values, keys, originatorId=null) {
    assert(!this.referenceMode, "storeMultiple not implemented for referenceMode stores");
    values.map(value => this._model.add(value.id, value, keys));
    this.version++;
  }

  async get(id) {
    if (this.referenceMode) {
      const ref = this._model.getValue(id);
      if (ref == null) {
        return null;
      }
      await this.ensureBackingStore();
      const result = await this.backingStore.get(ref.id);
      return result;
    }
    return this._model.getValue(id);
  }

  traceInfo() {
    return {items: this._model.size};
  }

  async store(value, keys: string[], originatorId=null) {
    assert(keys != null && keys.length > 0, 'keys required');
    const trace = Tracing.start({cat: 'handle', name: 'PouchDbCollection::store', args: {name: this.name}});

    let pouchOperation: Promise<PouchDB.Core.Response>;

    const changeEvent = {value, keys, effective: undefined};
    if (this.referenceMode) {
      const referredType = this.type.primitiveType();
      const storageKey = this.backingStore ? this.backingStore.storageKey : this.storageEngine.baseStorageKey(referredType);

      // It's important to store locally first, as the upstream consumers
      // are set up to assume all writes are processed (at least locally) synchronously.
      changeEvent.effective = this._model.add(value.id, {id: value.id, storageKey}, keys);
      await this.ensureBackingStore();
      await this.backingStore.store(value, keys);
    } else {
      //console.log("COL ADD storageKey='" + this.storageKey + "' id/value/keys=", value, keys);
      console.log("COL ADD storageKey='" + this.storageKey);

      try {
        pouchOperation = this.retryIt({
          _id: this.storageKey,
          arcsId: this.id,
          type: this.type.toLiteral(),
          value,
          keys
        });
        //console.log('DBP doc id=' + response.id + ' rev=' + response.rev + ' ok=' + response.ok);
      } catch (err) {
        console.log('COL ADD err', err);
        // TODO(lindner) Error Handling
        //throw err;
      }
      changeEvent.effective = this._model.add(value.id, value, keys);
    }

    this.version++;

    // 2. Notify Listeners
    await trace.wait(
        this._fire('change', {add: [changeEvent], version: this.version, originatorId}));
    trace.end({args: {value}});

    // 3. Update PouchDB
    if (pouchOperation) {
      await pouchOperation;
    }
  }

  async remove(id, keys:string[] = [], originatorId=null) {
    const trace = Tracing.start({cat: 'handle', name: 'PouchDbCollection::remove', args: {name: this.name}});
    if (keys.length === 0) {
      keys = this._model.getKeys(id);
    }
    const value = this._model.getValue(id);
    if (value !== null) {
      const effective = this._model.remove(id, keys);
      this.version++;
      await trace.wait(
          this._fire('change', {remove: [{value, keys, effective}], version: this.version, originatorId}));
    }
    trace.end({args: {entity: value}});


    try {
      const doc = await this.db.get(this.storageKey) as PouchDB.Core.IdMeta & PouchDB.Core.GetMeta & Model;

      // doc needs to be there.  Modify it.
      doc.value = value;
      doc.keys = keys;

      let result: PouchDB.Core.Response;
      while (!result) {
        try {
          result = await this.db.put(doc);
        } catch (err) {
          if (err.name === 'conflict') {
            console.log('COL remove ERR conflict', err);
            // TODO remove keys from existing doc?
          } else {
            console.log('COL remove ERR ', err);
          }
        }
      }
    } catch (err) {
      // TODO(lindner): this is a weird case, this is a request to remove before
      // the doc is actually created
      console.log('COL remove ERR', err);
    }
  }

  async clearItemsForTesting() {
    // Remove the Pouch Document
    try {
      const doc = await this.db.get(this.storageKey);
      await this.db.remove(doc);
    } catch(err) {
      if (err.name !== 'not_found') {
        console.log("clearItemsForTesting: error removing", err);
      }
    }
    this._model = new CrdtCollectionModel();
  }
}
