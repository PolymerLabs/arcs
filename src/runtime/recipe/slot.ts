/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';

import {Handle} from './handle.js';
import {CloneMap, IsResolvedOptions, IsValidOptions, Recipe, RecipeComponent, ToStringOptions} from './recipe.js';
import {SlotConnection} from './slot-connection.js';
import {compareArrays, compareComparables, compareStrings, Comparable} from './comparable.js';

export class Slot implements Comparable<Slot> {
  private readonly _recipe: Recipe;
  private _id?: string = undefined;
  private _localName?: string = undefined;
  private _name: string;
  private _tags = <string[]>[];
  private _sourceConnection: SlotConnection | undefined = undefined;
  private _formFactor?: string = undefined;
  private _consumeConnections: SlotConnection[] = [];

  constructor(recipe: Recipe, name: string) {
    assert(recipe);
    this._recipe = recipe;
    this._name = name;
  }

  get recipe(): Recipe { return this._recipe; }
  get id(): string|undefined { return this._id; }
  set id(id: string) { this._id = id; }
  get localName(): string|undefined { return this._localName; }
  set localName(localName) { this._localName = localName; }
  get name(): string { return this._name; }
  set name(name) { this._name = name; }
  get tags() { return this._tags; }
  set tags(tags) { this._tags = tags; }
  get formFactor(): string|undefined { return this._formFactor; }
  set formFactor(formFactor) { this._formFactor = formFactor; }
  get sourceConnection(): SlotConnection|undefined { return this._sourceConnection; }
  set sourceConnection(sourceConnection) { this._sourceConnection = sourceConnection; }
  get consumeConnections(): SlotConnection[] { return this._consumeConnections; }
  get spec() {
    // TODO: should this return something that indicates this isn't available yet instead of
    // the constructed {isSet: false, tags: []}?
    return (this.sourceConnection && this.sourceConnection.getSlotSpec()) ? this.sourceConnection.particle.getSlotSpecByName(this.name) : {isSet: false, tags: []};
  }

  get handles(): Handle[] {
    // TODO(jopra): This lazy initialization is surprising. Consider removing.
    const handles: Handle[] = [];
    if (this.sourceConnection && this.sourceConnection.getSlotSpec()) {
      for (const handleName of this.sourceConnection.particle.getSlotSpecByName(this.name).handles) {
        const handleConn = this.sourceConnection.particle.connections[handleName];
        if (handleConn || handleConn.handle) {
          handles.push(handleConn.handle);
        }
      }
    }
    return handles;
  }

  _copyInto(recipe: Recipe, cloneMap: CloneMap): Slot {
    let slot: Slot = undefined;
    if (cloneMap.has(this)) {
      return cloneMap.get(this) as Slot;
    }
    if (!this.sourceConnection && this.id) {
      slot = recipe.findSlot(this.id);
    }
    if (slot == undefined) {
      slot = recipe.newSlot(this.name);
      slot._id = this.id;
      slot._formFactor = this.formFactor;
      slot._localName = this._localName;
      slot._tags = [...this._tags];
      // the connections are re-established when Particles clone their attached SlotConnection objects.
      slot._sourceConnection = cloneMap.get(this._sourceConnection) as SlotConnection;
      if (slot.sourceConnection) {
        slot.sourceConnection.providedSlots[slot.name] = slot;
      }
    }
    this._consumeConnections.forEach(connection => {
      const clonedConnection = cloneMap.get(connection);

      if (clonedConnection && clonedConnection instanceof SlotConnection && clonedConnection.targetSlot == undefined) {
        clonedConnection.connectToSlot(slot);
      }
    });
    return slot;
  }

  _startNormalize(): void {
    this.localName = null;
    this._tags.sort();
  }

  _finishNormalize(): void {
    // TODO(mmandlis): This was assert(Object.isFroze(this._source)) - but there is no _source.
    // Changing to _sourceConnection makes the assert fail.
    // assert(Object.isFrozen(this._sourceConnection));
    this._consumeConnections.forEach(cc => assert(Object.isFrozen(cc)));
    this._consumeConnections.sort(compareComparables);
    Object.freeze(this);
  }

  _compareTo(other: Slot): number {
    let cmp: number;
    if ((cmp = compareStrings(this.id, other.id)) !== 0) return cmp;
    if ((cmp = compareStrings(this.localName, other.localName)) !== 0) return cmp;
    if ((cmp = compareStrings(this.formFactor, other.formFactor)) !== 0) return cmp;
    if ((cmp = compareArrays(this._tags, other._tags, compareStrings)) !== 0) return cmp;
    return 0;
  }

  findHandleByID(id: string) {
    return this.handles.find(handle => handle.id === id);
  }

  removeConsumeConnection(slotConnection: SlotConnection) {
    const idx = this._consumeConnections.indexOf(slotConnection);
    assert(idx > -1);
    this._consumeConnections.splice(idx, 1);
    if (this._consumeConnections.length === 0) {
      this.remove();
    }
  }

  remove(): void {
    this._recipe.removeSlot(this);
  }

  isResolved(options?: IsResolvedOptions) : boolean {
    assert(Object.isFrozen(this));

    if (options && options.showUnresolved) {
      options.details = [];
      if (!this._sourceConnection) {
        options.details.push('missing source-connection');
      }
      if (!this.id) {
        options.details.push('missing id');
      }
    }

    return Boolean(this._sourceConnection || this.id);
  }

  _isValid(options: IsValidOptions): boolean {
    // TODO: implement
    return true;
  }

  toString(options: ToStringOptions = {}, nameMap?: Map<RecipeComponent, string>): string {
    const result: string[] = [];
    const name = (nameMap && nameMap.get(this)) || this.localName;
    result.push(`${name}:`);
    result.push('slot');
    if (this.id) {
      result.push(`'${this.id}'`);
    }
    if (this.tags.length > 0) {
      result.push(this.tags.map(tag => `#${tag}`).join(' '));
    }
    const includeUnresolved = options.showUnresolved && !this.isResolved(options);
    if (includeUnresolved) {
      result.push(`// unresolved slot: ${options.details}`);
    }

    if (this.id || includeUnresolved) {
      return result.join(' ');
    }

    return '';
  }
}
