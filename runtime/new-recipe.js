// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = require('assert');
var Strategizer = require('../strategizer/strategizer.js').Strategizer;

function compareNulls(o1, o2) {
  if (o1 == o2) return 0;
  if (o1 == null) return -1;
  return 1;
}
function compareStrings(s1, s2) {
  if (s1 == null || s2 == null) return compareNulls(s1, s2);
  return s1.localeCompare(s2);
}
function compareNumbers(n1, n2) {
  if (n1 == null || n2 == null) return compareNulls(n1, n2);
  return n1 - n2;
}
function compareBools(b1, b2) {
  if (b1 == null || b2 == null) return compareNulls(b1, b2);
  return b1 - b2;
}
function compareArrays(a1, a2, compare) {
  assert(a1 != null);
  assert(a2 != null);
  if (a1.length != a2.length) return compareNumbers(a1.length, a2.length);
  for (let i = 0; i < a1.length; i++) {
    let result;
    if ((result = compare(a1[i], a2[i])) != 0) return result;
  }
  return 0;
}
function compareObjects(o1, o2, compare) {
  let keys = Object.keys(o1);
  let result;
  if ((result = compareNumbers(keys.length, Object.keys(o2).length)) != 0) return result;
  for (let key of keys) {
    if ((result = compare(o1[key], o2[key])) != 0) return result;
  }
  return 0;
}
function compareComparables(o1, o2) {
  if (o1 == null || o2 == null) return compareNulls(o1, o2);
  return o1._compareTo(o2);
}

class Node {
  constructor(recipe) {
    assert(recipe);
    this._recipe = recipe;
  }
}

class Edge {
  constructor(recipe) {
    assert(recipe);
    this._recipe = recipe;
  }
}

class Connection extends Edge {
}

class Particle extends Node {
  constructor(recipe, name) {
    super(recipe);
    this._id = undefined;
    this._name = name;
    this._localName = undefined;
    this._spec = undefined;
    this._tags = [];
    this._providedSlots = [];
    this._consumedSlots = [];
    this._connections = {};
    this._unnamedConnections = [];
  }

  clone(recipe, cloneMap) {
    var particle = new Particle(recipe, this._name);
    particle._id  = this._id;
    particle._tags = [...this._tags];
    particle._providedSlots = this._providedSlots.map(slotConn => slotConn.clone(particle, cloneMap));
    particle._consumedSlots = this._consumedSlots.map(slotConn => slotConn.clone(particle, cloneMap));
    Object.keys(this._connections).forEach(key => {
      particle._connections[key] = this._connections[key].clone(particle, cloneMap);
      cloneMap.set(this._connections[key], particle._connections[key]);
    });
    particle._unnamedConnections = this._unnamedConnections.map(connection => connection.clone(particle, cloneMap));

    return particle;
  }

  _startNormalize() {
    this._localName = null;
    this._tags.sort();
    let normalizedConnections = {};
    for (let key of (Object.keys(this._connections).sort())) {
      normalizedConnections[key] = this._connections[key];
    }
    this._connections = normalizedConnections;
  }

  _finishNormalize() {
    this._unnamedConnections.sort(compareComparables);
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = compareStrings(this._id, other._id)) != 0) return cmp;
    if ((cmp = compareStrings(this._name, other._name)) != 0) return cmp;
    if ((cmp = compareStrings(this._localName, other._localName)) != 0) return cmp;
    // TODO: spec?
    if ((cmp = compareArrays(this._tags, other._tags, compareStrings)) != 0) return cmp;
    // TODO: slots
    return 0;
  }

  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get id() { return this._id; } // Not resolved until we have an ID.
  get name() { return this._name; }
  get spec() { return this._spec; }
  set spec(spec) { this._spec = spec; }
  get tags() { return this._tags; }
  set tags(tags) { this._tags = tags; }
  get providedSlots() { return this._providedSlots; } // SlotConnection*
  get consumedSlots() { return this._consumedSlots; } // SlotConnection*
  get connections() { return this._connections; } // {parameter -> ViewConnection}
  get unnamedConnections() { return this._unnamedConnections; } // ViewConnection*

  addUnnamedConnection() {
    var connection = new ViewConnection(undefined, this);
    this._unnamedConnections.push(connection);
    return connection;
  }

  addConnectionName(name) {
    assert(this._connections[name] == undefined);
    this._connections[name] = new ViewConnection(name, this);
    return this._connections[name];
  }

  nameConnection(connection, name) {
    var idx = this._unnamedConnections.indexOf(connection);
    assert(idx >= 0);
    connection._name = name;
    this._connections[name] = connection;
    this._unnamedConnections.splice(idx, 1);
  }

  addSlotConnection(name, direction) {
    let slots = direction == "consume" ? this.consumedSlots : this.providedSlots;
    slots.push(new SlotConnection(name, direction, this));
    return slots[slots.length - 1];
  }

  isResolved() {
    if (this.id == undefined)
      return false;
    if (this._unnamedConnections.length > 0)
      return false;
    if (Object.entries(this.connections).filter(a => !a.isResolved()).length > 0)
      return false;
    return true;
  }

  toString(nameMap) {
    let result = [];
    // TODO: we need at least name or tags
    result.push(this.name);
    result.push(...this.tags);
    result.push(`as ${(nameMap && nameMap.get(this)) || this.localName}`)
    result = [result.join(' ')];
    for (let connection of this.unnamedConnections) {
      result.push(connection.toString(nameMap).replace(/^|(\n)/g, '$1  '));
    }
    for (let connection of Object.values(this.connections)) {
      result.push(connection.toString(nameMap).replace(/^|(\n)/g, '$1  '));
    }
    return result.join('\n')
  }
}

class View extends Node {
  constructor(recipe) {
    super(recipe);
    this._id = undefined;
    this._localName = undefined;
    this._tags = [];
    this._type = undefined;
    this._create = false;
    this._connections = [];
  }

  clone(recipe) {
    var view = new View(recipe);
    view._id = this._id;
    view._tags = [...this._tags];
    view._type = this._type;
    view._create = this._create;

    // the connections are re-established when Particles clone their
    // attached ViewConnection objects.
    view._connections = [];
    return view;
  }

  _startNormalize() {
    this._localName = null;
    this._tags.sort();
    // TODO: type?
  }

  _finishNormalize() {
    for (let connection of this._connections) {
      assert(Object.isFrozen(connection));
    }
    this._connections.sort(compareComparables);
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = compareStrings(this._id, other._id)) != 0) return cmp;
    if ((cmp = compareStrings(this._localName, other._localName)) != 0) return cmp;
    if ((cmp = compareArrays(this._tags, other._tags, compareStrings)) != 0) return cmp;
    // TODO: type?
    if ((cmp = compareNumbers(this._create, other._create)) != 0) return cmp;
    return 0;
  }

  // a resolved View has either an id or create=true
  get tags() { return this._tags; } // only tags owned by the view
  set tags(tags) { this._tags = tags; }
  get type() { return this._type; } // nullable
  get id() { return this._id; }
  set id(id) { this._id = id; }
  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get create() { return this._create; }
  set create(create) { this._create = create; }
  get connections() { return this._connections } // ViewConnection*

  isResolved() {
    return (this._id !== undefined || this._create == true) && this._type !== undefined;
  }

  toString(nameMap) {
    // TODO: type? maybe output in a comment
    let result = [];
    result.push(this.create ? 'create' : 'map');
    if (this.id) {
      result.push(`'${this.id}'`);
    }
    result.push(...this.tags);
    result.push(`as ${(nameMap && nameMap.get(this)) || this.localName}`);
    return result.join(' ');
  }
}

class ViewConnection extends Connection {
  constructor(name, particle) {
    assert(particle);
    super(particle._recipe);
    this._name = name;
    this._tags = [];
    this._type = undefined;
    this._direction = undefined;
    this._particle = particle;
    this._view = undefined;
  }

  clone(particle, cloneMap) {
    if (cloneMap.has(this)) {
      return cloneMap.get(this);
    }
    var viewConnection = new ViewConnection(this._name, particle);  // Note: This is the original, not the cloned particle, is it a right?
    viewConnection._tags = [...this._tags];
    viewConnection._type = this._type;
    viewConnection._direction = this._direction;
    if (this._view != undefined) {
      viewConnection._view = cloneMap.get(this._view);
      viewConnection._view.connections.push(viewConnection);
    }
    cloneMap.set(this, viewConnection);
    return viewConnection;
  }

  _normalize() {
    this._tags.sort();
    // TODO: type?
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = compareComparables(this._particle, other._particle)) != 0) return cmp;
    if ((cmp = compareComparables(this._view, other._view)) != 0) return cmp;
    if ((cmp = compareStrings(this._name, other._name)) != 0) return cmp;
    if ((cmp = compareArrays(this._tags, other._tags, compareStrings)) != 0) return cmp;
    // TODO: add type comparison
    // if ((cmp = compareStrings(this._type, other._type)) != 0) return cmp;
    if ((cmp = compareStrings(this._direction, other._direction)) != 0) return cmp;
    return 0;
  }

  get name() { return this._name; } // Parameter name?
  get tags() { return this._tags; }
  set tags(tags) { this._tags = tags; }
  get type() { return this._type; }
  set type(type) { this._type = type;}
  get direction() { return this._direction; } // in/out
  set direction(direction) { this._direction = direction; }
  get view() { return this._view; } // View?
  get particle() { return this._particle; } // never null

  isResolved() {
    return this.hasDefinedType() && this.view && this.view.isResolved();
  }

  hasDefinedType() {
    return this._type !== undefined && this._direction !== undefined;
  }

  connectToView(view) {
    assert(view._recipe == this._recipe);
    if (this._type !== undefined) {
      if (view._type == undefined)
        view._type = this._type;
      else
        assert(this_type == view._type);
    } else if (view._type !== undefined) {
        this._type = view._type;
    }
    this._view = view;
    this._view.connections.push(this);
  }

  toString(nameMap) {
    let result = [];
    result.push(this.name || '*');
    // TODO: better deal with unspecified direction.
    result.push({'in': '<-', 'out': '->', 'inout': '='}[this.direction] || this.direction || '=');
    if (this.view) {
      result.push(`${(nameMap && nameMap.get(this.view)) || this.view.localName}`);
    }
    result.push(...this.tags);
    return result.join(' ');
  }
}

class SlotConnection extends Connection {
  constructor(name, direction, particle) {
    assert(particle);
    super(particle._recipe);
    this._name = name;  // name is unique across same Particle's provided slots.
    this._slot = undefined;
    this._particle = particle;  // consumer / provider
    this._tags = []
    this._viewConnections = [];
    this._direction = direction;
    this._formFactors = [];
    this._required = true;  // TODO: support optional slots; currently every slot is required.
  }

  clone(particle, cloneMap) {
    var slotConnection = new SlotConnection(this._name, this._direction, particle);
    slotConnection._tags = [...this._tags];
    slotConnection._formFactors = [...this._formFactors];
    slotConnection._required = this._required;
    if (this._slot != undefined) {
      slotConnection.connectToSlot(cloneMap.get(this._slot));
    }
    this._viewConnections.forEach(viewConn => slotConnection._viewConnections.push(viewConn.clone(particle, cloneMap)));
    return slotConnection;
  }

  _normalize() {
    this._tags.sort();
    this._formFactors.sort();
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = compareComparables(this._slot, other._slot)) != 0) return cmp;
    if ((cmp = compareComparables(this._particle, other._particle)) != 0) return cmp;
    if ((cmp = compareStrings(this._name, other._name)) != 0) return cmp;
    if ((cmp = compareArrays(this._tags, other._tags, compareStrings)) != 0) return cmp;
    if ((cmp = compareStrings(this._direction, other._direction)) != 0) return cmp;
    if ((cmp = compareArrays(this._formFactors, other._formFactors, compareStrings)) != 0) return cmp;
    if ((cmp = compareBools(this._required, other._required)) != 0) return cmp;
    // viewConnections?
    return 0;
  }

  // TODO: slot functors??
  get tags() { return this._tags; }
  get viewConnections() { return this._viewConnections; } // ViewConnection*
  get direction() { return this._direction; } // provide/consume
  get formFactors() { return this._formFactors; } // string*
  get required() { return this._required; } // bool
  get slot() { return this._slot; } // Slot?
  get particle() { return this._particle; } // Particle

  connectToView(name) {
    assert(this.particle.connections[name], `Cannot connect slot to nonexistent view parameter ${name}`);
    this._viewConnections.push(this.particle.connections[name]);
  }

  connectToSlot(slot) {
    assert(this._recipe == slot._recipe);
    assert(!this._slot, "Cannot override slot connection");
    this._slot = slot;
    if (this.direction == "provide") {
      assert(this._slot.providerConnection == undefined, "Cannot override Slot provider");
      this._slot._providerConnection = this;
    } else if (this.direction == "consume") {
      this._slot._consumerConnections.push(this);
    } else {
      fail(`Unsupported direction ${this.direction}`);
    }
  }
}

class Slot extends Node {
  constructor(recipe) {
    super(recipe);
    this._id = undefined;
    this._localName = undefined;
    this._providerConnection = undefined;
    this._consumerConnections = [];
  }

  clone(recipe, cloneMap) {
    var slot = new Slot(recipe);
    slot._id = this._id;
    // the connections are re-established when Particles clone their attached SlotConnection objects.
    return slot;
  }

  _startNormalize() {
    this._localName = null;
  }

  _finishNormalize() {
    assert(Object.isFrozen(this._providerConnection));
    for (let consumerConn of this._consumerConnections) {
      assert(Object.isFrozen(consumerConn));
    }
    this._consumerConnections.sort(compareComparables);
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = compareStrings(this._id, other._id)) != 0) return cmp;
    if ((cmp = compareStrings(this._localName, other._localName)) != 0) return cmp;
    return 1;
  }

  get id() { return this._id; }
  set id(id) { this._id = id; }
  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get providerConnection() { return this._providerConnection; }
  get consumerConnections() { return this._consumerConnections; }

  isResolved() {
    return !!this.id() && !!this.providerConnection();
  }
}

class Recipe {
  constructor() {
    this._particles = [];
    this._views = [];
    this._slots = []
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

  newSlot() {
    var slot = new Slot(this);
    this._slots.push(slot);
    return slot;
  }

  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get particles() { return this._particles; } // Particle*
  get views() { return this._views; } // View*
  get slots() { return this._slots; } // Slot*

  get slotConnections() {  // SlotConnection*
    var slotConnections = [];
    this._particles.forEach(particle => {
      slotConnections.push(...particle._providedSlots);
      slotConnections.push(...particle._consumedSlots);
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

  async digest() {
    if (typeof(crypto) != 'undefined' && crypto.subtle) {
      // browser
      let buffer = new TextEncoder('utf-8').encode(this.toString());
      let digest = await crypto.subtle.digest('SHA-1', buffer)
      return Array.from(new Uint8Array(digest)).map(x => ('00' + x.toString(16)).slice(-2)).join('');
    } else {
      // nodejs
      let crypto = require('crypto');
      let sha = crypto.createHash('sha1');
      sha.update(this.toString());
      return sha.digest('hex');
    }
  }

  normalize() {
    if (Object.isFrozen(this)) {
      return;
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
    connections.sort(compareComparables);

    // Sort and normalize slot connections.
    let slotConnections = this.slotConnections;
    for (let slotConnection of slotConnections) {
      slotConnection._normalize();
    }
    slotConnections.sort(compareComparables);

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
    let seenSlots = new Set();
    let slots = [];
    for (let slotConnection of slotConnections) {
      if (slotConnection.slot && !seenSlots.has(slotConnection.slot)) {
        slots.push(slotConnection.slot);
        seenSlots.add(slotConnection.slot);
      }
    }

    // Put particles and views in their final ordering.
    this._particles = particles;
    this._views = views;
    this._slots = slots;
    Object.freeze(this);
  }

  clone(cloneMap) {
    // for now, just copy everything

    var recipe = new Recipe();

    if (cloneMap == undefined)
      cloneMap = new Map();

    function cloneTheThing(object) {
      var newObject = object.clone(recipe, cloneMap);
      cloneMap.set(object, newObject);
      return newObject;

    }

    recipe._views = this._views.map(cloneTheThing);
    recipe._slots = this._slots.map(cloneTheThing);
    recipe._particles = this._particles.map(cloneTheThing);

    return recipe;
  }

  static over(results, walker, strategy) {
    return Strategizer.over(results, walker, strategy);
  }

  _makeLocalNameMap() {
    let names = new Set();
    for (let particle in this.particles) {
      names.add(particle.localName);
    }
    for (let view in this.views) {
      names.add(view.localName);
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

    return nameMap;
  }

  // TODO: Add a normalize() which strips local names and puts and nested
  //       lists into a normal ordering.

  toString() {
    let nameMap = this._makeLocalNameMap();
    let result = [];
    // TODO: figure out where recipe names come from
    result.push(`recipe`);
    for (let view of this.views) {
      result.push(view.toString(nameMap).replace(/^|(\n)/g, '$1  '));
    }
    for (let particle of this.particles) {
      result.push(particle.toString(nameMap).replace(/^|(\n)/g, '$1  '));
    }
    return result.join('\n');
  }
}

class Walker extends Strategizer.Walker {
  constructor(tactic) {
    super();
    this.tactic = tactic;
  }

  onResult(result) {
    super.onResult(result);
    var recipe = result.result;
    var updateList = [];

    // update phase - walk through recipe and call onRecipe,
    // onView, etc.

    this.onRecipe && this.onRecipe(recipe, result);
    for (var particle of recipe.particles) {
      if (this.onParticle) {
        var result = this.onParticle(recipe, particle);
        if (!this.isEmptyResult(result))
          updateList.push({continuation: result, context: particle});
      }
    }
    for (var viewConnection of recipe.viewConnections) {
      if (this.onViewConnection) {
        var result = this.onViewConnection(recipe, viewConnection);
        if (!this.isEmptyResult(result))
          updateList.push({continuation: result, context: viewConnection});
      }
    }
    for (var view of recipe.views) {
      if (this.onView) {
        var result = this.onView(recipe, view);
        if (!this.isEmptyResult(result))
          updateList.push({continuation: result, context: view});
      }
    }
    for (var slotConnection of recipe.slotConnections) {
      if (this.onSlotConnection) {
        var result = this.onSlotConnection(recipe, slotConnection);
        if (result)
          updateList.push({continuation: result, context: slotConnection});
      }
    }
    for (var slot of recipe.slots) {
      if (this.onSlot) {
        var result = this.onSlot(recipe, slot);
        if (result)
          updateList.push({continuation: result, context: slot});
      }
    }

    // application phase - apply updates and track results

    var newRecipes = [];
    if (updateList.length) {
      switch (this.tactic) {
        case Recipe.Walker.ApplyAll:
          var cloneMap = new Map();
          var newRecipe = recipe.clone(cloneMap);
          updateList.forEach(({continuation, context}) => {
            if (typeof continuation == 'function')
              continuation = [continuation];
            continuation.forEach(f => {
              f(newRecipe, cloneMap.get(context));
            });
          });
          newRecipes.push(newRecipe);
          break;
        case Recipe.Walker.ApplyEach:
          updateList.forEach(({continuation, context}) => {
            var cloneMap = new Map();
            var newRecipe = recipe.clone(cloneMap);
            if (typeof continuation == 'function')
              continuation = [continuation];
            continuation.forEach(f => {
              f(newRecipe, cloneMap.get(context));
            });
            newRecipes.push(newRecipe);
          });
          break;
        default:
          throw `${this.tactic} not supported`;
      }
    }

    // commit phase - output results.

    for (var newRecipe of newRecipes) {
      var result = this.createDescendant(newRecipe);
    }
  }

  createDescendant(recipe) {
    recipe.normalize();
    super.createDescendant(recipe, recipe.digest());
  }

  isEmptyResult(result) {
    if (!result)
      return true;

    if (result.constructor == Array && result.length <= 0)
      return true;

    return false;
  }
}

Recipe.Walker = Walker;
Recipe.Walker.ApplyAll = "apply all";
Recipe.Walker.ApplyEach = "apply each";

module.exports = Recipe;
