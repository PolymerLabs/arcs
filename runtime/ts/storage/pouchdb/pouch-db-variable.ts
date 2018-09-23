import {assert} from '../../../../platform/assert-web.js';
import {PouchDbStorageProvider} from "./pouch-db-storage-provider";
import {PouchDbStorage} from "./pouch-db-storage";

interface VariableStorage {
  id: string;
  storageKey?: string;  // optional for referencemode
  rawData?: {};
}

interface VariableStorageMutator {
  (value: VariableStorage) : VariableStorage;
}

export class PouchDbVariable extends PouchDbStorageProvider {
  _stored: VariableStorage|null = null;

  private localKeyId = 0;
  
  constructor(type, storageEngine: PouchDbStorage, name: string, id: string, key: string) {
    super(type, storageEngine, name, id, key);
    console.log("VAR new" + ' name='  + name + ' key=' + key + ' id=' + id + ' type=' + type);
    this.backingStore = null;
  }

  backingType() {
    return this.type;
  }

  clone() {
    console.log('VAR clone');
    const variable = new PouchDbVariable(this.type, this.storageEngine, this.name, this.id, null);
    variable.cloneFrom(this);
    return variable;
  }

  async cloneFrom(handle) {
    this.referenceMode = handle.referenceMode;
    const literal = await handle.toLiteral();
    console.log('VAR cloneFrom');

    if (this.referenceMode && literal.model.length > 0) {
      // cloneFrom the backing store data by reading the model and writing it out.
      await Promise.all([this.ensureBackingStore(), handle.ensureBackingStore()]);

      literal.model = literal.model.map(({id, value}) => ({id, value: {id: value.id, storageKey: this.backingStore.storageKey}}));
      const underlying = await handle.backingStore.getMultiple(literal.model.map(({id}) => id));
      await this.backingStore.storeMultiple(underlying, [this.storageKey]);
    }
    
    await this.fromLiteral(literal);

    // TODO(lindner): ask shane why this doesn't fire 'change' events like firebase does...
    if (literal && literal.model && literal.model.length === 1) {
      const newvalue = literal.model[0].value;
      if (newvalue) {
        this.getStoredAndUpdate((stored) => { return newvalue });
      }
    }
  }

  /**
   * Returns data about this variable in the same way as toLiteral,
   * but varied for reference mode.
   */
  async modelForSynchronization() {
    console.log('VAR modelForSync');
    const value = await this.getStored();

    if (this.referenceMode && value !== null) {
      await this.ensureBackingStore();
      const result = await this.backingStore.get(value.id);
      return {
        version: this.version,
        model: [{id: value.id, value: result}]
      };
    }
    
    return super.modelForSynchronization();
  }

  /**
   * Returns the state of this variable based as an object of the form
   * {version, model: [{id, value}]}
   */
  async toLiteral(): Promise<{version: number, model: {}[]}> {
    const value = await this.getStored();

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

  /**
   * Updates the internal state of this variable with data and stores
   * the data in the underlying Pouch Database.
   */
  async fromLiteral({version, model}): Promise<void> {
    console.log('VAR FROMLITERAL');

    const value = model.length === 0 ? null : model[0].value;
    if (this.referenceMode && value && value.rawData) {
      assert(false, `shouldn't have rawData ${JSON.stringify(value.rawData)} here`);
    }
    assert(value !== undefined);
    await this.getStoredAndUpdate((stored) => {
      return value;
    });
    this.version = version;
    // TODO(plindner): Mimic firebase?
    // TODO(plindner): firebase fires 'change' events here...
  }

  /**
   * @return a promise containing the variable value or null if it does not exist.
   */  
  async get() {
    console.log('VAR get id=' + 'refmode=' + this.referenceMode);

    const value = await this.getStored();

    if (this.referenceMode && value) {
      console.log('VAR get refmode=', value);
      try {
        await this.ensureBackingStore();
        const result = await this.backingStore.get(value.id);
        return result;
      } catch (err) {
        console.warn('VAR get', err);
        throw err;
      }
    }

    return value;
  }


  /**
   * Set the value for this variable.
   * @param value the value we want to set.  If null remove the variable from storage
   * @param originatorId TBD
   * @param barrier TBD
   */
  async set(value : {id: string}, originatorId=null, barrier=null) {
    assert(value !== undefined);
    console.log('VAR set', value);

    if (this.referenceMode && value) {
      // Even if this value is identical to the previously written one,
      // we can't suppress an event here because we don't actually have
      // the previous value for comparison (that's down in the backing store).
      // TODO(shans): should we fetch and compare in the case of the ids matching?

      const referredType = this.type;

      const storageKey = this.storageEngine.baseStorageKey(referredType, this.storageKey);

      // Store the indirect pointer to the storageKey
      await this.getStoredAndUpdate((stored) => {
        return {id: value.id, storageKey};
      });

      await this.ensureBackingStore();
      
      // TODO(shans): mutating the storageKey here to provide unique keys is
      // a hack that can be removed once entity mutation is distinct from collection
      // updates. Once entity mutation exists, it shouldn't ever be possible to write
      // different values with the same id. 
      await this.backingStore.store(value, [this.storageKey + this.localKeyId++]);
    } else {
      // If there's a barrier set, then the originating storage-proxy is expecting
      // a result so we cannot suppress the event here.
      // TODO(lindner): determine if this is really needed
      if (JSON.stringify(this._stored) === JSON.stringify(value) &&
          barrier == null) {
        return;
      }

      // Update Pouch/_stored, If value is null delete key, otherwise store it.
      if (value == null) {
        try {
          console.log('VAR remove');
          const doc = await this.db.get(this.pouchDbKey.location);
          await this.db.remove(doc);
        } catch (err) {
          // Deleting an already deleted item is acceptable.
          if (err.name !== 'not_found') {
            console.warn('VAR remove err=', err);
            throw err;
          }
        }
      } else {
        await this.getStoredAndUpdate((stored) => {
          return value;
        });
      }
    }
    // Does anyone look at this?
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


  /**
   * Pouch stored version of _stored.  Requests the value from the
   * database.
   *
   *  - If the fetched revision does not match update the local variable.
   *  - If the value does not exist store a null value.
   * @throw on misc pouch errors.
   */
  private async getStored(): Promise<VariableStorage> {
    try {
      const result = await this.db.get(this.pouchDbKey.location);
      
      // compare revisions
      if (this._rev !== result._rev) {
        // remote revision is different, update local copy.
        this._stored = result['value'];
        this._rev = result._rev;
        this.version++;  // yuck.
        console.log('VAR diff, updating model', result['value']);
        // TODO(lindner): fire change events here?
      }
    } catch (err) {
      if (err.name === 'not_found') {
        this._stored = null
        this._rev = undefined;
      } else {
        console.warn('VAR getStored:', err);
        throw err;
      }
    }
    return this._stored;
  }

  /**
   * Provides a way to apply changes to the stored value in a way that
   * will result in the stored value being written to the underlying
   * PouchDB.
   * 
   * - A new entry is stored if it doesn't exists.
   * - If the existing entry is available it is fetched
   * - If revisions differ a new item is written.
   */
  private async getStoredAndUpdate(variableStorageMutator: VariableStorageMutator): Promise<VariableStorage> {
    console.log('UPDATING STORAGE', this._stored);
    // Keep retrying the operation until it succeeds.
    while (1) {
      let doc;

      let notFound = false;
      try {
        doc = await this.db.get(this.pouchDbKey.location);
        // Check remote doc.
        // TODO(lindner): refactor with getStored above.
        if (this._rev !== doc._rev) {
          // remote revision is different, update local copy.
          this._stored = doc['value'];
          this._rev = doc._rev;
          this.version++;  // yuck.
          console.log('VAR diff, updating model', doc['model']);
          // TODO(lindner): fire change events here?
        }
      } catch (err) {
        if (err.name !== 'not_found') {
          throw err;
        }
        notFound = true;
        // setup basic doc, model/version updated below.
        doc = {
          _id: this.pouchDbKey.location
        };
      }

      // Run the mutator on a copy of the existing model
      const newValue = variableStorageMutator({ ...this._stored });
      
      // Check if the mutator made any changes..
      if (!notFound && JSON.stringify(this._stored) === JSON.stringify(newValue)) {
        // mutator didn't make any changes.
        
        console.log('NOT CHANGED', JSON.stringify(this._stored));
        return this._stored;
      }
      
      // Apply changes made by the mutator
      doc['value'] = newValue;
      doc['version'] = this.version;

      // Update on pouchdb
      try {
        const putResult = await this.db.put(doc);
        console.log('VAR PUTRESULT', putResult, doc);
        // success! update local with new stored value
        this._rev = putResult.rev;
        this._stored = newValue;
        
        return this._stored;
      } catch (err) {
        if (err.name === 'conflict') {
          // keep trying;
        } else {
          // failed to write new doc, give up.
          console.warn('VAR getValue cannot write:', err, doc);
          throw err;
        }
      }
    } // end while (1)

    // can never get here..
    return null;
  }
}
