// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import assert from 'assert';
import {Strategizer} from '../../strategizer/strategizer.js';
import ConnectionConstraint from './connection-constraint.js';
import Particle from './particle.js';
import Search from './search.js';
import Slot from './slot.js';
import View from './view.js';
import util from './util.js';

class Recipe {
  constructor() {
    this._particles = [];
    this._views = [];
    this._slots = [];

    // TODO: Recipes should be collections of records that are tagged
    // with a type. Strategies should register the record types they
    // can handle. ConnectionConstraints should be a different record
    // type to particles/views.
    this._connectionConstraints = [];

    // TODO: Change to array, if needed for search strings of merged recipes.
    this._search = null;
  }

  newConnectionConstraint(from, fromConnection, to, toConnection) {
    this._connectionConstraints.push(new ConnectionConstraint(from, fromConnection, to, toConnection));
  }

  removeConstraint(constraint) {
    var idx = this._connectionConstraints.indexOf(constraint);
    assert(idx >= 0);
    this._connectionConstraints.splice(idx, 1);
  }

  clearConnectionConstraints() {
    this._connectionConstraints = [];
  }

  newParticle(name) {
    var particle = new Particle(this, name);
    this._particles.push(particle);
    return particle;
  }

  newView() {
    var view = new View(this);
    this._views.push(view);
    return view;
  }

  newSlot(name) {
    var slot = new Slot(this, name);
    this._slots.push(slot);
    return slot;
  }

  isResolved() {
    assert(Object.isFrozen(this), 'Recipe must be normalized to be resolved.');
    return this._connectionConstraints.length == 0
        && (this._search === null || this._search.isResolved())
        && this._views.every(view => view.isResolved())
        && this._particles.every(particle => particle.isResolved())
        && this._slots.every(slot => slot.isResolved())
        && this.viewConnections.every(connection => connection.isResolved())
        && this.slotConnections.every(connection => connection.isResolved());
  }

  _findDuplicateView() {
    let seenViews = new Set();
    return this._views.find(view => {
      if (view.id) {
        if (seenViews.has(view.id)) {
          return view;
        }
        seenViews.add(view.id);
      }
    });
  }

  _isValid() {
    return !this._findDuplicateView() && this._views.every(view => view._isValid())
        && this._particles.every(particle => particle._isValid())
        && this._slots.every(slot => slot._isValid())
        && this.viewConnections.every(connection => connection._isValid())
        && this.slotConnections.every(connection => connection._isValid())
        && (!this.search || this.search.isValid());
  }

  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get particles() { return this._particles; } // Particle*
  set particles(particles) { this._particles = particles; }
  get views() { return this._views; } // View*
  set views(views) { this._views = views; }
  get slots() { return this._slots; } // Slot*
  set slots(slots) { this._slots = slots; }
  get connectionConstraints() { return this._connectionConstraints; }
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

  get slotConnections() {  // SlotConnection*
    var slotConnections = [];
    this._particles.forEach(particle => {
      slotConnections.push(...Object.values(particle.consumedSlotConnections));
    });
    return slotConnections;
  }

  get viewConnections() {
    var viewConnections = [];
    this._particles.forEach(particle => {
      viewConnections.push(...Object.values(particle.connections));
      viewConnections.push(...particle._unnamedConnections);
    });
    return viewConnections;
  }

  isEmpty() {
    return this.particles.length == 0 &&
           this.views.length == 0 &&
           this.slots.length == 0 &&
           this._connectionConstraints.length == 0;
  }

  findView(id) {
    for (var view of this.views) {
      if (view.id == id)
        return view;
    }
  }

  findSlot(id) {
    for (var slot of this.slots) {
      if (slot.id == id)
        return slot;
    }
  }

  async digest() {
    if (typeof(crypto) != 'undefined' && crypto.subtle) {
      // browser
      let buffer = new TextEncoder('utf-8').encode(this.toString());
      let digest = await crypto.subtle.digest('SHA-1', buffer)
      return Array.from(new Uint8Array(digest)).map(x => ('00' + x.toString(16)).slice(-2)).join('');
    } else {
      // nodejs
      import crypto from 'crypto';
      let sha = crypto.createHash('sha1');
      sha.update(this.toString());
      return sha.digest('hex');
    }
  }

  normalize() {
    if (Object.isFrozen(this)) {
      return;
    }
    if (!this._isValid()) {
      var duplicateView = this._findDuplicateView();
      if (duplicateView)
        console.log(`Has Duplicate View ${duplicateView.id}`);

      let checkForInvalid = (name, list, f) => {
        var invalids = list.filter(item => !item._isValid());
        if (invalids.length > 0)
          console.log(`Has Invalid ${name} ${invalids.map(f)}`)
      }
      checkForInvalid('Views', this._views, view => view.id);
      checkForInvalid('Particles', this._particles, particle => particle.name);
      checkForInvalid('Slots', this._slots, slot => slot.name);
      checkForInvalid('ViewConnections', this.viewConnections, viewConnection => `${viewConnection.particle.name}::${viewConnection.name}`);
      checkForInvalid('SlotConnections', this.slotConnections, slotConnection => slotConnection.name);
      return false;
    }
    // Get views and particles ready to sort connections.
    for (let particle of this._particles) {
      particle._startNormalize();
    }
    for (let view of this._views) {
      view._startNormalize();
    }
    for (let slot of this._slots) {
      slot._startNormalize();
    }

    // Sort and normalize view connections.
    let connections = this.viewConnections;
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

    // Finish normalizing particles and views with sorted connections.
    for (let particle of this._particles) {
      particle._finishNormalize();
    }
    for (let view of this._views) {
      view._finishNormalize();
    }
    for (let slot of this._slots) {
      slot._finishNormalize();
    }

    let seenViews = new Set();
    let seenParticles = new Set();
    let particles = [];
    let views = [];
    for (let connection of connections) {
      if (!seenParticles.has(connection.particle)) {
        particles.push(connection.particle);
        seenParticles.add(connection.particle);
      }
      if (connection.view && !seenViews.has(connection.view)) {
        views.push(connection.view);
        seenViews.add(connection.view);
      }
    }

    let orphanedViews = this._views.filter(view => !seenViews.has(view));
    orphanedViews.sort(util.compareComparables);
    views.push(...orphanedViews);

    let orphanedParticles = this._particles.filter(particle => !seenParticles.has(particle));
    orphanedParticles.sort(util.compareComparables);
    particles.push(...orphanedParticles);

    // TODO: redo slots as above.
    let seenSlots = new Set();
    let slots = [];
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
      })
    }

    // Put particles and views in their final ordering.
    this._particles = particles;
    this._views = views;
    this._slots = slots;
    this._connectionConstraints.sort(util.compareComparables);

    Object.freeze(this._particles);
    Object.freeze(this._views);
    Object.freeze(this._slots);
    Object.freeze(this._connectionConstraints);
    Object.freeze(this);

    return true;
  }

  clone(cloneMap) {
    // for now, just copy everything

    var recipe = new Recipe();

    if (cloneMap == undefined)
      cloneMap = new Map();

    this._copyInto(recipe, cloneMap);

    // TODO: figure out a better approach than stashing the cloneMap permanently
    // on the recipe
    recipe._cloneMap = cloneMap;

    return recipe;
  }

  mergeInto(recipe) {
    var cloneMap = new Map();
    var numViews = recipe._views.length;
    var numParticles = recipe._particles.length;
    var numSlots = recipe._slots.length;
    this._copyInto(recipe, cloneMap);
    return {
      views: recipe._views.slice(numViews),
      particles: recipe._particles.slice(numParticles),
      slots: recipe._slots.slice(numSlots)
    };
  }

  _copyInto(recipe, cloneMap) {
    function cloneTheThing(object) {
      var clonedObject = object._copyInto(recipe, cloneMap);
      cloneMap.set(object, clonedObject);
    }

    this._views.forEach(cloneTheThing);
    this._particles.forEach(cloneTheThing);
    this._slots.forEach(cloneTheThing);
    this._connectionConstraints.forEach(cloneTheThing);
    if (this.search) {
      this.search._copyInto(recipe);
    }
  }

  updateToClone(dict) {
    var result = {};
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
    for (let view of this.views) {
      names.add(view.localName);
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
    for (let view of this.views) {
      let localName = view.localName;
      if (!localName) {
        do {
          localName = `view${i++}`;
        } while (names.has(localName));
      }
      nameMap.set(view, localName);
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

  toString(options) {
    let nameMap = this._makeLocalNameMap();
    let result = [];
    // TODO: figure out where recipe names come from
    result.push(`recipe`);
    if (this.search) {
      result.push(this.search.toString(options).replace(/^|(\n)/g, '$1  '));
    }
    for (let constraint of this._connectionConstraints) {
      let constraintStr = constraint.toString().replace(/^|(\n)/g, '$1  ');
      if (options && options.showUnresolved) {
        constraintStr = constraintStr.concat(' # unresolved connection-constraint');
      }
      result.push(constraintStr);
    }
    for (let view of this.views) {
      result.push(view.toString(nameMap, options).replace(/^|(\n)/g, '$1  '));
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
    return result.join('\n');
  }
}

export default Recipe;
