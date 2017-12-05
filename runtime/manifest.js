/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import assert from '../platform/assert-web.js';
import parser from './build/manifest-parser.js';
import Recipe from './recipe/recipe.js';
import ParticleSpec from './particle-spec.js';
import Schema from './schema.js';
import Search from './recipe/search.js';
import Shape from './shape.js';
import Type from './type.js';
import {InMemoryCollection, InMemoryVariable} from './in-memory-storage.js';
import util from './recipe/util.js';

class Manifest {
  constructor() {
    this._recipes = [];
    this._imports = [];
    // TODO: These should be lists, possibly with a separate flattened map.
    this._particles = {};
    this._schemas = {};
    this._views = [];
    this._shapes = [];
    this._viewTags = new Map();
    this._fileName = null;
    this._nextLocalID = 0;
    this._id = null;
  }
  get id() {
    return this._id;
  }
  get recipes() {
    return [...new Set(this._findAll(manifest => manifest._recipes))];
  }
  get particles() {
    return [...new Set(this._findAll(manifest => Object.values(manifest._particles)))];
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

  get shapes() {
    return this._shapes;
  }

  // TODO: newParticle, Schema, etc.
  // TODO: simplify() / isValid().
  newView(type, name, id, tags) {
    let view;
    if (type.isSetView) {
      view = new InMemoryCollection(type, this, name, id);
    } else {
      view = new InMemoryVariable(type, this, name, id);
    }
    this._views.push(view);
    this._viewTags.set(view, tags ? tags : []);
    return view;
  }
  _find(manifestFinder) {
    let result = manifestFinder(this);
    if (!result) {
      for (let importedManifest of this._imports) {
        result = importedManifest._find(manifestFinder);
        if (result) {
          break;
        }
      }
    }
    return result;
  }
  *_findAll(manifestFinder) {
    yield* manifestFinder(this);
    for (let importedManifest of this._imports) {
      yield* importedManifest._findAll(manifestFinder);
    }
  }
  findSchemaByName(name) {
    return this._find(manifest => manifest._schemas[name]);
  }
  findParticleByName(name) {
    return this._find(manifest => manifest._particles[name]);
  }
  findParticlesByVerb(verb) {
    return [...this._findAll(manifest => Object.values(manifest._particles).filter(particle => particle.primaryVerb == verb))];
  }
  findViewByName(name) {
    return this._find(manifest => manifest._views.find(view => view.name == name));
  }
  findViewById(id) {
    return this._find(manifest => manifest._views.find(view => view.id == id));
  }
  findViewsByType(type, options) {
    var tags = options && options.tags ? options.tags : [];
    return [...this._findAll(manifest => manifest._views.filter(view => view.type.equals(type) && tags.filter(tag => !manifest._viewTags.get(view).includes(tag)).length == 0))];
  }
  findShapeByName(name) {
    return this._find(manifest => manifest._shapes.find(shape => shape.name == name));
  }
  generateID() {
    return `${this.id}:${this._nextLocalID++}`;
  }
  static async load(fileName, loader, options) {
    options = options || {};
    let {registry, id} = options;
    if (registry && registry[fileName]) {
      return registry[fileName];
    }
    let content = await loader.loadResource(fileName);
    assert(content !== undefined, `${fileName} unable to be loaded by Manifest parser`);
    let manifest = await Manifest.parse(content, {
      id,
      fileName,
      loader,
      registry,
      position: {line: 1, column: 0}
    });
    if (manifest && registry) {
      registry[fileName] = manifest;
    }
    return manifest;
  }
  static async parse(content, options) {
    options = options || {};
    let {id, fileName, position, loader, registry} = options;
    registry = registry || {};
    position = position || {line: 1, column: 0};
    id = `manifest:${fileName}:`;

    function processError(e) {
      if (!e.location) {
        return e;
      }
      let lines = content.split('\n');
      let line = lines[e.location.start.line - 1];
      let span = 1;
      if (e.location.end.line == e.location.start.line) {
        span = e.location.end.column - e.location.start.column;
      } else {
        span = line.length - e.location.start.column;
      }
      span = Math.max(1, span);
      let highlight = '';
      for (let i = 0; i < e.location.start.column - 1; i++) {
        highlight += ' ';
      }
      for (let i = 0; i < span; i++) {
        highlight += '^';
      }
      let message = `Parse error in '${fileName}' line ${e.location.start.line}.
${e.message}
  ${line}
  ${highlight}`;
      return new Error(message);
    }

    let items = [];
    try{
      items = parser.parse(content);
    } catch (e) {
      throw processError(e);
    }
    let manifest = new Manifest();
    manifest._fileName = fileName;
    manifest._id = id;

    for (let item of items.filter(item => item.kind == 'import')) {
      let path = loader.path(manifest.fileName);
      let target = loader.join(path, item.path);
      manifest._imports.push(await Manifest.load(target, loader, {registry}));
    }

    try {
      for (let item of items.filter(item => item.kind == 'schema')) {
        this._processSchema(manifest, item);
      }
      for (let item of items.filter(item => item.kind == 'shape')) {
        this._processShape(manifest, item);
      }
      for (let item of items.filter(item => item.kind == 'particle')) {
        this._processParticle(manifest, item, loader);
      }
      for (let item of items.filter(item => item.kind == 'view')) {
        await this._processView(manifest, item, loader);
      }
      for (let item of items.filter(item => item.kind == 'recipe')) {
        this._processRecipe(manifest, item);
      }
    } catch (e) {
      throw processError(e);
    }
    return manifest;
  }
  static _processSchema(manifest, schemaItem) {
    manifest._schemas[schemaItem.name] = new Schema({
      name: schemaItem.name,
      parents: schemaItem.parents.map(parent => {
        let result = manifest.findSchemaByName(parent);
        assert(result);
        return result.toLiteral();
      }),
      sections: schemaItem.sections.map(section => {
        let fields = {};
        for (let field of section.fields) {
          fields[field.name] = field.type;
        }
        return {
          sectionType: section.sectionType,
          fields,
        };
      }),
    });
  }
  static _processParticle(manifest, particleItem, loader) {
    // TODO: we should require both of these and update failing tests...
    assert(particleItem.implFile == null || particleItem.args !== null, "no valid body defined for this particle");
    if (!particleItem.args) {
      particleItem.args = [];
    }
    // TODO: loader should not be optional.
    if (particleItem.implFile && loader) {
      particleItem.implFile = loader.join(manifest.fileName, particleItem.implFile);
    }

    for (let arg of particleItem.args) {
      arg.type = Manifest._processType(arg.type);
      arg.type = arg.type.resolveReferences(name => manifest.resolveReference(name));
    }

    let particleSpec = new ParticleSpec(particleItem);
    manifest._particles[particleItem.name] = particleSpec;
  }
  // TODO: Move this to a generic pass over the AST and merge with resolveReference.
  static _processType(typeItem) {
    switch (typeItem.kind) {
      case 'variable-type':
        return Type.newVariableReference(typeItem.name);
      case 'reference-type':
        return Type.newManifestReference(typeItem.name);
      case 'list-type':
        return Type.newSetView(Manifest._processType(typeItem.type));
      default:
        throw `Unexpected type item of kind '${typeItem.kind}'`;
    }
  }
  static _processShape(manifest, shapeItem) {
    for (let arg of shapeItem.interface.args) {
      arg.type = Manifest._processType(arg.type);
      arg.type = arg.type.resolveReferences(name => manifest.resolveReference(name));
    }
    let views = shapeItem.interface.args;
    let slots = [];
    for (let slotItem of shapeItem.slots) {
      slots.push({
        direction: 'consume',
        name: slotItem.name,
      });
      for (let providedSlotItem of slotItem.providedSlots) {
        slots.push({
          direction: 'provide',
          name: providedSlotItem.name,
        })
      }
    }
    // TODO: move shape to recipe/ and add shape builder?
    let shape = new Shape(views, slots);
    shape.name = shapeItem.name;
    manifest._shapes.push(shape);
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
      connections: recipeItem.items.filter(item => item.kind == 'connection'),
      search: recipeItem.items.find(item => item.kind == 'search')
    };

    for (let connection of items.connections) {
      var fromParticle = manifest.findParticleByName(connection.from.particle);
      var toParticle = manifest.findParticleByName(connection.to.particle);
      assert(fromParticle, `could not find particle ${fromParticle}`);
      assert(toParticle, `could not find particle ${toParticle}`);
      recipe.newConnectionConstraint(fromParticle, connection.from.param,
                                     toParticle, connection.to.param);
    }

    if (items.search) {
      recipe.search = new Search(items.search.phrase, items.search.tokens);
    }

    for (let item of items.views) {
      let view = recipe.newView();
      let ref = item.ref || {tags: []};
      if (ref.id) {
        view.id = ref.id;
      } else if (ref.name) {
        let targetView = manifest.findViewByName(ref.name);
        // TODO: Error handling.
        assert(targetView, `Could not find view ${ref.name}`);
        view.mapToView(targetView);
      }
      view.tags = ref.tags;
      if (item.name) {
        assert(!items.byName.has(item.name));
        view.localName = item.name;
        items.byName.set(item.name, {item: item, view: view});
      }
      view.fate = item.fate;
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
      particle.verbs = item.ref.verbs;
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
        connection.tags = connectionItem.target ? connectionItem.target.tags : [];
        let direction = {'->': 'out', '<-': 'in', '=': 'inout'}[connectionItem.dir];
        if (connection.direction) {
          if (connection.direction != direction && direction != 'inout') {
            let error = new Error(`'${connectionItem.dir}' not compatible with '${connection.direction}' param of '${particle.name}'`);
            error.location = connectionItem.location;
            throw error;
          }
        } else {
          if (connectionItem.param != '*') {
            let error = new Error(`param '${connectionItem.param}' is not defined by '${particle.name}'`);
            error.location = connectionItem.location;
            throw error;
          }
          connection.direction = direction;
        }

        let targetView;
        let targetParticle;

        if (connectionItem.target && connectionItem.target.name) {
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

        if (connectionItem.target && connectionItem.target.particle) {
          targetParticle = particlesByName[connectionItem.target.particle];
          assert(targetParticle, `Unknown particle ${connectionItem.target.particle}`);
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
        let targetSlot = items.byName.get(slotConnectionItem.name);
        if (targetSlot) {
          assert(items.bySlot.has(targetSlot));
          if (!targetSlot.name) {
            targetSlot.name = slotConnectionItem.param;
          }
          assert(targetSlot.name == slotConnectionItem.param,
                 `Target slot name ${targetSlot.name} doesn't match slot connection name ${slotConnectionItem.param}`);
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
  resolveReference(name) {
    let schema = this.findSchemaByName(name);
    if (schema) {
      return {schema};
    }
    let shape = this.findShapeByName(name);
    if (shape) {
      return {shape};
    }
    throw new Error(`Schema or Shape '${name}' was not declared or imported`);
  }
  static async _processView(manifest, item, loader) {
    let name = item.name;
    let id = item.id;
    let type = Manifest._processType(item.type);
    if (id == null) {
      id = `${manifest._id}view${manifest._views.length}`
    }
    let tags = item.tags;
    if (tags == null)
      tags = [];

    type = type.resolveReferences(name => manifest.resolveReference(name));

    let view = manifest.newView(type, name, id, tags);
    view.source = item.source;
    view.description = item.description;
    // TODO: How to set the version?
    // view.version = item.version;
    let source = loader.join(manifest.fileName, item.source);
    // TODO: json5?
    let json = await loader.loadResource(source);
    let entities = JSON.parse(json);
    for (let entity of entities) {
      let id = entity.$id || manifest.generateID();
      delete entity.$id;
      if (type.isSetView) {
        view.store({
          id,
          rawData: entity,
        });
      } else {
        view.set({
          id,
          rawData: entity,
        })
      }
    }
  }
  _newRecipe(name) {
    // TODO: use name
    let recipe = new Recipe();
    this._recipes.push(recipe);
    return recipe;
  }

  toString(options) {
    // TODO: sort?
    options = options || {};
    let results = [];

    this._imports.forEach(i => {
      if (options.recursive) {
        results.push(`# import '${i.fileName}'`);
        let importStr = i.toString(options);
        results.push(`${i.toString(options)}`);
      } else {
        results.push(`import '${i.fileName}'`);
      }
    });

    Object.values(this._schemas).forEach(s => {
      results.push(s.toString());
    });

    Object.values(this._particles).forEach(p => {
      results.push(p.toString());
    });

    this._recipes.forEach(r => {
      results.push(r.toString(options));
    });

    let views = [...this.views].sort(util.compareComparables);
    views.forEach(v => {
      results.push(v.toString(this._viewTags.get(v)));
    });

    return results.join('\n');
  }
}

export default Manifest;
