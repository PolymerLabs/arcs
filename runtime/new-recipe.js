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
    this._impl = undefined;
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
    particle._providedSlots = this._providedSlots.map(slot => slot.clone(recipe)); // ?
    particle._consumedSlots = this._consumedSlots.map(slot => slot.clone(recipe)); // ?
    Object.keys(this._connections).forEach(key => particle._connections[key] = this._connections[key].clone(particle, cloneMap));
    particle._unnamedConnections = this._unnamedConnections.map(connection => connection.clone(particle, cloneMap));

    return particle;
  }

  _startNormalize() {
    this._localName = null;
    this._tags.sort();
  }

  _finishNormalize() {
    let normalizedConnections = {};
    for (let key of (Object.keys(this._connections).sort())) {
      normalizedConnections[key] = this._connections[key];
    }
    this._connections = normalizedConnections;
    this._unnamedConnections.sort(compareComparables);
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = compareStrings(this._id, other._id)) != 0) return cmp;
    if ((cmp = compareStrings(this._name, other._name)) != 0) return cmp;
    if ((cmp = compareStrings(this._localName, other._localName)) != 0) return cmp;
    // TODO: impl?
    if ((cmp = compareArrays(this._tags, other._tags, compareStrings)) != 0) return cmp;
    // TODO: slots
    if (Object.isFrozen(this)) {
      if ((cmp = compareObjects(this._connections, other._connections, compareComparables)) != 0) return cmp;
      if ((cmp = compareArrays(this._unnamedConnections, other._unnamedConnections, compareComparables)) != 0) return cmp;
    }
    return 0;
  }

  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get id() { return this._id; } // Not resolved until we have an ID.
  get name() { return this._name; }
  get impl() { return this._impl; }
  set impl(impl) { this._impl = impl; }
  get tags() { return this._tags; }
  set tags(tags) { this._tags = tags; }
  get providedSlots() { return this._providedSlots; } // Slot*
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
    if (Object.isFrozen(this)) {
      if ((cmp = compareArrays(this._connections, other._connections, compareComparables)) != 0) return cmp;
    }
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
      result.push(`'${id}'`);
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
    this._sequenceNumber = undefined;
  }

  clone(particle, cloneMap) {
    var viewConnection = new ViewConnection(this._name, particle);
    viewConnection._tags = [...this._tags];
    viewConnection._type = this._type;
    viewConnection._direction = this._direction;
    if (this._view != undefined) {
      viewConnection._view = cloneMap.get(this._view);
      viewConnection._view.connections.push(viewConnection);
    }
    return viewConnection;
  }

  _startNormalize() {
    this._tags.sort();
    // TODO: type?
  }

  _finishNormalize(sequenceNumber) {
    this._sequenceNumber = sequenceNumber;
    Object.freeze(this);
  }

  _compareTo(other) {
    if (Object.isFrozen(this)) {
      return compareNumbers(this._sequenceNumber, other._sequenceNumber);
    }
    let cmp;
    if ((cmp = compareStrings(this._name, other._name)) != 0) return cmp;
    if ((cmp = compareArrays(this._tags, other._tags, compareStrings)) != 0) return cmp;
    // TODO: add type comparison
    // if ((cmp = compareStrings(this._type, other._type)) != 0) return cmp;
    if ((cmp = compareStrings(this._direction, other._direction)) != 0) return cmp;
    if ((cmp = compareComparables(this._particle, other._particle)) != 0) return cmp;
    if ((cmp = compareComparables(this._view, other._view)) != 0) return cmp;
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
  // TODO: slot functors??
  get tags() {}
  get view() {} // ViewConnection?
  get direction() {} // provide/consume
  get formFactors() {} // string*
  get required() {} // bool
  get particle() {} // Particle? :: consumer/provider
  get slot() {} // Slot?
}

class Slot extends Node {
  get provider() {} // SlotConnection?
  get consumers() {} // SlotConnection*
}

class Recipe {
  constructor() {
    this._particles = [];
    this._views = [];
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
  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get particles() { return this._particles; } // Particle*
  get views() { return this._views; } // View*
  get slots() {} // Slot*

  get slotConnections() {} // SlotConnection*

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

    // Sort and normalize connections.
    let connections = this.viewConnections;
    for (let connection of connections) {
      connection._startNormalize();
    }
    connections.sort(compareComparables);
    let i = 0;
    for (let connection of connections) {
      connection._finishNormalize(i++);
    }

    // Finish normalizing particles and views with sorted connections.
    for (let particle of this._particles) {
      particle._finishNormalize();
    }
    for (let view of this._views) {
      view._finishNormalize();
    }

    // Put particles and views in their final ordering.
    this._particles.sort(compareComparables);
    this._views.sort(compareComparables);
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
        if (result)
          updateList.push({continuation: result, context: particle});
      }
    }
    for (var viewConnection of recipe.viewConnections) {
      if (this.onViewConnection) {
        var result = this.onViewConnection(recipe, viewConnection);
        if (result)
          updateList.push({continuation: result, context: viewConnection});
      }
    }
    for (var view of recipe.views) {
      if (this.onView) {
        var result = this.onView(recipe, view);
        if (result)
          updateList.push({continuation: result, context: view});
      }
    }

    // application phase - apply updates and track results

    var newRecipes = [];
    if (updateList.length) {
      if (this.tactic == Recipe.Walker.ApplyAll) {
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
}

Recipe.Walker = Walker;
Recipe.Walker.ApplyAll = "apply all";

module.exports = Recipe;
