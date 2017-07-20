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
const Recipe = require('./recipe/recipe.js');
const ParticleParser = require('./build/particle-parser.js');
const ParticleSpec = require('./particle-spec.js')
const Schema = require('./schema.js')

class Manifest {
  constructor() {
    this._recipes = [];
    this._imports = [];
    this._particles = {};
    this._schemas = {};
    this._fileName = null;
  }
  get recipes() {
    return this._recipes;
  }
  get particles() {
    return this._particles;
  }
  get imports() {
    return this._imports;
  }
  get schemas() {
    return this._schemas;
  }
  get fileName() {
    return this._fileName;
  }
  findSchemaByName(name) {
    let schema = this._schemas[name];
    if (!schema) {
      // TODO: flatten or index imports?
      for (let importedManifest of this._imports) {
        schema = importedManifest.findSchemaByName(name);
        if (schema) {
          break;
        }
      }
    }
    return schema;
  }
  static async load(fileName, loader, registry) {
    if (registry && registry[fileName]) {
      return registry[fileName];
    }
    let content = await loader.loadFile(fileName);
    let manifest = await Manifest.parse(content, {fileName, loader, registry, position: {line: 1, column: 0}});
    if (manifest && registry) {
      registry[fileName] = manifest;
    }
    return manifest;
  }
  static async parse(content, options) {
    options = options || {};
    let {fileName, position, loader, registry} = options;
    registry = registry || {};
    position = position || {line: 1, column: 0};

    let items = parser.parse(content);
    let manifest = new Manifest();
    manifest._fileName = fileName;
    // TODO: This should be written to process in dependency order.
    // 1. imports
    // 2. schemas
    // 3. particles, TODO: entities => views
    // 4. recipes
    for (let item of items.filter(item => item.kind == 'import')) {
      let path = loader.path(manifest.fileName);
      let target = loader.join(path, item.path);
      manifest._imports.push(await Manifest.load(target, loader, registry));
    }
    for (let item of items.filter(item => item.kind == 'schema')) {
      this._processSchema(manifest, item);
    }
    for (let item of items.filter(item => item.kind == 'particle')) {
      this._processParticle(manifest, item);
    }
    for (let item of items.filter(item => item.kind == 'recipe')) {
      this._processRecipe(manifest, item);
    }
    return manifest;
  }
  static _processSchema(manifest, schemaItem) {
    let parent;
    if (schemaItem.parent) {
      parent = manifest.findSchemaByName(schemaItem.parent);
      // TODO: error handling
      assert(parent);
    }
    manifest._schemas[schemaItem.name] = new Schema(schemaItem, parent);
  }
  static _processParticle(manifest, particleItem) {
    let particleSpec = new ParticleSpec(ParticleParser.parse(particleItem.body));
    manifest._particles[particleItem.name] = particleSpec;
  }
  static _processRecipe(manifest, recipeItem) {
    let recipe = manifest._newRecipe(recipeItem.name);
    let items = {
      views: recipeItem.items.filter(item => item.kind == 'view'),
      byView: new Map(),
      particles: recipeItem.items.filter(item => item.kind == 'particle'),
      byParticle: new Map(),
      byName: new Map(),
      connections: recipeItem.items.filter(item => item.kind == 'connection')
    };

    for (let connection of items.connections) {
      recipe.newConnectionConstraint(connection.from.particle, connection.from.param,
                                     connection.to.particle, connection.to.param);
    }

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
        let spec = manifest.particles[item.ref.name];
        // TODO: factor out import lookups
        if (!spec) {
          for (let importManifest of manifest.imports) {
            if (importManifest.particles[item.ref.name]) {
              spec = importManifest.particles[item.ref.name];
              break;
            }
          }
        }
        if (spec) {
          particle.spec = spec;
        }
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
      for (let slotConnectionItem of item.slotConnections) {
        let slotConn = particle.addSlotConnection(slotConnectionItem.param, slotConnectionItem.dir);
        if (slotConnectionItem.name) {
          let slot = items.byName.get(slotConnectionItem.name);
          if (!slot) {
            slot = recipe.newSlot();
            slot.localName = slotConnectionItem.name;
            items.byName.set(slotConnectionItem.name, slot);
          }
          slotConn.connectToSlot(slot);
        }
        if (slotConnectionItem.viewRef) {
          assert(slotConnectionItem.dir == "provide");
          if (slotConnectionItem.viewRef.name) {
            assert(slotConnectionItem.viewRef.tags.length == 0);
            let viewConn = particle.connections[slotConnectionItem.viewRef.name];
            assert(viewConn, `Slot ${slotConnectionItem.name} cannot use nonexistent view connection ${slotConnectionItem.viewRef.name}`);
            slotConn.viewConnections.push(viewConn);
          } else if (slotConnectionItem.viewRef.tags.length > 0) {
            slotConnectionItem.viewRef.tags.forEach(t => slotConn.tags.push(t));
          } else {
            fail(`Unsupported view ref for slot ${slotConnectionItem.name}`);
          }
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
