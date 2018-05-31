// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import {digest} from '../../platform/digest-web.js';
import {Strategizer} from '../../strategizer/strategizer.js';
import {ConnectionConstraint} from './connection-constraint.js';
import {Particle} from './particle.js';
import {Search} from './search.js';
import {Slot} from './slot.js';
import {Handle} from './handle.js';
import * as util from './util.js';

export class Recipe {
  constructor(name) {
    this._particles = [];
    this._handles = [];
    this._slots = [];
    this.name = name;

    // TODO: Recipes should be collections of records that are tagged
    // with a type. Strategies should register the record types they
    // can handle. ConnectionConstraints should be a different record
    // type to particles/handles.
    this._connectionConstraints = [];

    // Obligations are like connection constraints in that they describe
    // required connections between particles/verbs. However, where 
    // connection constraints can be acted upon in order to create these
    // connections, obligations can't be. Instead, they describe requirements
    // that must be discharged before a recipe can be considered to be
    // resolved.
    this._obligations = [];

    this._verbs = [];

    // TODO: Change to array, if needed for search strings of merged recipes.
    this._search = null;

    this._pattern = null;
  }

  newConnectionConstraint(from, to, direction) {
    let result = new ConnectionConstraint(from, to, direction, 'constraint');
    this._connectionConstraints.push(result);
    return result;
  }

  newObligation(from, to, direction) {
    let result = new ConnectionConstraint(from, to, direction, 'obligation');
    this._obligations.push(result);
    return result;
  }
  
  removeObligation(obligation) {
    let idx = this._obligations.indexOf(obligation);
    assert(idx > -1);
    this._obligations.splice(idx, 1);
  }

  removeConstraint(constraint) {
    let idx = this._connectionConstraints.indexOf(constraint);
    assert(idx >= 0);
    this._connectionConstraints.splice(idx, 1);
  }

  clearConnectionConstraints() {
    this._connectionConstraints = [];
  }

  newParticle(name) {
    let particle = new Particle(this, name);
    this._particles.push(particle);
    return particle;
  }

  removeParticle(particle) {
    let idx = this._particles.indexOf(particle);
    assert(idx > -1);
    this._particles.splice(idx, 1);
    for (let slotConnection of Object.values(particle._consumedSlotConnections))
      slotConnection.remove();
  }

  newHandle() {
    let handle = new Handle(this);
    this._handles.push(handle);
    return handle;
  }

  removeHandle(handle) {
    assert(handle.connections.length == 0);
    let idx = this._handles.indexOf(handle);
    assert(idx > -1);
    this._handles.splice(idx, 1);
  }

  newSlot(name) {
    let slot = new Slot(this, name);
    this._slots.push(slot);
    return slot;
  }

  removeSlot(slot) {
    assert(slot.consumeConnections.length == 0);
    let idx = this._slots.indexOf(slot);
    assert(idx > -1);
    this._slots.splice(idx, 1);
  }

  isResolved() {
    assert(Object.isFrozen(this), 'Recipe must be normalized to be resolved.');
    if (this._obligations.length > 0)
      return false;
    return this._connectionConstraints.length == 0
        && (this._search === null || this._search.isResolved())
        && this._handles.every(handle => handle.isResolved())
        && this._particles.every(particle => particle.isResolved())
        && this._slots.every(slot => slot.isResolved())
        && this.handleConnections.every(connection => connection.isResolved())
        && this.slotConnections.every(slotConnection => slotConnection.isResolved());

    // TODO: check recipe level resolution requirements, eg there is no slot loops.
  }

  _findDuplicate(items, options) {
    let seenHandles = new Set();
    let duplicateHandle = items.find(handle => {
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

  _isValid(options) {
    return !this._findDuplicate(this._handles, options)
        && !this._findDuplicate(this._slots, options)
        && this._handles.every(handle => handle._isValid(options))
        && this._particles.every(particle => particle._isValid(options))
        && this._slots.every(slot => slot._isValid(options))
        && this.handleConnections.every(connection => connection._isValid(options))
        && this.slotConnections.every(connection => connection._isValid(options))
        && (!this.search || this.search.isValid(options));
  }

  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get particles() { return this._particles; } // Particle*
  set particles(particles) { this._particles = particles; }
  get handles() { return this._handles; } // Handle*
  set handles(handles) { this._handles = handles; }
  get slots() { return this._slots; } // Slot*
  set slots(slots) { this._slots = slots; }
  get connectionConstraints() { return this._connectionConstraints; }
  get obligations() { return this._obligations; }
  get verbs() { return this._verbs; }
  set verbs(verbs) { this._verbs = verbs; }
  get search() { return this._search; }
  set search(search) {
    this._search = search;
  }
  setSearchPhrase(phrase) {
    assert(!this._search, 'Cannot override search phrase');
    if (phrase) {
      this._search = new Search(phrase);
    }
  }

  get slotConnections() { // SlotConnection*
    let slotConnections = [];
    this._particles.forEach(particle => {
      slotConnections.push(...Object.values(particle.consumedSlotConnections));
    });
    return slotConnections;
  }

  get handleConnections() {
    let handleConnections = [];
    this._particles.forEach(particle => {
      handleConnections.push(...Object.values(particle.connections));
      handleConnections.push(...particle._unnamedConnections);
    });
    return handleConnections;
  }

  isEmpty() {
    return this.particles.length == 0 &&
           this.handles.length == 0 &&
           this.slots.length == 0 &&
           this._connectionConstraints.length == 0;
  }

  findHandle(id) {
    for (let handle of this.handles) {
      if (handle.id == id)
        return handle;
    }
  }

  findSlot(id) {
    for (let slot of this.slots) {
      if (slot.id == id)
        return slot;
    }
  }
  get pattern() { return this._pattern; }
  set pattern(pattern) { this._pattern = pattern; }
  set description(description) {
    let pattern = description.find(desc => desc.name == 'pattern');
    if (pattern) {
      this._pattern = pattern.pattern;
    }
    description.forEach(desc => {
      if (desc.name != 'pattern') {
        let handle = this.handles.find(handle => handle.localName == desc.name);
        assert(handle, `Cannot set description pattern for nonexistent handle ${desc.name}.`);
        handle.pattern = desc.pattern;
      }
    });
  }

  async digest() {
    return digest(this.toString());
  }

  normalize(options) {
    if (Object.isFrozen(this)) {
      if (options && options.errors) {
        options.errors.set(this, 'already normalized');
      }
      return;
    }
    if (!this._isValid()) {
      this._findDuplicate(this._handles, options);
      this._findDuplicate(this._slots, options);
      let checkForInvalid = (list) => list.forEach(item => !item._isValid(options));
      checkForInvalid(this._handles);
      checkForInvalid(this._particles);
      checkForInvalid(this._slots);
      checkForInvalid(this.handleConnections);
      checkForInvalid(this.slotConnections);
      return false;
    }
    // Get handles and particles ready to sort connections.
    for (let particle of this._particles) {
      particle._startNormalize();
    }
    for (let handle of this._handles) {
      handle._startNormalize();
    }
    for (let slot of this._slots) {
      slot._startNormalize();
    }

    // Sort and normalize handle connections.
    let connections = this.handleConnections;
    for (let connection of connections) {
      connection._normalize();
    }
    connections.sort(util.compareComparables);

    // Sort and normalize slot connections.
    let slotConnections = this.slotConnections;
    for (let slotConnection of slotConnections) {
      slotConnection._normalize();
    }
    slotConnections.sort(util.compareComparables);

    if (this.search) {
      this.search._normalize();
    }

    // Finish normalizing particles and handles with sorted connections.
    for (let particle of this._particles) {
      particle._finishNormalize();
    }
    for (let handle of this._handles) {
      handle._finishNormalize();
    }
    for (let slot of this._slots) {
      slot._finishNormalize();
    }

    let seenHandles = new Set();
    let seenParticles = new Set();
    let seenSlots = new Set();
    let particles = [];
    let handles = [];
    let slots = [];
    // Reorder connections so that interfaces come last.
    // TODO: update handle-connection comparison method instead?
    for (let connection of connections.filter(c => !c.type || !c.type.isInterface).concat(connections.filter(c => !!c.type && !!c.type.isInterface))) {
      if (!seenParticles.has(connection.particle)) {
        particles.push(connection.particle);
        seenParticles.add(connection.particle);
      }
      if (connection.handle && !seenHandles.has(connection.handle)) {
        handles.push(connection.handle);
        seenHandles.add(connection.handle);
      }
    }

    for (let slotConnection of slotConnections) {
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

    let orphanedHandles = this._handles.filter(handle => !seenHandles.has(handle));
    orphanedHandles.sort(util.compareComparables);
    handles.push(...orphanedHandles);

    let orphanedParticles = this._particles.filter(particle => !seenParticles.has(particle));
    orphanedParticles.sort(util.compareComparables);
    particles.push(...orphanedParticles);

    let orphanedSlots = this._slots.filter(slot => !seenSlots.has(slot));
    orphanedSlots.sort(util.compareComparables);
    slots.push(...orphanedSlots);

    // Put particles and handles in their final ordering.
    this._particles = particles;
    this._handles = handles;
    this._slots = slots;
    this._connectionConstraints.sort(util.compareComparables);

    Object.freeze(this._particles);
    Object.freeze(this._handles);
    Object.freeze(this._slots);
    Object.freeze(this._connectionConstraints);
    Object.freeze(this);

    return true;
  }

  clone(cloneMap) {
    // for now, just copy everything

    let recipe = new Recipe(this.name);

    if (cloneMap == undefined)
      cloneMap = new Map();

    this._copyInto(recipe, cloneMap);

    // TODO: figure out a better approach than stashing the cloneMap permanently
    // on the recipe
    recipe._cloneMap = cloneMap;

    return recipe;
  }

  mergeInto(recipe) {
    let cloneMap = new Map();
    let numHandles = recipe._handles.length;
    let numParticles = recipe._particles.length;
    let numSlots = recipe._slots.length;
    this._copyInto(recipe, cloneMap);
    return {
      handles: recipe._handles.slice(numHandles),
      particles: recipe._particles.slice(numParticles),
      slots: recipe._slots.slice(numSlots),
      cloneMap
    };
  }

  _copyInto(recipe, cloneMap) {
    function cloneTheThing(object) {
      let clonedObject = object._copyInto(recipe, cloneMap);
      cloneMap.set(object, clonedObject);
    }

    this._handles.forEach(cloneTheThing);
    this._particles.forEach(cloneTheThing);
    this._slots.forEach(cloneTheThing);
    this._connectionConstraints.forEach(cloneTheThing);
    this._obligations.forEach(cloneTheThing);
    recipe.verbs = recipe.verbs.slice();
    if (this.search) {
      this.search._copyInto(recipe);
    }
    if (this.pattern) {
      if (recipe.pattern) {
        // TODO(mmandlis): Join |this.pattern| with the pattern already existing in the recipe.
      } else {
        recipe.pattern = this.pattern;
      }
    }
  }

  updateToClone(dict) {
    let result = {};
    Object.keys(dict).forEach(key => result[key] = this._cloneMap.get(dict[key]));
    return result;
  }

  static over(results, walker, strategy) {
    return Strategizer.over(results, walker, strategy);
  }

  _makeLocalNameMap() {
    let names = new Set();
    for (let particle of this.particles) {
      names.add(particle.localName);
    }
    for (let handle of this.handles) {
      names.add(handle.localName);
    }
    for (let slot of this.slots) {
      names.add(slot.localName);
    }

    let nameMap = new Map();
    let i = 0;
    for (let particle of this.particles) {
      let localName = particle.localName;
      if (!localName) {
        do {
          localName = `particle${i++}`;
        } while (names.has(localName));
      }
      nameMap.set(particle, localName);
    }

    i = 0;
    for (let handle of this.handles) {
      let localName = handle.localName;
      if (!localName) {
        do {
          localName = `handle${i++}`;
        } while (names.has(localName));
      }
      nameMap.set(handle, localName);
    }

    i = 0;
    for (let slot of this.slots) {
      let localName = slot.localName;
      if (!localName) {
        do {
          localName = `slot${i++}`;
        } while (names.has(localName));
      }
      nameMap.set(slot, localName);
    }

    return nameMap;
  }

  // TODO: Add a normalize() which strips local names and puts and nested
  //       lists into a normal ordering.
  //
  // use { showUnresolved: true } in options to see why a recipe can't resolve.
  toString(options) {
    let nameMap = this._makeLocalNameMap();
    let result = [];
    let verbs = this.verbs.length > 0 ? ` ${this.verbs.map(verb => `&${verb}`).join(' ')}` : '';
    result.push(`recipe${this.name ? ` ${this.name}` : ''}${verbs}`);
    if (this.search) {
      result.push(this.search.toString(options).replace(/^|(\n)/g, '$1  '));
    }
    for (let constraint of this._connectionConstraints) {
      let constraintStr = constraint.toString().replace(/^|(\n)/g, '$1  ');
      if (options && options.showUnresolved) {
        constraintStr = constraintStr.concat(' // unresolved connection-constraint');
      }
      result.push(constraintStr);
    }
    for (let handle of this.handles) {
      result.push(handle.toString(nameMap, options).replace(/^|(\n)/g, '$1  '));
    }
    for (let slot of this.slots) {
      let slotString = slot.toString(nameMap, options);
      if (slotString) {
        result.push(slotString.replace(/^|(\n)/g, '$1  '));
      }
    }
    for (let particle of this.particles) {
      result.push(particle.toString(nameMap, options).replace(/^|(\n)/g, '$1  '));
    }
    if (this.pattern || this.handles.find(h => h.pattern)) {
      result.push(`  description \`${this.pattern}\``);
      this.handles.forEach(h => {
        if (h.pattern) {
          result.push(`    ${h.localName} \`${h.pattern}\``);
        }
      });
    }
    if (this._obligations.length > 0) {
      result.push('  obligations');
      for (let obligation of this._obligations) {
        let obligationStr = obligation.toString(nameMap, options).replace(/^|(\n)/g, '$1    ');
        result.push(obligationStr);
      }
    }
    return result.join('\n');
  }
}
