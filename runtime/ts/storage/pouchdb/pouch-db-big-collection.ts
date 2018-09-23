import {PouchDbStorageProvider} from "./pouch-db-storage-provider";
import {PouchDbCursor} from "./pouch-db-cursor";
import {assert} from '../../../../platform/assert-web.js';


// TODO(lindner): update to operate like the firebase version
export class PouchDbBigCollection extends PouchDbStorageProvider {
  private items: Map<string, {index: number, value: {}, keys: {[index: string]: number}}>;
  private cursors: Map<number, PouchDbCursor>;
  private cursorIndex: number;

  constructor(type, storageEngine, name, id, key) {
    super(type, storageEngine, name, id, key);
    this.items = new Map();
    this.cursors = new Map();
    this.cursorIndex = 0;
  }

  backingType() {
    return this.type.primitiveType();
  }

  async get(id) {
    const data = this.items.get(id);
    return (data !== undefined) ? data.value : null;
  }

  async store(value, keys, originatorId) {
    assert(keys != null && keys.length > 0, 'keys required');
    this.version++;

    if (!this.items.has(value.id)) {
      this.items.set(value.id, {index: null, value: null, keys: {}});
    }
    const data = this.items.get(value.id);
    data.index = this.version;
    data.value = value;
    keys.forEach(k => data.keys[k] = this.version);
  }

  async remove(id, keys, originatorId) {
    this.version++;
    this.items.delete(id);
  }

  async stream(pageSize) {
    assert(!isNaN(pageSize) && pageSize > 0);
    this.cursorIndex++;
    const cursor = new PouchDbCursor(this.version, this.items.values(), pageSize);
    this.cursors.set(this.cursorIndex, cursor);
    return this.cursorIndex;
  }

  async cursorNext(cursorId) {
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

  cursorClose(cursorId) {
    const cursor = this.cursors.get(cursorId);
    if (cursor) {
      this.cursors.delete(cursorId);
      cursor.close();
    }
  }

  cursorVersion(cursorId) {
    const cursor = this.cursors.get(cursorId);
    return cursor ? cursor.version : null;
  }

  toLiteral() {
    assert(false, "no toLiteral implementation for BigCollection");
  }
}
