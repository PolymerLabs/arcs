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
import {ParticleSpec, ConsumeSlotConnectionSpec} from '../particle-spec.js';
import {Type} from '../type.js';

import {HandleConnection} from './handle-connection.js';
import {CloneMap, IsValidOptions, Recipe, RecipeComponent, RequireSection, VariableMap, ToStringOptions} from './recipe.js';
import {TypeChecker} from './type-checker.js';
import {SlotConnection} from './slot-connection.js';
import {Slot} from './slot.js';
import {compareArrays, compareComparables, compareStrings, Comparable} from './comparable.js';
import {Id} from '../id.js';
import {Dictionary} from '../hot.js';

export class Particle implements Comparable<Particle> {
  private readonly _recipe: Recipe;
  private _id?: Id = undefined;
  private _name: string;
  private _localName?: string = undefined;
  spec?: ParticleSpec = undefined;
  private _verbs: string[] = [];
  private _tags: string[] = [];
  private _connections: Dictionary<HandleConnection> = {};

  // TODO: replace with constraint connections on the recipe
  _unnamedConnections: HandleConnection[] = [];

  // map of consumed Slot connections by slot name.
  _consumedSlotConnections: Dictionary<SlotConnection> = {};

  constructor(recipe: Recipe, name: string) {
    assert(recipe);
    this._recipe = recipe;
    this._name = name;
  }

  _copyInto(recipe: Recipe, cloneMap: CloneMap, variableMap: VariableMap) {
    const particle = recipe.newParticle(this._name);
    particle._id = this._id;
    particle._verbs = [...this._verbs];
    particle._tags = [...this._tags];
    particle.spec = this.spec ? this.spec.cloneWithResolutions(variableMap) : undefined;

    Object.keys(this._connections).forEach(key => {
      particle._connections[key] = this._connections[key]._clone(particle, cloneMap);
    });
    particle._unnamedConnections = this._unnamedConnections.map(connection => connection._clone(particle, cloneMap));
    particle._cloneConnectionRawTypes(variableMap);

    for (const key of this.getSlotConnectionNames()) {
      const slotConn = this.getSlotConnectionByName(key);
      particle._consumedSlotConnections[key] = slotConn._clone(particle, cloneMap);

      // if recipe is a requireSection, then slot may already exist in recipe.
      if (cloneMap.has(slotConn.targetSlot)) {
        assert(recipe instanceof RequireSection);
        const targetSlot = cloneMap.get(slotConn.targetSlot) as Slot;
        particle.getSlotConnectionByName(key).connectToSlot(targetSlot);
        if (particle.recipe.slots.indexOf(targetSlot) === -1) {
          particle.recipe.slots.push(targetSlot);
        }
      }
      for (const [name, slot] of Object.entries(slotConn.providedSlots)) {
        if (cloneMap.has(slot)) {
          assert(recipe instanceof RequireSection);
          const clonedSlot = cloneMap.get(slot) as Slot;
          clonedSlot.sourceConnection = particle.getSlotConnectionByName(key);
          particle.getSlotConnectionByName(key).providedSlots[name] = clonedSlot;
          if (particle.recipe.slots.indexOf(clonedSlot) === -1) {
            particle.recipe.slots.push(clonedSlot);
          }
        }
      }
    }

    return particle;
  }

  _cloneConnectionRawTypes(variableMap: VariableMap) {
    for (const connection of Object.values(this._connections)) {
      connection.cloneTypeWithResolutions(variableMap);
    }
    for (const connection of this._unnamedConnections) {
      connection.cloneTypeWithResolutions(variableMap);
    }
  }

  _startNormalize(): void {
    this._localName = null;
    this._verbs.sort();
    this._tags.sort();
    const normalizedConnections = {};
    for (const key of (Object.keys(this._connections).sort())) {
      normalizedConnections[key] = this._connections[key];
    }
    this._connections = normalizedConnections;

    const normalizedSlotConnections = {};
    for (const key of this.getSlotConnectionNames().sort()) {
      normalizedSlotConnections[key] = this.getSlotConnectionByName(key);
    }
    this._consumedSlotConnections = normalizedSlotConnections;
  }

  _finishNormalize(): void {
    this._unnamedConnections.sort(compareComparables);
    Object.freeze(this);
  }

  _compareTo(other: Particle): number {
    let cmp: number;
    if ((cmp = compareStrings(this._id ? this._id.toString() : '', other._id ? other._id.toString() : '')) !== 0) return cmp;
    if ((cmp = compareStrings(this._name, other._name)) !== 0) return cmp;
    if ((cmp = compareStrings(this._localName, other._localName)) !== 0) return cmp;
    // TODO: spec?
    if ((cmp = compareArrays(this._verbs, other._verbs, compareStrings)) !== 0) return cmp;
    if ((cmp = compareArrays(this._tags, other._tags, compareStrings)) !== 0) return cmp;
    // TODO: slots
    return 0;
  }

  /**
   * Param particle matches this particle if the names are the same and the slot and handle requirements this particle
   * is a subset of the slot and handle requirements of the param particle.
   * @param particle
   */
  matches(particle: Particle): boolean {
    if (this.name && particle.name && this.name !== particle.name) return false;
    for (const name of this.getSlotConnectionNames()) {
      const slotConn = this.getSlotConnectionByName(name);
      if (particle.getSlotConnectionByName(name) == undefined
          || particle.getSlotConnectionByName(name).targetSlot == undefined
         ) return false;

      if (slotConn.targetSlot && slotConn.targetSlot.id && slotConn.targetSlot.id !== particle.getSlotConnectionByName(name).targetSlot.id) return false;

      for (const pname of Object.keys(slotConn.providedSlots)) {
        const slot = slotConn.providedSlots[pname];
        const pslot = particle.getSlotConnectionByName(name).providedSlots[pname];
        if (pslot == undefined || (slot.id && pslot.id && slot.id !== pslot.id)) return false;
      }
    }
    return true;
  }

  _isValid(options: IsValidOptions) {
    if (!this.spec) {
      return true;
    }
    if (!this.name && !this.primaryVerb) {
      // Must have either name of a verb
      if (options && options.errors) {
        options.errors.set(this, `Particle has no name and no verb`);
      }
      return false;
    }
    // TODO: What
    return true;
  }

  isResolved(options = undefined) {
    assert(Object.isFrozen(this));
    if (!this.spec) {
      if (options && options.showUnresolved) {
        options.details = 'missing spec';
      }
      return false;
    }
    const slandleConnections = Object.values(this.connections).filter(
      connection => Boolean(connection.type.slandleType())
    );
    if (slandleConnections.length ===0 && this.spec.slotConnections.size > 0) {
      const fulfilledSlotConnections = this.getSlotConnections().filter(connection => connection.targetSlot !== undefined);
      if (fulfilledSlotConnections.length === 0) {
        if (options && options.showUnresolved) {
          options.details = `unfulfilled slot connections ${JSON.stringify([...this.spec.slotConnections])}`;
        }
        return false;
      }
    }
    if (!this.spec) {
      if (options && options.showUnresolved) {
        options.details = 'missing spec';
      }
      return false;
    }
    const unresolvedRequiredConnections = this.getUnboundConnections().filter(connSpec => {
      // A non-optional connection dependent on an optional and unresolved is ok.
      let parent = connSpec.parentConnection;
      while (parent !== null) {
        if (!this.connections[parent.name]) {
          return false;
        }
        parent = parent.parentConnection;
      }
      return true;
    });
    if (unresolvedRequiredConnections.length > 0) {
      if (options && options.showUnresolved) {
        options.details = `unresolved connections: ${unresolvedRequiredConnections.map(c => c.name).join(', ')}`;
      }
      return false;
    }
    if (this.unnamedConnections.length !== 0) {
      if (options && options.showUnresolved) {
        options.details = `${this.unnamedConnections.length} unnamed connections`;
      }
      return false;
    }
    return true;
  }

  get recipe() { return this._recipe; }
  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get id(): Id { return this._id; } // Not resolved until we have an ID.
  set id(id: Id) { assert(!this._id, 'Particle ID can only be set once.'); this._id = id; }
  get name() { return this._name; }
  set name(name) { this._name = name; }
  get connections(): Dictionary<HandleConnection> { return this._connections; } // {parameter -> HandleConnection}
  get unnamedConnections() { return this._unnamedConnections; } // HandleConnection*
  get primaryVerb() { return (this._verbs.length > 0) ? this._verbs[0] : undefined; }
  set verbs(verbs: string[]) { this._verbs = verbs; }
  set tags(tags: string[]) { this._tags = tags; }

  addUnnamedConnection(): HandleConnection {
    const connection = new HandleConnection(undefined, this);
    this._unnamedConnections.push(connection);
    return connection;
  }

  addConnectionName(name: string): HandleConnection {
    assert(name, `Cannot create connection with no name`);
    assert(this._connections[name] == undefined);
    this._connections[name] = new HandleConnection(name, this);
    return this._connections[name];
  }

  allConnections(): HandleConnection[] {
    return Object.values(this._connections).concat(this._unnamedConnections);
  }

  ensureConnectionName(name: string) {
    return this._connections[name] || this.addConnectionName(name);
  }

  getSlotConnectionNames(): string[] {
    return Object.keys(this._consumedSlotConnections);
  }

  getSlandleConnectionByName(name: string): SlotConnection {
    if (name in this._connections) {
      const slandle: SlotConnection = this._connections[name].toSlotConnection();
      return slandle;
    }
    return this._consumedSlotConnections[name];
  }

  getSlandleConnectionBySpec(spec: ConsumeSlotConnectionSpec): SlotConnection {
    return this.getSlandleConnections().find(slotConn => slotConn.getSlotSpec() === spec);
  }

  getSlotConnectionByName(name: string): SlotConnection {
    return this._consumedSlotConnections[name];
  }

  getSlotConnectionBySpec(spec: ConsumeSlotConnectionSpec): SlotConnection {
    return this.getSlotConnections().find(slotConn => slotConn.getSlotSpec() === spec);
  }

  getSlandleConnections(): SlotConnection[] {
    // TODO(jopra): Revisit when slots are removed.
    return [...Object.values(this._consumedSlotConnections), ...this.allConnections().map(conn => conn.direction === '`consumes' && conn.toSlotConnection()).filter(conn => conn)];
  }

  getSlotConnections(): SlotConnection[] {
    // TODO(jopra): Revisit when slots are removed.
    return Object.values(this._consumedSlotConnections);
  }

  getSlotSpecByName(name: string) : ConsumeSlotConnectionSpec|undefined {
    if (!this.spec) return undefined;
    const slot = this.spec.slotConnections.get(name);
    if (slot) return slot;

    // TODO(jopra): Provided slots should always be listed in the particle spec.
    for (const slot of this.spec.slotConnections.values()) {
      for (const provided of slot.provideSlotConnections) {
        if (provided.name === name) return provided;
      }
    }
    return undefined;
  }

  getProvidedSlotByName(consumeName: string, name: string) : Slot {
    const conn = this.getSlotConnectionByName(consumeName);
    return conn && conn.providedSlots[name];
  }

  getSlotSpecs() : Map<string, ConsumeSlotConnectionSpec> {
    if (this.spec) return this.spec.slotConnections;
    return new Map();
  }

  getConnectionByName(name: string) {
    return this._connections[name];
  }

  nameConnection(connection: HandleConnection, name: string) {
    assert(!this._connections[name], `Connection "${name}" already has a handle`);

    const idx = this._unnamedConnections.indexOf(connection);
    assert(idx >= 0, `Cannot name '${name}' nonexistent unnamed connection.`);
    // TODO: FIX: The following is accessing a readonly field illegally.
    // tslint:disable-next-line: no-any
    (connection as any)._name = name;

    const connectionSpec = this.spec.getConnectionByName(name);
    connection.type = connectionSpec.type;
    if (connection.direction !== connectionSpec.direction) {
      assert(connection.direction === 'reads writes',
             `Unnamed connection cannot adjust direction ${connection.direction} to ${name}'s direction ${connectionSpec.direction}`);
      connection.direction = connectionSpec.direction;
    }

    this._connections[name] = connection;
    this._unnamedConnections.splice(idx, 1);
  }

  getUnboundConnections(type?: Type) {
    return this.spec.handleConnections.filter(
        connSpec => !connSpec.isOptional &&
                    !this.getConnectionByName(connSpec.name) &&
                    (!type || TypeChecker.compareTypes({type}, {type: connSpec.type})));
  }


  addSlotConnection(name: string) : SlotConnection {
    assert(!this.getSlotConnectionByName(name), 'slot connection already exists');
    const slandle = this.spec && this.spec.connections.find(conn => conn.name === name);
    const isSlandle = slandle && slandle.type.isSlot();
    const isSetSlandle = slandle && slandle.type.isCollectionType() && slandle.type.getContainedType().isSlot();
    assert(!this.spec || this.spec.slotConnections.has(name) || isSlandle || isSetSlandle, `slot connection '${name}' is not in particle spec`);
    const slotConn = this.addSlotConnectionAsCopy(name);
    const slotSpec = this.getSlotSpecByName(name);
    if (slotSpec) {
      slotSpec.provideSlotConnections.forEach(providedSlot => {
        const slot = this.recipe.newSlot(providedSlot.name);
        slot.sourceConnection = slotConn;
        slotConn.providedSlots[providedSlot.name] = slot;
        // TODO: hook the handles up
      });
    }
    return slotConn;
  }

  addSlotConnectionAsCopy(name: string) : SlotConnection {
    // Called when a recipe and all of it's contents are being cloned.
    // Each slot connection in the existing recipe has to be created for the clone,
    // This method must not create slots for provided slot connections otherwise there
    // will be duplicate slots.
    const slotConn = new SlotConnection(name, this);
    this._consumedSlotConnections[name] = slotConn;
    return slotConn;
  }

  removeSlotConnection(slotConnection: SlotConnection) {
    this._consumedSlotConnections[slotConnection.name] = null;
    slotConnection.disconnectFromSlot();
  }

  remove(): void {
    this.recipe.removeParticle(this);
  }

  isExternalParticle(): boolean {
    return this.spec && this.spec.external;
  }

  toString(options: ToStringOptions = {}, nameMap?: Map<RecipeComponent, string>): string {
    let result: string[] = [];
    // TODO: we need at least name or verb(s)
    if (this.name) {
      result.push(this.name);

      result.push(`as ${(nameMap && nameMap.get(this)) || this.localName}`);
      if (this.primaryVerb && this.primaryVerb !== this.name) {
        result.push(`// verb=${this.primaryVerb}`);
      }
    } else { // verb must exist, if there is no name.
      result.push(`&${this.primaryVerb}`);
    }
    if (options.showUnresolved) {
      if (!this.isResolved(options)) {
        result.push(`// unresolved particle: ${options.details}`);
      }
    }

    result = [result.join(' ')];

    for (const connection of this.unnamedConnections) {
      result.push(connection.toString(nameMap, options).replace(/^|(\n)/g, '$1  '));
    }
    for (const connection of Object.values(this.connections)) {
      result.push(connection.toString(nameMap, options).replace(/^|(\n)/g, '$1  '));
    }
    for (const slotConnection of this.getSlotConnections()) {
      result.push(slotConnection.toString(nameMap, options).replace(/^|(\n)/g, '$1  '));
    }
    return result.join('\n');
  }
}
