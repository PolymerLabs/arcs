// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = require('assert');
var Strategizer = require('../strategizer/strategizer.js').Strategizer;

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

  // a resolved View has either an id or create=true
  get tags() { return this._tags; } // only tags owned by the view
  set tags(tags) { this._tags = tags; }
  get type() { return this._type; } // nullable
  get id() { return this._id; }
  set id(id) { this._id = id; }
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
    if (['in', 'out', 'inout'].indexOf(this.direction) == -1)
      result.push(`{${this.direction}}`)
    else
      result.push({'in': '<-', 'out': '->', 'inout': '='}[this.direction]);
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
    let name = undefined;
    // TODO: figure out where recipe names come from
    result.push(`recipe ${name}`);
    for (let view of this.views) {
      result.push(view.toString(nameMap).replace(/^|(\n)/g, '$1  '));
    }
    // TODO: particle, name map. pass to the particle toString?
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
}

Recipe.Walker = Walker;
Recipe.Walker.ApplyAll = "apply all";

module.exports = Recipe;
