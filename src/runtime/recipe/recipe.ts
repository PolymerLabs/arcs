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
import {digest} from '../../platform/digest-web.js';
import {Modality} from '../modality.js';
import {HandleConnectionSpec} from '../particle-spec.js';
import {Schema} from '../schema.js';
import {InterfaceType, Type, TypeVariableInfo} from '../type.js';

import {ConnectionConstraint, EndPoint} from './connection-constraint.js';
import {Direction} from '../manifest-ast-nodes.js';
import {HandleConnection} from './handle-connection.js';
import {Handle} from './handle.js';
import {Particle} from './particle.js';
import {TypeChecker} from './type-checker.js';
import {Search} from './search.js';
import {SlotConnection} from './slot-connection.js';
import {Slot} from './slot.js';
import {compareComparables} from './comparable.js';
import {Cloneable} from './walker.js';
import {Dictionary} from '../hot.js';

export type RecipeComponent = Particle | Handle | HandleConnection | Slot | SlotConnection | EndPoint;
export type CloneMap = Map<RecipeComponent, RecipeComponent>;
export type VariableMap = Map<TypeVariableInfo|Schema, TypeVariableInfo|Schema>;

export type IsResolvedOptions = {showUnresolved?: boolean, details?: string[]}; // TODO(lindner): standardize details
export type IsValidOptions = {errors?: Map<Recipe | RecipeComponent, string>, typeErrors?: string[]};
export type ToStringOptions = {showUnresolved?: boolean, hideFields?: boolean, details?: string[]};

export class Recipe implements Cloneable<Recipe> {
  private readonly _requires: RequireSection[] = [];
  private _particles: Particle[] = [];
  private _handles: Handle[] = [];
  private _slots: Slot[] = [];
  private _name: string | undefined;
  private _localName: string | undefined = undefined;
  private _cloneMap: CloneMap;

  annotation: string | undefined = undefined;
  triggers: [string, string][][] = [];

  // TODO: Recipes should be collections of records that are tagged
  // with a type. Strategies should register the record types they
  // can handle. ConnectionConstraints should be a different record
  // type to particles/handles.
  private readonly _connectionConstraints: ConnectionConstraint[] = [];

  // Obligations are like connection constraints in that they describe
  // required connections between particles/verbs. However, where
  // connection constraints can be acted upon in order to create these
  // connections, obligations can't be. Instead, they describe requirements
  // that must be discharged before a recipe can be considered to be
  // resolved.
  private readonly _obligations: ConnectionConstraint[] = [];
  private _verbs: string[] = [];

  // TODO: Change to array, if needed for search strings of merged recipes.
  private _search: Search | null = null;
  private _patterns: string[] = [];

  constructor(name?: string) {
    this._name = name;
  }

  newConnectionConstraint(from: EndPoint, to: EndPoint, direction: Direction, relaxed: boolean): ConnectionConstraint {
    const result = new ConnectionConstraint(from, to, direction, relaxed, 'constraint');
    this._connectionConstraints.push(result);
    return result;
  }

  newObligation(from: EndPoint, to: EndPoint, direction: Direction, relaxed: boolean): ConnectionConstraint {
    const result = new ConnectionConstraint(from, to, direction, relaxed, 'obligation');
    this._obligations.push(result);
    return result;
  }

  removeObligation(obligation: ConnectionConstraint): void {
    const idx = this._obligations.indexOf(obligation);
    assert(idx > -1);
    this._obligations.splice(idx, 1);
  }

  removeConstraint(constraint: ConnectionConstraint): void {
    const idx = this._connectionConstraints.indexOf(constraint);
    assert(idx >= 0);
    this._connectionConstraints.splice(idx, 1);
  }

  clearConnectionConstraints(): void {
    this._connectionConstraints.length = 0; // truncate
  }

  newRequireSection(): RequireSection {
    const require = new RequireSection(this);
    this._requires.push(require);
    return require;
  }

  newParticle(name: string): Particle {
    const particle = new Particle(this, name);
    this._particles.push(particle);
    return particle;
  }

  removeParticle(particle: Particle) {
    const idx = this._particles.indexOf(particle);
    assert(idx > -1);
    this._particles.splice(idx, 1);
    particle.getSlotConnections().forEach(conn => conn.remove());
  }

  newHandle(): Handle {
    const handle = new Handle(this);
    this._handles.push(handle);
    return handle;
  }

  removeHandle(handle: Handle): void {
    assert(handle.connections.length === 0);
    const idx = this._handles.indexOf(handle);
    assert(idx > -1);
    this._handles.splice(idx, 1);
  }

  newSlot(name: string): Slot {
    const slot = new Slot(this, name);
    this._slots.push(slot);
    return slot;
  }

  addSlot(slot: Slot): void {
    if (this.slots.indexOf(slot) === -1) {
      this.slots.push(slot);
    }
  }

  removeSlot(slot: Slot): void {
    assert(slot.consumeConnections.length === 0);
    let idx = this._slots.indexOf(slot);
    assert(idx > -1);
    this._slots.splice(idx, 1);

    for (const requires of this.requires) {
      idx = requires.slots.indexOf(slot);
      if (idx !== -1) {
        requires.slots.splice(idx, 1);
      }
    }
  }

  isResolved(options?): boolean {
    assert(Object.isFrozen(this), 'Recipe must be normalized to be resolved.');
    const checkThat = (check: boolean, label: string) => {
      if (!check && options && options.errors) {
        options.errors.set(this.name, label);
      }
      return check;
    };
    return checkThat(this._obligations.length === 0, 'unresolved obligations')
    && checkThat(this._connectionConstraints.length === 0, 'unresolved constraints')
    && checkThat(this.requires.every(require => require.isEmpty()), 'unresolved require')
    && checkThat((this._search === null || this._search.isResolved()), 'unresolved search')
    && checkThat(this._handles.every(handle => handle.isResolved()), 'unresolved handles')
    && checkThat(this._particles.every(particle => particle.isResolved(options)), 'unresolved particles')
    && checkThat(this.modality.isResolved(), 'unresolved modality')
    && checkThat(this.allRequiredSlotsPresent(options), 'unresolved required slot')
    && checkThat(this._slots.every(slot => slot.isResolved()), 'unresolved slots')
    && checkThat(this.handleConnections.every(connection => connection.isResolved(options)), 'unresolved handle connections')
    && checkThat(this.slotConnections.every(slotConnection => slotConnection.isResolved(options)), 'unresolved slot connections');
    // TODO: check recipe level resolution requirements, eg there is no slot loops.
  }

  isCompatible(modality: Modality): boolean {
    return this.particles.every(p => !p.spec || p.spec.isCompatible(modality));
  }

  get modality(): Modality {
    return Modality.intersection(
        this.particles.filter(p => Boolean(p.spec && p.spec.slandleConnectionNames().length > 0)).map(p => p.spec.modality));
  }

  allRequiredSlotsPresent(options=undefined): boolean {
    // All required slots and at least one consume slot for each particle must be present in order for the
    // recipe to be considered resolved.
    for (const particle of this.particles) {
      if (particle.spec.slotConnections.size === 0) {
        continue;
      }

      let atLeastOneSlotConnection = false;
      let usesSlandles = false;
      for (const handleSpec of Object.values(particle.spec.connections)) {
        if (handleSpec.type.slandleType()) {
          usesSlandles = true;
        }
      }
      for (const [name, slotSpec] of particle.spec.slotConnections) {
        if (slotSpec.isRequired && !particle.getSlotConnectionByName(name)) {
          if (options && options.errors) {
            options.errors.set(name, `required slot ${name} has no matching connection`);
          }
          return false;
        }
        // required provided slots are only required when the corresponding consume slot connection is present
        if (particle.getSlotConnectionByName(name)) {
          atLeastOneSlotConnection = true;
          for (const providedSlotSpec of slotSpec.provideSlotConnections) {
            if (providedSlotSpec.isRequired && !particle.getProvidedSlotByName(name, providedSlotSpec.name)) {
              if (options && options.errors) {
                options.errors.set(name, `required provided slot ${providedSlotSpec.name} has no matching connection`);
              }
              return false;
            }
          }
        }
      }

      // TODO: Remove check for slots in SLANDLESv2
      if (!usesSlandles && !atLeastOneSlotConnection) {
        if (options && options.errors) {
          options.errors.set(`?`, `no slot connections`);
        }
        return false;
      }
    }
    return true;
  }

  private _findDuplicate(items, options: IsValidOptions) {
    const seenHandles = new Set();
    const duplicateHandle = items.find(handle => {
      if (handle.id) {
        if (seenHandles.has(handle.id)) {
          return handle;
        }
        seenHandles.add(handle.id);
      }
    });
    if (duplicateHandle && options && options.errors) {
      options.errors.set(duplicateHandle, `Has Duplicate ${duplicateHandle instanceof Handle ? 'Handle' : 'Slot'} '${duplicateHandle.id}'`);
    }
    return duplicateHandle;
  }

  _isValid(options: IsValidOptions = undefined): boolean {
    const checkAllValid = (list: {_isValid: (options: IsValidOptions) => boolean}[]) => list.every(
      item => item._isValid(options)
    );
    return !this._findDuplicate(this._handles, options)
        && !this._findDuplicate(this._slots, options)
        && checkAllValid(this._handles)
        && checkAllValid(this._particles)
        && checkAllValid(this._slots)
        && checkAllValid(this.handleConnections)
        && checkAllValid(this.slotConnections)
        && (!this.search || this.search.isValid());
  }

  get requires(): RequireSection[] { return this._requires; }
  get name(): string | undefined { return this._name; }
  set name(name: string | undefined) { this._name = name; }
  get localName(): string { return this._localName; }
  set localName(name) { this._localName = name; }
  get particles(): Particle[] { return this._particles; }
  set particles(particles: Particle[]) { this._particles = particles; }
  get handles(): Handle[] { return this._handles; }
  set handles(handles: Handle[]) { this._handles = handles; }
  get slots(): Slot[] { return this._slots; }
  set slots(slots: Slot[]) { this._slots = slots; }
  get connectionConstraints(): ConnectionConstraint[] { return this._connectionConstraints; }
  get obligations(): ConnectionConstraint[] { return this._obligations; }
  get verbs(): string[] { return this._verbs; }
  set verbs(verbs: string[]) { this._verbs = verbs; }
  get search(): Search | null { return this._search; }
  set search(search: Search | null) {
    this._search = search;
  }

  setSearchPhrase(phrase?: string): void {
    assert(!this._search, 'Cannot override search phrase');
    if (phrase) {
      this._search = new Search(phrase);
    }
  }

  get slotConnections(): SlotConnection[] {
    // TODO: Is this the correct api?
    const slotConnections: SlotConnection[] = [];
    this._particles.forEach(particle => {
      slotConnections.push(...particle.getSlotConnections());
    });
    return slotConnections;
  }

  get handleConnections(): HandleConnection[] {
    const handleConnections: HandleConnection[] = [];
    this._particles.forEach(particle => {
      handleConnections.push(...Object.values(particle.connections));
      handleConnections.push(...particle._unnamedConnections);
    });
    return handleConnections;
  }

  isEmpty(): boolean {
    return this.particles.length === 0 &&
           this.handles.length === 0 &&
           this.slots.length === 0 &&
           this._connectionConstraints.length === 0;
  }

  findHandle(id: string): Handle {
    for (const handle of this.handles) {
      if (handle.id === id) {
        return handle;
      }
    }
    return null;
  }

  findSlot(id: string): Slot {
    for (const slot of this.slots) {
      if (slot.id === id) {
        return slot;
      }
    }
    return null;
  }

  findParticle(id: string): Particle {
    for (const particle of this.particles) {
      if (particle.id.toString() === id) {
        return particle;
      }
    }
    return null;
  }

  get patterns(): string[] {
    return this._patterns;
  }

  set patterns(patterns: string[]) {
    this._patterns = patterns;
  }

  set description(description) {
    const pattern = description.find(desc => desc.name === 'pattern');
    if (pattern) {
      pattern.patterns.forEach(pattern => this._patterns.push(pattern));
    }
    description.forEach(desc => {
      if (desc.name !== 'pattern') {
        const handle = this.handles.find(handle => handle.localName === desc.name);
        assert(handle, `Cannot set description pattern for nonexistent handle ${desc.name}.`);
        handle.pattern = desc.pattern;
      }
    });
  }

  async digest() {
    return digest(this.toString());
  }

  normalize(options?: IsValidOptions): boolean {
    if (Object.isFrozen(this)) {
      if (options && options.errors) {
        options.errors.set(this, 'already normalized');
      }
      return false;
    }
    if (!this._isValid()) {
      this._findDuplicate(this._handles, options);
      this._findDuplicate(this._slots, options);
      const checkForInvalid = (list) => list.forEach(item => !item._isValid(options));
      checkForInvalid(this._handles);
      checkForInvalid(this._particles);
      checkForInvalid(this._slots);
      checkForInvalid(this.handleConnections);
      checkForInvalid(this.slotConnections);
      return false;
    }
    // Get handles and particles ready to sort connections.
    for (const particle of this._particles) {
      particle._startNormalize();
    }
    for (const handle of this._handles) {
      handle._startNormalize();
    }
    for (const slot of this._slots) {
      slot._startNormalize();
    }

    // Sort and normalize handle connections.
    const connections = this.handleConnections;
    for (const connection of connections) {
      connection._normalize();
    }
    connections.sort(compareComparables);

    // Sort and normalize slot connections.
    const slotConnections = this.slotConnections;
    for (const slotConnection of slotConnections) {
      slotConnection._normalize();
    }
    slotConnections.sort(compareComparables);

    if (this.search) {
      this.search._normalize();
    }

    for (const require of this.requires) {
      require.normalize();
    }

    // Finish normalizing particles and handles with sorted connections.
    for (const particle of this._particles) {
      particle._finishNormalize();
    }
    for (const handle of this._handles) {
      handle._finishNormalize();
    }
    for (const slot of this._slots) {
      slot._finishNormalize();
    }

    const seenHandles = new Set<Handle>();
    const seenParticles = new Set<Particle>();
    const seenSlots = new Set<Slot>();
    const particles: Particle[] = [];
    const handles: Handle[] = [];
    const slots: Slot[] = [];

    // Reorder connections so that interfaces come last.
    // TODO: update handle-connection comparison method instead?
    let ordered = connections.filter(c => !c.type || !(c.type instanceof InterfaceType));
    ordered = ordered.concat(connections.filter(c => !!c.type && !!(c.type instanceof InterfaceType)));
    for (const connection of ordered) {
      if (!seenParticles.has(connection.particle)) {
        particles.push(connection.particle);
        seenParticles.add(connection.particle);
      }
      if (connection.handle && !seenHandles.has(connection.handle)) {
        handles.push(connection.handle);
        seenHandles.add(connection.handle);
      }
    }

    for (const slotConnection of slotConnections) {
      if (slotConnection.targetSlot && !seenSlots.has(slotConnection.targetSlot)) {
        slots.push(slotConnection.targetSlot);
        seenSlots.add(slotConnection.targetSlot);
      }
      Object.values(slotConnection.providedSlots).forEach(ps => {
        if (!seenSlots.has(ps)) {
          slots.push(ps);
          seenSlots.add(ps);
        }
      });
    }

    const orphanedHandles = this._handles.filter(handle => !seenHandles.has(handle));
    orphanedHandles.sort(compareComparables);
    handles.push(...orphanedHandles);

    const orphanedParticles = this._particles.filter(particle => !seenParticles.has(particle));
    orphanedParticles.sort(compareComparables);
    particles.push(...orphanedParticles);

    const orphanedSlots = this._slots.filter(slot => !seenSlots.has(slot));
    orphanedSlots.sort(compareComparables);
    slots.push(...orphanedSlots);

    // Put particles and handles in their final ordering.
    this._particles = particles;
    this._handles = handles;
    this._slots = slots;
    this._connectionConstraints.sort(compareComparables);

    this._verbs.sort();
    this._patterns.sort();

    Object.freeze(this._particles);
    Object.freeze(this._handles);
    Object.freeze(this._slots);
    Object.freeze(this._connectionConstraints);
    Object.freeze(this);

    return true;
  }

  clone(map: Map<RecipeComponent, RecipeComponent> = undefined): Recipe {
    // for now, just copy everything

    const recipe = new Recipe(this.name);

    if (map == undefined) {
      map = new Map();
    }

    this._copyInto(recipe, map);

    // TODO: figure out a better approach than stashing the cloneMap permanently
    // on the recipe
    recipe._cloneMap = map;

    return recipe;
  }

  // tslint:disable-next-line: no-any
  mergeInto(recipe: Recipe): {handles: Handle[], particles: Particle[], slots: Slot[], cloneMap: Map<any, any>}   {
    const cloneMap = new Map<RecipeComponent, RecipeComponent>();
    const numHandles = recipe._handles.length;
    const numParticles = recipe._particles.length;
    const numSlots = recipe._slots.length;
    this._copyInto(recipe, cloneMap);
    return {
      handles: recipe._handles.slice(numHandles),
      particles: recipe._particles.slice(numParticles),
      slots: recipe._slots.slice(numSlots),
      cloneMap
    };
  }

  _copyInto(recipe: Recipe, cloneMap: CloneMap): void {
    const variableMap = new Map<TypeVariableInfo|Schema, TypeVariableInfo|Schema>();

    const cloneTheThing = (ob) => {
      const clonedObject = ob._copyInto(recipe, cloneMap, variableMap);
      cloneMap.set(ob, clonedObject);
    };

    recipe._name = this.name;
    recipe._verbs = recipe._verbs.concat(...this._verbs);
    this._handles.forEach(cloneTheThing);
    this._particles.forEach(cloneTheThing);
    this._slots.forEach(cloneTheThing);
    this._connectionConstraints.forEach(cloneTheThing);
    this._obligations.forEach(cloneTheThing);
    recipe.verbs = recipe.verbs.slice();
    if (this.search) {
      this.search._copyInto(recipe);
    }
    for (const require of this.requires) {
      const newRequires = recipe.newRequireSection();
      require._copyInto(newRequires, cloneMap);
      newRequires._cloneMap = cloneMap;
    }

    recipe.patterns = recipe.patterns.concat(this.patterns);
  }

  // tslint:disable-next-line: no-any
  updateToClone(dict: Dictionary<any>): Dictionary<any> {
    const result = {};
    Object.keys(dict).forEach(key => result[key] = this._cloneMap.get(dict[key]));
    return result;
  }

  _makeLocalNameMap() {
    const names = new Set<string>(
      [...this.particles,
       ...this.handles,
       ...this.slots].map(
        (item) => item.localName)
    );

    let i: number;
    const nameMap = new Map();
    const mapName = (item: {localName: string }, prefix: string) => {
      let localName = item.localName;
      if (!localName) {
        do {
          localName = `${prefix}${i++}`;
        } while (names.has(localName));
      }
      nameMap.set(item, localName);
    };

    i = 0;
    this.particles.forEach(particle => mapName(particle, 'particle'));
    i = 0;
    this.handles.forEach(handle => mapName(handle, 'handle'));
    i = 0;
    this.slots.forEach(slot => mapName(slot, 'slot'));

    return nameMap;
  }

  // TODO: Add a normalize() which strips local names and puts and nested
  //       lists into a normal ordering.
  //
  // use { showUnresolved: true } in options to see why a recipe can't resolve.
  toString(options?: ToStringOptions): string {
    const nameMap = this._makeLocalNameMap();
    const result: string[] = [];
    const verbs = this.verbs.length > 0 ? ` ${this.verbs.map(verb => `&${verb}`).join(' ')}` : '';
    result.push(`recipe${this.name ? ` ${this.name}` : ''}${verbs}`);
    if (options && options.showUnresolved) {
      if (this.search) {
        result.push(this.search.toString(options).replace(/^|(\n)/g, '$1  '));
      }
    }
    for (const constraint of this._connectionConstraints) {
      let constraintStr = constraint.toString().replace(/^|(\n)/g, '$1  ');
      if (options && options.showUnresolved) {
        constraintStr = constraintStr.concat(' // unresolved connection-constraint');
      }
      result.push(constraintStr);
    }
    result.push(...this.handles
        .map(h => h.toString(options, nameMap))
        .filter(strValue => strValue)
        .map(strValue => strValue.replace(/^|(\n)/g, '$1  ')));
    for (const slot of this.slots) {
      const slotString = slot.toString(options, nameMap);
      if (slotString) {
        result.push(slotString.replace(/^|(\n)/g, '$1  '));
      }
    }
    for (const require of this.requires) {
      if (!require.isEmpty()) result.push(require.toString(options, nameMap).replace(/^|(\n)/g, '$1  '));
    }
    for (const particle of this.particles) {
      result.push(particle.toString(options, nameMap).replace(/^|(\n)/g, '$1  '));
    }
    if (this.patterns.length > 0 || this.handles.find(h => h.pattern !== undefined)) {
      result.push(`  description \`${this.patterns[0]}\``);
      for (let i = 1; i < this.patterns.length; ++i) {
        result.push(`    pattern \`${this.patterns[i]}\``);
      }
      this.handles.forEach(h => {
        if (h.pattern) {
          result.push(`    ${h.localName} \`${h.pattern}\``);
        }
      });
    }
    if (this._obligations.length > 0) {
      result.push('  obligations');
      for (const obligation of this._obligations) {
        const obligationStr = obligation.toString(nameMap).replace(/^|(\n)/g, '$1    ');
        result.push(obligationStr);
      }
    }
    return result.join('\n');
  }

  getFreeHandles(): Handle[] {
    return this.handles.filter(handle => handle.connections.length === 0);
  }

  get allSpecifiedConnections(): {particle: Particle, connSpec: HandleConnectionSpec}[] {
    return ([] as {particle: Particle, connSpec: HandleConnectionSpec}[]).concat(
      ...this.particles.filter(p => p.spec && p.spec.connections).map(
        particle => particle.spec.connections.map(connSpec => ({particle, connSpec}))));
  }

  getFreeConnections(type?: Type): {particle: Particle, connSpec: HandleConnectionSpec}[] {
    // TODO(jopra): Check that this works for required connections that are
    // dependent on optional connections.
    return this.allSpecifiedConnections.filter(
        ({particle, connSpec}) => !connSpec.isOptional &&
                                  connSpec.name !== 'descriptions' &&
                                  connSpec.direction !== 'hosts' &&
                                  !particle.connections[connSpec.name] &&
                                  (!type || TypeChecker.compareTypes({type}, {type: connSpec.type})));
  }

  findHandleByID(id: string): Handle|undefined {
    return this.handles.find(handle => handle.id === id);
  }

  getUnnamedUntypedConnections(): HandleConnection|undefined {
    return this.handleConnections.find(hc => !hc.type || !hc.name || hc.isOptional);
  }

  getParticlesByImplFile(files: Set<string>): Particle[] {
    return this.particles.filter(particle => particle.spec && files.has(particle.spec.implFile));
  }

  // overridded by RequireSection
  findSlotByID(id: string): Slot|undefined {
    let slot = this.slots.find(s => s.id === id);
    if (slot === undefined) {
      for (const require of this.requires) {
        slot = require.slots.find(s => s.id === id);
        if (slot !== undefined) break;
      }
    }
    return slot;
  }

  get isLongRunning(): boolean {
    return this.triggers.some(group =>
        group.some(trigger => trigger[0] === 'launch' && trigger[1] === 'startup')
        && group.some(trigger => trigger[0] === 'arcId' && !!trigger[1]));
  }
}

export class RequireSection extends Recipe {
  public readonly parent: Recipe;

  constructor(parent: Recipe, name?: string) {
    super(name);
    this.parent = parent;
  }

  findSlotByID(id: string): Slot|undefined {
    let slot = this.slots.find(s => s.id === id);
    if (slot === undefined) {
      slot = this.parent.slots.find(s => s.id === id);
    }
    return slot;
  }

  toString(options: ToStringOptions = {}, nameMap?: Map<RecipeComponent, string>): string {
    if (nameMap == undefined) {
      nameMap = this._makeLocalNameMap();
    }
    const result: string[] = [];
    result.push(`require`);
    if (options.showUnresolved) {
      if (this.search) {
        result.push(this.search.toString(options).replace(/^|(\n)/g, '$1  '));
      }
    }
    for (const constraint of this.connectionConstraints) {
      let constraintStr = constraint.toString().replace(/^|(\n)/g, '$1  ');
      if (options.showUnresolved) {
        constraintStr = constraintStr.concat(' // unresolved connection-constraint');
      }
      result.push(constraintStr);
    }
    result.push(...this.handles
        .map(h => h.toString(options, nameMap))
        .filter(strValue => strValue)
        .map(strValue => strValue.replace(/^|(\n)/g, '$1  ')));
    for (const slot of this.slots) {
      const slotString = slot.toString(options, nameMap);
      if (slotString) {
        result.push(slotString.replace(/^|(\n)/g, '$1  '));
      }
    }
    for (const particle of this.particles) {
      result.push(particle.toString(options, nameMap).replace(/^|(\n)/g, '$1  '));
    }
    if (this.patterns.length > 0 || this.handles.find(h => h.pattern !== undefined)) {
      result.push(`  description \`${this.patterns[0]}\``);
      for (let i = 1; i < this.patterns.length; ++i) {
        result.push(`    pattern \`${this.patterns[i]}\``);
      }
      this.handles.forEach(h => {
        if (h.pattern) {
          result.push(`    ${h.localName} \`${h.pattern}\``);
        }
      });
    }
    if (this.obligations.length > 0) {
      result.push('  obligations');
      for (const obligation of this.obligations) {
        const obligationStr = obligation.toString(nameMap).replace(/^|(\n)/g, '$1    ');
        result.push(obligationStr);
      }
    }
    return result.join('\n');
  }
}
