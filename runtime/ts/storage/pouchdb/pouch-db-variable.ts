import {assert} from '../../../../platform/assert-web.js';
import {PouchDbStorageProvider} from "./pouch-db-storage-provider";
import {PouchDbStorage} from "./pouch-db-storage";

export class PouchDbVariable extends PouchDbStorageProvider {
  _stored: {id: string}|null;
  private localKeyId = 0;
  constructor(type, storageEngine: PouchDbStorage, name: string, id: string, key: string) {
    super(type, name, id, key);
    console.log("VAR new" + ' name='  + name + ' key=' + key + ' id=' + id + ' type=' + type);
    this.storageEngine = storageEngine;
    this._stored = null;
    this.backingStore = null;
  }

  backingType() {
    return this.type;
  }

  clone() {
    const variable = new PouchDbVariable(this.type, this.storageEngine, this.name, this.id, null);
    variable.cloneFrom(this);
    return variable;
  }

  async cloneFrom(handle) {

    this.referenceMode = handle.referenceMode;
    const literal = await handle.toLiteral();
    console.log('VAR cloneFrom');
    if (this.referenceMode && literal.model.length > 0) {
      await Promise.all([this.ensureBackingStore(), handle.ensureBackingStore()]);
      literal.model = literal.model.map(({id, value}) => ({id, value: {id: value.id, storageKey: this.backingStore.storageKey}}));
      const underlying = await handle.backingStore.getMultiple(literal.model.map(({id}) => id));
      await this.backingStore.storeMultiple(underlying, [this.storageKey]);
    }
    
    this.fromLiteral(literal);
    // TODO(lindner): ask shane why this doesn't fire 'change' events like firebase does...
    if (literal && literal.model && literal.model.length === 1) {
      
      const newvalue = literal.model[0].value;
      if (newvalue) {
        try {
          // TODO(lindner); skip if values are the same.
          await this.set(newvalue);

          // TODO(lindner): refactor with code in set() that does the same thing.
          // currently it checks if _stored == the new value and discards writes.
        try {
          const response = await this.retryIt({
            _id: this.storageKey,
            arcsId: this.id,
            type: this.type.toLiteral(),
            value: newvalue,
          });
          console.log('VAR cloneFrom put doc id=' + response.id + ' rev=' + response.rev + ' ok=' + response.ok);
        } catch (err) {
          console.log('VAR err cloneFrom putting id=', newvalue, 'error', err);
          throw err;
        }

        } catch (err) {
          console.log('VAR cloneFrom err', newvalue, err);
        }
      }
    }
  }

  async modelForSynchronization() {
    console.log('VAR modelForSync');
    if (this.referenceMode && this._stored !== null) {
      const value = this._stored as {id: string, storageKey: string};

      await this.ensureBackingStore();
      const result = await this.backingStore.get(value.id);
      return {
        version: this.version,
        model: [{id: value.id, value: result}]
      };
    }
    
    return super.modelForSynchronization();
  }

  // Returns {version, model: [{id, value}]}
  async toLiteral() {
    const value = this._stored;
    let model = [];
    if (value != null) {
      model = [{
        id: value.id,
        value,
      }];
    }
    return {
      version: this.version,
      model,
    };
  }

  async fromLiteral({version, model}) {
    const value = model.length === 0 ? null : model[0].value;
    if (this.referenceMode && value && value.rawData) {
      assert(false, `shouldn't have rawData ${JSON.stringify(value.rawData)} here`);
    }
    assert(value !== undefined);
    this._stored = value;
    this.version = version;
    // TODO(plindner): Mimic firebase?
    // TODO(plindner): firebase fires 'change' events here...
  }

  traceInfo() {
    return {stored: this._stored !== null};
  }

  /**
   * Returns a promise containing the variable value or null if it does not exist.
   */  
  async get() {
    if (this.referenceMode && this._stored) {
      const value = this._stored as {id: string, storageKey: string};

      await this.ensureBackingStore();
      const result = await this.backingStore.get(value.id);
      return result;
    }

    // Validate against pouchdb
    try {
      const doc = await this.db.get(this.storageKey);

      if (JSON.stringify(this._stored) !== JSON.stringify(doc['value'])) {
        console.log("VAR get diff: ", doc['value'], this._stored);
        throw new Error('mismatched');
      }
      return doc['value'];
    } catch (err) {
      // Not in db, contract says return nulll.
      if (err.name === 'not_found') {
        return null;
      }
      console.log('VAR get err stored/err', this._stored, err);
      // Cannot find the value.
      throw err;
    }
  }

  async set(value : {id: string}, originatorId=null, barrier=null) {
    assert(value !== undefined);
    if (this.referenceMode && value) {
      // Even if this value is identical to the previously written one,
      // we can't suppress an event here because we don't actually have
      // the previous value for comparison (that's down in the backing store).
      // TODO(shans): should we fetch and compare in the case of the ids matching?

      const referredType = this.type;

      const storageKey = this.backingStore ? this.backingStore.storageKey : this.storageEngine.baseStorageKey(referredType);

      // It's important to store locally first, as the upstream consumers
      // are set up to assume all writes are processed (at least locally) synchronously.
      this._stored = {id: value.id, storageKey} as {id: string};

      await this.ensureBackingStore();
      
      // TODO(shans): mutating the storageKey here to provide unique keys is
      // a hack that can be removed once entity mutation is distinct from collection
      // updates. Once entity mutation exists, it shouldn't ever be possible to write
      // different values with the same id. 
      await this.backingStore.store(value, [this.storageKey + this.localKeyId++]);
    } else {
      // If there's a barrier set, then the originating storage-proxy is expecting
      // a result so we cannot suppress the event here.
      if (JSON.stringify(this._stored) === JSON.stringify(value) &&
          barrier == null) {
        return;
      }
      // Store local value
      this._stored = value;

      // Update Pouch, If value is null delete key, otherwise store it.
      if (value == null) {
        try {
          console.log('VAR remove');
          const doc = await this.db.get(this.storageKey);
          await this.db.remove(doc);
        } catch (err) {
          // Deleting already deleted
          if (err.name !== 'not_found') {
            console.log('VAR clear err=', err);
          }
        }
      } else {
        // Write to Pouch Database
        try {
          const response = await this.retryIt({
            _id: this.storageKey,
            arcsId: this.id,
            type: this.type.toLiteral(),
            value,
          });
          console.log('VAR put doc id=' + response.id + ' rev=' + response.rev + ' ok=' + response.ok);
        } catch (err) {
          console.log('VAR err putting id=', value, 'error', err);
          throw err;
        }
      }
    }
    this.version++;
    if (this.referenceMode) {
      await this._fire('change', {data: value, version: this.version, originatorId, barrier});
    } else {
      await this._fire('change', {data: this._stored, version: this.version, originatorId, barrier});
    }
  }

  async clear(originatorId=null, barrier=null) {
    await this.set(null, originatorId, barrier);
  }
}
