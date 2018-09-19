import {assert} from '../../../../platform/assert-web.js';
import {KeyBase} from '../key-base.js';

/**
 * Keys for PouchDb entities.
 */
export class PouchDbKey extends KeyBase {
  private readonly protocol: string;
  // TODO: this should be readonly, but pouch-db-storage manually sets this.
  arcId: string;
  location: string;
  
  constructor(key: string) {
    super();
    let parts = key.split('://');
    this.protocol = parts[0];
    assert(this.protocol === 'pouchdb', `can't construct pouchdb key for protocol ${this.protocol} (input key ${key})`);
    parts = parts[1] ? parts.slice(1).join('://').split('^^') : [];
    this.arcId = parts[0];
    this.location = parts[1];
    assert(this.toString() === key);
  }

  childKeyForHandle(id): PouchDbKey {
    return new PouchDbKey('pouchdb://');
  }

  toString(): string {
    if (this.location !== undefined && this.arcId !== undefined) {
      return `${this.protocol}://${this.arcId}^^${this.location}`;
    }
    if (this.arcId !== undefined) {
      return `${this.protocol}://${this.arcId}`;
    }
    return `${this.protocol}`;
  }
}
