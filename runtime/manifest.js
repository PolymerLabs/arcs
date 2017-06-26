/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const assert = require('assert');
const parser = require('./build/manifest-parser.js');
const Recipe = require('./new-recipe.js');

class Manifest {
  constructor() {
    this._recipes = {};
  }
  get recipes() {
    return this._recipes;
  }
  static parse(content /* TODO: context from file, line, col? */) {
    let items = parser.parse(content);
    let manifest = new Manifest();
    // TODO: This probably needs to be rewritten to process in phases.
    // 1. imports
    // 2. populate recipes, particles etc. and assign IDs
    // 3. process recipes/particles, and resolve references to particles/schemas etc.
    for (let item of items) {
      switch (item.kind) {
        case 'recipe':
          this._processRecipe(manifest, item);
          break;
        default:
          throw `${item.kind} not yet implemented`;
      }
    }
    return manifest;
  }
  static _processRecipe(manifest, recipeItem) {
    let recipe = manifest._newRecipe(recipeItem.name);
    let viewItems = recipeItem.items.filter(item => item.kind == 'view');
    let particleItems = recipeItem.items.filter(item => item.kind == 'particle');

    for (let item of viewItems) {
      let view = recipe.newView();
      if (item.ref.id) {
        view.id = item.ref.id;
      }
      view.tags = item.ref.tags;
    }

    let particles = new Map();
    let particlesByName = {};
    for (let item of particleItems) {
      let particle = recipe.newParticle(item.name);
      particle.tags = item.ref.tags;
      particles.set(item, particle);
      if (item.ref.name) {
        particlesByName[item.ref.name] = particle;
      }
    }

    for (let item of particleItems) {
      let particle = particles.get(item);
      for (let connectionItem of item.connections) {
        var connection;
        if (connectionItem.param == '*') {
          connection = particle.addUnnamedConnection();
        } else {
          connection = particle.addConnectionName(connectionItem.param);
        }
        connection.tags = connectionItem.target.tags;
        connection.direction = {'->': 'out', '<-': 'in', '=': 'inout'}[connectionItem.dir];
        // TODO: deal with connection target to particle
      }
    }

  }
  _newRecipe(name) {
    assert(!this._recipes[name]);
    let recipe = new Recipe();
    this._recipes[name] = recipe;
    return recipe;
  }
}

module.exports = Manifest;
