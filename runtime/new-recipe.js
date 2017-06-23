// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = require('assert');

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
    this._tags = [];
    this._providedSlots = [];
    this._consumedSlots = [];
    this._connections = {};
    this._unnamedConnections = [];
  }

  clone(recipe, cloneMap) {
    var particle = new Particle(recipe, this._name);
    particle._id  = this._id;
    particle._tags = this._tags.slice();
    particle._providedSlots = this._providedSlots.map(slot => slot.clone(recipe)); // ?
    particle._consumedSlots = this._consumedSlots.map(slot => slot.clone(recipe)); // ?
    Object.keys(particle._connections).forEach(key => this._connections[key] = particle._connections[key].clone(this, cloneMap));
    particle._unnamedConnections = this._unnamedConnections.map(connection => connection.clone(this, cloneMap));

    return particle;
  }

  get id() { return this._id; } // Not resolved until we have an ID.
  get name() { return this._name; }
  get tags() { return this._tags; }
  get providedSlots() { return this._providedSlots; } // Slot*
  get consumedSlots() { return this._consumedSlots; } // SlotConnection*
  get connections() { return this._connections; } // {parameter -> ViewConnection}

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
    view._tags = this._tags.slice();
    view._tyep = this._type;
    view._create = this._create;

    // the connections are re-established when Particles clone their
    // attached ViewConnection objects.
    view._connections = [];
    return view;
  }

  // a resolved View has either an id or create=true
  get tags() { return this._tags; } // only tags owned by the view
  get type() { return this._type; } // nullable
  get id() { return this._id; }
  get create() { return this._create; }
  set create(create) { this._create = create; }
  get connections() { return this._connections } // ViewConnection*

  isResolved() {
    return (this._id !== undefined || this._create == true) && this._type !== undefined;
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
    viewConnection._tags = this._tags.slice();
    viewConnection._type = this._type;
    viewConnection._direction = this._direction;
    if (this._view != undefined) {
      viewConnection._view = cloneMap.get(this._view);
      viewConnection._view.connections.push(view);
    }
  }

  get name() { return this._name; } // Parameter name?
  get tags() { return this._tags; }
  get type() { return this._type; }
  get direction() { return this._direction; } // in/out
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
  get particles() { return this._particles; } // Particle*
  get views() { return this._views; } // View*
  get slots() {} // Slot*

  get slotConnections() {} // SlotConnection*

  get viewConnections() {
    var viewConnections = [];
    this._particles.forEach(particle => {
      viewConnection.push(...Object.entries(particle.connections));
      viweConnection.push(...particle._unnamedConnections);
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

  static over(recipes, walker) {
    var results = [];
    for (var recipe of recipes) {
      var updateList = [];

      walker.onRecipe && walker.onRecipe(recipe);
      for (var view of recipe.views) {
        if (walker.onView) {
          var result = walker.onView(recipe, view);
          if (result)
            updateList.push({continuation: result, context: view});
        }
      }

      if (updateList.length) {
        var cloneMap = new Map();
        recipe = recipe.clone(cloneMap);
        updateList.forEach(({continuation, context}) => continuation(recipe, cloneMap.get(context)));
      }

      if (walker.onRecipeDone)
        var result = walker.onRecipeDone(recipe, updateList.length > 0);
        if (result)
          results.push(result);
    }

    return results;
  }

}

class Walker {
  constructor(strategizer) {
    this.strategizer = strategizer;
  }
  onRecipeDone(recipe, isCloned) {
    if (isCloned)
      return this.strategizer.create(recipe, this.score);
  }
}

Recipe.Walker = Walker;

module.exports = Recipe;
