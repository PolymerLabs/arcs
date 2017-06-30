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
    this._recipes = [];
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
    let items = {
      views: recipeItem.items.filter(item => item.kind == 'view'),
      byView: new Map(),
      particles: recipeItem.items.filter(item => item.kind == 'particle'),
      byParticle: new Map(),
      byName: new Map(),
    };

    for (let item of items.views) {
      let view = recipe.newView();
      if (item.ref.id) {
        view.id = item.ref.id;
      }
      view.tags = item.ref.tags;
      if (item.name) {
        assert(!items.byName.has(item.name));
        view.localName = item.name;
        items.byName.set(item.name, {item: item, view: view});
      }
      items.byView.set(view, item);
    }

    // TODO: disambiguate.
    let particlesByName = {};
    for (let item of items.particles) {
      let particle = recipe.newParticle(item.ref.name);
      particle.tags = item.ref.tags;
      if (item.ref.name) {
        particlesByName[item.ref.name] = particle;
      }
      if (item.name) {
        // TODO: errors.
        assert(!items.byName.has(item.name));
        particle.localName = item.name;
        items.byName.set(item.name, {item: item, particle: particle});
      }
      items.byParticle.set(particle, item);
    }

    for (let [particle, item] of items.byParticle) {
      for (let connectionItem of item.connections) {
        let connection;
        if (connectionItem.param == '*') {
          connection = particle.addUnnamedConnection();
        } else {
          connection = particle.connections[connectionItem.param];
          if (!connection) {
            connection = particle.addConnectionName(connectionItem.param);
          }
          // TODO: else, merge tags? merge directions?
        }
        connection.tags = connectionItem.target.tags;
        connection.direction = {'->': 'out', '<-': 'in', '=': 'inout'}[connectionItem.dir];

        let targetView;
        let targetParticle;

        if (connectionItem.target.name) {
          let entry = items.byName.get(connectionItem.target.name);
          assert(entry, `could not find ${connectionItem.target.name}`);
          if (entry.item.kind == 'view') {
            targetView = entry.view;
          } else if (entry.item.kind == 'particle') {
            targetParticle = entry.particle;
          } else {
            assert(false, `did not expect ${entry.item.kind}`);
          }
        }

        if (connectionItem.target.particle) {
          targetParticle = particlesByName[connectionItem.target.particle];
          // TODO: error reporting
          assert(targetParticle);
        }

        if (targetParticle) {
          let targetConnection;
          if (connectionItem.target.param) {
            targetConnection = targetParticle.connections[connectionItem.target.param];
            if (!targetConnection) {
              targetConnection = targetParticle.addConnectionName(connectionItem.target.param);
              // TODO: direction?
            }
          } else {
            targetConnection = targetParticle.addUnnamedConnection();
            // TODO: direction?
          }

          targetView = targetConnection.view;
          if (!targetView) {
            // TODO: tags?
            targetView = recipe.newView();
            targetConnection.connectToView(targetView)
          }
        }

        if (targetView) {
          connection.connectToView(targetView);
        }
      }
    }
  }
  _newRecipe(name) {
    // TODO: use name
    let recipe = new Recipe();
    this._recipes.push(recipe);
    return recipe;
  }
}

module.exports = Manifest;
