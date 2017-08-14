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
const ParticleSpec = require('./particle-spec.js');
const Schema = require('./schema.js');
const ManifestView = require('./manifest-view.js');

class Manifest {
  constructor() {
    this._recipes = [];
    this._imports = [];
    // TODO: These should be lists, possibly with a separate flattened map.
    this._particles = {};
    this._schemas = {};
    this._views = [];
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
  get views() {
    return this._views;
  }
  // TODO: newParticle, Schema, etc.
  // TODO: simplify() / isValid().
  newView() {
    let view = new ManifestView();
    this._views.push(view);
    return view;
  }
  find(manifestFinder) {
    let result = manifestFinder(this);
    if (!result) {
      for (let importedManifest of this._imports) {
        result = importedManifest.find(manifestFinder);
        if (result) {
          break;
        }
      }
    }
    return result;
  }
  findSchemaByName(name) {
    return this.find(manifest => manifest._schemas[name]);
  }
  findParticleByName(name) {
    return this.find(manifest => manifest._particles[name]);
  }
  findViewByName(name) {
    return this.find(manifest => manifest._views.find(view => view.localName == name));
  }
  findViewById(id) {
    return this.find(manifest => manifest._views.find(view => view.id == id));
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

    let items = [];
    try{
      items = parser.parse(content);
    } catch (e) {
      console.log(e);
      throw e;
    }
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
      this._processParticle(manifest, item, loader);
    }
    for (let item of items.filter(item => item.kind == 'recipe')) {
      this._processRecipe(manifest, item);
    }
    return manifest;
  }
  static _processSchema(manifest, schemaItem) {
    if (schemaItem.parent) {
      let parent = manifest.findSchemaByName(schemaItem.parent);
      // TODO: error handling
      assert(parent);
      schemaItem.parent = parent.toLiteral();
    }
    manifest._schemas[schemaItem.name] = new Schema(schemaItem);
  }
  static _processParticle(manifest, particleItem, loader) {
    // TODO: loader should not be optional.
    if (particleItem.implFile && loader) {
      particleItem.implFile = loader.join(manifest.fileName, particleItem.implFile);
    }
    let resolveSchema = name => {
      let schema = manifest.findSchemaByName(name);
      if (!schema) {
        throw new Error(`Schema '${name}' was not declared or imported`);
      }
      return schema;
    };
    let particleSpec = new ParticleSpec(particleItem, resolveSchema);
    manifest._particles[particleItem.name] = particleSpec;
  }
  static _processRecipe(manifest, recipeItem) {
    let recipe = manifest._newRecipe(recipeItem.name);
    let items = {
      views: recipeItem.items.filter(item => item.kind == 'view'),
      byView: new Map(),
      particles: recipeItem.items.filter(item => item.kind == 'particle'),
      byParticle: new Map(),
      slots: recipeItem.items.filter(item => item.kind == 'slot'),
      bySlot: new Map(),
      byName: new Map(),
      connections: recipeItem.items.filter(item => item.kind == 'connection')
    };

    for (let connection of items.connections) {
      var fromParticle = manifest.findParticleByName(connection.from.particle);
      var toParticle = manifest.findParticleByName(connection.to.particle);
      assert(fromParticle, `could not find particle ${fromParticle}`);
      assert(toParticle, `could not find particle ${toParticle}`);
      recipe.newConnectionConstraint(fromParticle, connection.from.param,
                                     toParticle, connection.to.param);
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
      view.create = item.create;
      items.byView.set(view, item);
    }

    for (let item of items.slots) {
      let slot = recipe.newSlot();
      if (item.id) {
        slot.id = item.id;
      }
      if (item.name) {
        assert(!items.byName.has(item.name), `Duplicate slot local name ${item.name}`);
        slot.localName = item.name;
        items.byName.set(item.name, slot);
      }
      items.bySlot.set(slot, item);
    }

    // TODO: disambiguate.
    let particlesByName = {};
    for (let item of items.particles) {
      let particle = recipe.newParticle(item.ref.name);
      particle.tags = item.ref.tags;
      if (item.ref.name) {
        var spec = manifest.findParticleByName(item.ref.name);
        assert(spec, `could not find particle ${item.ref.name}`);
        particle.spec = spec;
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
        let slotConn = particle.consumedSlotConnections[slotConnectionItem.param];
        if (!slotConn) {
          slotConn = particle.addSlotConnection(slotConnectionItem.param);
        }
        if (slotConnectionItem.name) {
          slotConnectionItem.providedSlots.forEach(ps => {
            let providedSlot = slotConn.providedSlots[ps.param];
            if (providedSlot) {
              items.byName.set(ps.name, providedSlot);
              items.bySlot.set(providedSlot, ps);
            } else
              providedSlot = items.byName.get(ps.name);
            if (!providedSlot) {
              providedSlot = recipe.newSlot(ps.param);
              providedSlot.localName = ps.name;
              assert(!items.byName.has(ps.name));
              items.byName.set(ps.name, providedSlot);
              items.bySlot.set(providedSlot, ps);
            }
            if (!slotConn.providedSlots[ps.param]) {
              slotConn.providedSlots[ps.param] = providedSlot;
            }
          });
        }
      }

      for (let slotConnectionItem of item.slotConnections) {
        let targetSlot = items.byName.get(slotConnectionItem.name);
        if (targetSlot) {
          assert(items.bySlot.has(targetSlot));
        } else {
          targetSlot = recipe.newSlot(slotConnectionItem.param);
          targetSlot.localName = slotConnectionItem.name;
          items.byName.set(slotConnectionItem.name, targetSlot);
          items.bySlot.set(targetSlot, slotConnectionItem);
        }
        particle.consumedSlotConnections[slotConnectionItem.param].connectToSlot(targetSlot);
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
