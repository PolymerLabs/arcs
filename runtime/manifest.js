/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {digest} from '../platform/digest-web.js';
import {parser} from './build/manifest-parser.js';
import {Recipe} from './recipe/recipe.js';
import {ParticleSpec} from './particle-spec.js';
import {Schema} from './schema.js';
import {Search} from './recipe/search.js';
import {Shape} from './shape.js';
import {Type} from './type.js';
import * as util from './recipe/util.js';
import {StorageProviderFactory} from './storage/storage-provider-factory.js';
import {ManifestMeta} from './manifest-meta.js';
import {TypeChecker} from './recipe/type-checker.js';
import {ParticleEndPoint, HandleEndPoint, TagEndPoint} from './recipe/connection-constraint.js';

class ManifestError extends Error {
  constructor(location, message) {
    super(message);
    this.location = location;
  }
}

// Calls `this.visit()` for each node in a manfest AST, parents before children.
class ManifestVisitor {
  traverse(ast) {
    if (['string', 'number', 'boolean'].includes(typeof ast) || ast === null) {
      return;
    }
    if (Array.isArray(ast)) {
      for (let item of ast) {
        this.traverse(item);
      }
      return;
    }
    assert(ast.location, 'expected manifest node to have `location`');
    assert(ast.kind, 'expected manifest node to have `kind`');
    let childrenVisited = false;
    let visitChildren = () => {
      if (childrenVisited) {
        return;
      }
      childrenVisited = true;
      for (let key of Object.keys(ast)) {
        if (['location', 'kind', 'model'].includes(key)) {
          continue;
        }
        this.traverse(ast[key]);
      }
    };
    this.visit(ast, visitChildren);
    visitChildren();
  }

  // Parents are visited before children, but an implementation can force
  // children to be visted by calling `visitChildren()`.
  visit(node, visitChildren) {
  }
}

let globalWarningKeys = new Set();

export class Manifest {
  constructor({id}) {
    this._recipes = [];
    this._imports = [];
    // TODO: These should be lists, possibly with a separate flattened map.
    this._particles = {};
    this._schemas = {};
    this._stores = [];
    this._shapes = [];
    this._storeTags = new Map();
    this._fileName = null;
    this._nextLocalID = 0;
    this._id = id;
    this._storageProviderFactory = undefined;
    this._meta = new ManifestMeta();
    this._resources = {};
    this._storeManifestUrls = new Map();
    this._warnings = [];
  }
  get id() {
    if (this._meta.name)
      return this._meta.name;
    return this._id;
  }
  get storageProviderFactory() {
    if (this._storageProviderFactory == undefined)
      this._storageProviderFactory = new StorageProviderFactory(this.id);
    return this._storageProviderFactory;
  }
  get recipes() {
    return [...new Set(this._findAll(manifest => manifest._recipes))];
  }

  get activeRecipe() {
    return this._recipes.find(recipe => recipe.annotation == 'active');
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
  get stores() {
    return this._stores;
  }
  get shapes() {
    return this._shapes;
  }
  get meta() {
    return this._meta;
  }
  get resources() {
    return this._resources;
  }
  applyMeta(section) {
    if (this._storageProviderFactory !== undefined)
      assert(section.name == this._meta.name || section.name == undefined, `can't change manifest ID after storage is constructed`);
    this._meta.apply(section);
  }
  // TODO: newParticle, Schema, etc.
  // TODO: simplify() / isValid().
  async newStore(type, name, id, tags) {
    assert(!type.hasVariableReference, `stores can't have variable references`);
    let store = await this.storageProviderFactory.construct(id, type, `in-memory://${this.id}`);
    assert(store._version !== null);
    store.name = name;
    this._storeManifestUrls.set(store.id, this.fileName);
    return this._addStore(store, tags);
  }

  _addStore(store, tags) {
    this._stores.push(store);
    this._storeTags.set(store, tags ? tags : []);
    return store;
  }

  newStorageStub(type, name, id, storageKey, tags) {
    return this._addStore({type, id, name, storageKey}, tags);
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
  * _findAll(manifestFinder) {
    yield* manifestFinder(this);
    for (let importedManifest of this._imports) {
      yield* importedManifest._findAll(manifestFinder);
    }
  }
  findSchemaByName(name) {
    return this._find(manifest => manifest._schemas[name]);
  }
  findTypeByName(name) {
    let schema = this.findSchemaByName(name);
    if (schema)
      return Type.newEntity(schema);
    let shape = this.findShapeByName(name);
    if (shape)
      return Type.newInterface(shape);
    return null;
  }
  findParticleByName(name) {
    return this._find(manifest => manifest._particles[name]);
  }
  findParticlesByVerb(verb) {
    return [...this._findAll(manifest => Object.values(manifest._particles).filter(particle => particle.primaryVerb == verb))];
  }
  findStoreByName(name) {
    return this._find(manifest => manifest._stores.find(store => store.name == name));
  }
  findStoreById(id) {
    return this._find(manifest => manifest._stores.find(store => store.id == id));
  }
  findManifestUrlForHandleId(id) {
    return this._find(manifest => manifest._storeManifestUrls.get(id));
  }
  findStoreByType(type, options={}) {
    let tags = options.tags || [];
    let subtype = options.subtype || false;
    function typePredicate(store) {
      let resolvedType = type.resolvedType();
      if (!resolvedType.isResolved()) {
        return type.isCollection == store.type.isCollection;
      }

      if (subtype) {
        let [left, right] = Type.unwrapPair(store.type, resolvedType);
        if (left.isEntity && right.isEntity) {
          return left.entitySchema.isMoreSpecificThan(right.entitySchema);
        }
        return false;
      }

      return store.type.equals(type);
    }
    function tagPredicate(manifest, handle) {
      return tags.filter(tag => !manifest._storeTags.get(handle).includes(tag)).length == 0;
    }
    return [...this._findAll(manifest => manifest._stores.filter(store => typePredicate(store) && tagPredicate(manifest, store)))];
  }
  findShapeByName(name) {
    return this._find(manifest => manifest._shapes.find(shape => shape.name == name));
  }
  findRecipesByVerb(verb) {
    return [...this._findAll(manifest => manifest._recipes.filter(recipe => recipe.name == verb))];
  }
  generateID() {
    return `${this.id}:${this._nextLocalID++}`;
  }
  static async load(fileName, loader, options) {
    options = options || {};
    let {registry, id} = options;
    registry = registry || {};
    if (registry && registry[fileName]) {
      return await registry[fileName];
    }
    registry[fileName] = (async () => {
      let content = await loader.loadResource(fileName);
      // TODO: When does this happen? The loader should probably throw an exception here.
      assert(content !== undefined, `${fileName} unable to be loaded by Manifest parser`);
      return await Manifest.parse(content, {
        id,
        fileName,
        loader,
        registry,
        position: {line: 1, column: 0}
      });
    })();
    return await registry[fileName];
  }

  static async parse(content, options) {
    options = options || {};
    let {id, fileName, position, loader, registry} = options;
    registry = registry || {};
    position = position || {line: 1, column: 0};
    id = `manifest:${fileName}:`;

    function dumpWarnings(manifest) {
      for (let warning of manifest._warnings) {
        // TODO: make a decision as to whether we should be logging these here, or if it should
        //       be a responsibility of the caller.
        // TODO: figure out how to have node print the correct message and stack trace
        if (warning.key) {
          if (globalWarningKeys.has(warning.key))
            continue;
          globalWarningKeys.add(warning.key);
        }
        console.warn(processError(warning).message);
      }
    }

    function processError(e, parseError) {
      if (!((e instanceof ManifestError) || e.location)) {
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
      let preamble;
      if (parseError)
        preamble = 'Parse error in';
      else
        preamble = 'Post-parse processing error caused by';
      let message = `${preamble} '${fileName}' line ${e.location.start.line}.
${e.message}
  ${line}
  ${highlight}`;
      let err = new Error(message);
      if (!parseError)
        err.stack = e.stack;
      return err;
    }

    let items = [];
    try {
      items = parser.parse(content);
    } catch (e) {
      throw processError(e, true);
    }
    let manifest = new Manifest({id});
    manifest._fileName = fileName;

    try {
      // Loading of imported manifests is triggered in parallel to avoid a serial loading
      // of resources over the network.
      await Promise.all(items.filter(item => item.kind == 'import').map(async item => {
        let path = loader.path(manifest.fileName);
        let target = loader.join(path, item.path);
        try {
          manifest._imports.push(await Manifest.load(target, loader, {registry}));
        } catch (e) {
          manifest._warnings.push(e);
          manifest._warnings.push(new ManifestError(item.location, `Error importing '${target}'`));
        }
      }));

      let processItems = async (kind, f) => {
        for (let item of items) {
          if (item.kind == kind) {
            Manifest._augmentAstWithTypes(manifest, item);
            await f(item);
          }
        }
      };

      // processing meta sections should come first as this contains identifying
      // information that might need to be used in other sections. For example,
      // the meta.name, if present, becomes the manifest id which is relevant
      // when constructing manifest stores.
      await processItems('meta', meta => manifest.applyMeta(meta.items));
      // similarly, resources may be referenced from other parts of the manifest.
      await processItems('resource', item => this._processResource(manifest, item));
      await processItems('schema', item => this._processSchema(manifest, item));
      await processItems('shape', item => this._processShape(manifest, item));
      await processItems('particle', item => this._processParticle(manifest, item, loader));
      await processItems('store', item => this._processStore(manifest, item, loader));
      await processItems('recipe', item => this._processRecipe(manifest, item, loader));
    } catch (e) {
      dumpWarnings(manifest);
      throw processError(e, false);
    }
    dumpWarnings(manifest);
    return manifest;
  }
  static _augmentAstWithTypes(manifest, items) {
    let visitor = new class extends ManifestVisitor {
      constructor() {
        super();
      }
      visit(node, visitChildren) {
        // TODO(dstockwell): set up a scope and merge type variables here, so that
        //     errors relating to failed merges can reference the manifest source.
        visitChildren();
        switch (node.kind) {
        case 'schema-inline': {
          let schemas = [];
          let aliases = [];
          let names = [];
          for (let name of node.names) {
            let resolved = manifest.resolveReference(name);
            if (resolved && resolved.schema && resolved.schema.isAlias) {
              aliases.push(resolved.schema);
            } else {
              names.push(name);
            }
            if (resolved && resolved.schema) {
              schemas.push(resolved.schema);
            }
          }
          let fields = {};
          for (let {name, type} of node.fields) {
            for (let schema of schemas) {
              if (!type) {
                // If we don't have a type, try to infer one from the schema.
                type = schema.fields[name];
              } else {
                // Validate that the specified or inferred type matches the schema.
                let externalType = schema.fields[name];
                if (externalType && !Schema.typesEqual(externalType, type)) {
                  throw new ManifestError(
                      node.location,
                      `Type of '${name}' does not match schema (${type} vs ${externalType})`);
                }
              }
            }
            if (!type) {
              throw new ManifestError(
                  node.location,
                  `Could not infer type of '${name}' field`);
            }
            fields[name] = type;
          }
          let schema = new Schema({
            names,
            fields,
          });
          for (let alias of aliases) {
            schema = Schema.union(alias, schema);
            if (!schema) {
              throw new ManifestError(
                  node.location,
                  `Could not merge schema aliases`);
            }
          }
          node.model = Type.newEntity(schema);
          return;
        }
        case 'variable-type': {
          let constraint = node.constraint && node.constraint.model;
          node.model = Type.newVariable({name: node.name, constraint});
          return;
        }
        case 'reference-type': {
          let resolved = manifest.resolveReference(node.name);
          if (!resolved) {
            throw new ManifestError(
                node.location,
                `Could not resolve type reference '${node.name}'`);
          }
          if (resolved.schema) {
            node.model = Type.newEntity(resolved.schema);
          } else if (resolved.shape) {
            node.model = Type.newInterface(resolved.shape);
          } else {
            throw new Error('Expected {shape} or {schema}');
          }
          return;
        }
        case 'list-type':
          node.model = Type.newCollection(node.type.model);
          return;
        default:
          return;
        }
      }
    }();
    visitor.traverse(items);
  }
  static _processSchema(manifest, schemaItem) {
    let description;
    let fields = {};
    let names = [...schemaItem.names];
    for (let item of schemaItem.items) {
      switch (item.kind) {
        case 'schema-field': {
          let field = item;
          if (fields[field.name]) {
            throw new ManifestError(field.location, `Duplicate definition of field '${field.name}'`);
          }
          fields[field.name] = field.type;
          break;
        }
        case 'schema-section': {
          let section = item;
          manifest._warnings.push(new ManifestError(section.location, `Schema sections are deprecated`));
          for (let field of section.fields) {
            if (fields[field.name]) {
              throw new ManifestError(field.location, `Duplicate definition of field '${field.name}'`);
            }
            fields[field.name] = field.type;
          }
          break;
        }
        case 'description': {
          if (description) {
            throw new ManifestError(item.location, `Duplicate schema description`);
          }
          description = item;
        }
      }
    }

    for (let parent of schemaItem.parents) {
      let result = manifest.findSchemaByName(parent);
      if (!result) {
        throw new ManifestError(
            schemaItem.location,
            `Could not find parent schema '${parent}'`);
      }
      for (let [name, type] of Object.entries(result.fields)) {
        if (fields[name] && !Schema.typesEqual(fields[name], type)) {
          throw new ManifestError(schemaItem.location,
              `'${parent}' defines incompatible type for field '${name}'`);
        }
      }
      Object.assign(fields, result.fields);
      names.push(...result.names);
    }
    names = [names[0], ...names.filter(name => name != names[0])];
    let name = schemaItem.alias || names[0];
    if (!name) {
      throw new ManifestError(
          schemaItem.location,
          `Schema defined without name or alias`);
    }
    let model = {names, fields};
    if (description) model.description = description;
    let schema = new Schema(model);
    if (schemaItem.alias) {
      schema.isAlias = true;
    }
    manifest._schemas[name] = schema;
  }
  static _processResource(manifest, schemaItem) {
    manifest._resources[schemaItem.name] = schemaItem.data;
  }
  static _processParticle(manifest, particleItem, loader) {
    // TODO: we should be producing a new particleSpec, not mutating
    //       particleItem directly.
    // TODO: we should require both of these and update failing tests...
    assert(particleItem.implFile == null || particleItem.args !== null, 'no valid body defined for this particle');
    if (!particleItem.args) {
      particleItem.args = [];
    }

    if (particleItem.hasParticleArgument) {
      let warning = new ManifestError(particleItem.location, `Particle uses deprecated argument body`);
      warning.key = 'hasParticleArgument';
      manifest._warnings.push(warning);

    }

    // TODO: loader should not be optional.
    if (particleItem.implFile && loader) {
      particleItem.implFile = loader.join(manifest.fileName, particleItem.implFile);
    }

    let processArgTypes = args => {
      for (let arg of args) {
        arg.type = arg.type.model;
        processArgTypes(arg.dependentConnections);
      }
    };
    processArgTypes(particleItem.args);

    let particleSpec = new ParticleSpec(particleItem);
    manifest._particles[particleItem.name] = particleSpec;
  }
  // TODO: Move this to a generic pass over the AST and merge with resolveReference.
  static _processShape(manifest, shapeItem) {
    if (shapeItem.interface) {
      let warning = new ManifestError(shapeItem.location, `Shape uses deprecated argument body`);
      warning.key = 'hasShapeArgument';
      manifest._warnings.push(warning);
    }
    let inHandles = shapeItem.interface ? shapeItem.interface.args : shapeItem.args;
    let handles = [];

    for (let arg of inHandles) {
      let handle = {};
      handle.name = arg.name == '*' ? undefined : arg.name;
      handle.type = arg.type ? arg.type.model : undefined;
      handle.direction = arg.direction;
      handles.push(handle);
    }
    let slots = [];
    for (let slotItem of shapeItem.slots) {
      slots.push({
        direction: slotItem.direction,
        name: slotItem.name,
        isRequired: slotItem.isRequired,
        isSet: slotItem.isSet
      });
    }
    // TODO: move shape to recipe/ and add shape builder?
    let shape = new Shape(shapeItem.name, handles, slots);
    manifest._shapes.push(shape);
  }
  static async _processRecipe(manifest, recipeItem, loader) {
    // TODO: annotate other things too
    let recipe = manifest._newRecipe(recipeItem.name);
    recipe.annotation = recipeItem.annotation;
    recipe.verbs = recipeItem.verbs;
    let items = {
      handles: recipeItem.items.filter(item => item.kind == 'handle'),
      byHandle: new Map(),
      particles: recipeItem.items.filter(item => item.kind == 'particle'),
      byParticle: new Map(),
      slots: recipeItem.items.filter(item => item.kind == 'slot'),
      bySlot: new Map(),
      byName: new Map(),
      connections: recipeItem.items.filter(item => item.kind == 'connection'),
      search: recipeItem.items.find(item => item.kind == 'search'),
      description: recipeItem.items.find(item => item.kind == 'description')
    };

    for (let item of items.handles) {
      let handle = recipe.newHandle();
      let ref = item.ref || {tags: []};
      if (ref.id) {
        handle.id = ref.id;
        let targetStore = manifest.findStoreById(handle.id);
        if (targetStore)
          handle.mapToStorage(targetStore);
      } else if (ref.name) {
        let targetStore = manifest.findStoreByName(ref.name);
        // TODO: Error handling.
        assert(targetStore, `Could not find handle ${ref.name}`);
        handle.mapToStorage(targetStore);
      }
      handle.tags = ref.tags;
      if (item.name) {
        assert(!items.byName.has(item.name));
        handle.localName = item.name;
        items.byName.set(item.name, {item, handle});
      }
      handle.fate = item.fate;
      items.byHandle.set(handle, item);
    }

    let prepareEndpoint = (connection, info) => {
      switch (info.targetType) {
        case 'particle': {
          let particle = manifest.findParticleByName(info.particle);
          if (!particle)
            throw new ManifestError(connection.location, `could not find particle '${info.particle}'`);
          if (info.param !== null && !particle.connectionMap.has(info.param))
            throw new ManifestError(connection.location, `param '${info.param}' is not defined by '${info.particle}'`);
          return new ParticleEndPoint(particle, info.param);
        }
        case 'localName': {
          if (!items.byName.has(info.name))
            throw new ManifestError(connection.location, `local name '${info.name}' does not exist in recipe`);
          if (info.param == null && info.tags.length == 0 && items.byName.get(info.name).handle)
            return new HandleEndPoint(items.byName.get(info.name).handle);
          throw new ManifestError(connection.location, `references to particles by local name not yet supported`);
        }
        case 'tag': {
          return new TagEndPoint(info.tags);
        }
        default:
          assert(false, `endpoint ${info.targetType} not supported`);
      }
    };

    for (let connection of items.connections) {
      let from = prepareEndpoint(connection, connection.from);
      let to = prepareEndpoint(connection, connection.to);
      recipe.newConnectionConstraint(from, to, connection.direction);
    }

    if (items.search) {
      recipe.search = new Search(items.search.phrase, items.search.tokens);
    }

    for (let item of items.slots) {
      let slot = recipe.newSlot();
      item.ref = item.ref || {};
      if (item.ref.id) {
        slot.id = item.ref.id;
      }
      if (item.ref.tags) {
        slot.tags = item.ref.tags;
      }
      if (item.name) {
        assert(!items.byName.has(item.name), `Duplicate slot local name ${item.name}`);
        slot.localName = item.name;
        items.byName.set(item.name, slot);
      }
      items.bySlot.set(slot, item);
    }

    // TODO: disambiguate.
    for (let item of items.particles) {
      let particle = recipe.newParticle(item.ref.name);
      particle.tags = item.ref.tags;
      particle.verbs = item.ref.verbs;
      if (item.ref.name) {
        let spec = manifest.findParticleByName(item.ref.name);
        if (!spec) {
          throw new ManifestError(item.location, `could not find particle ${item.ref.name}`);
        }
        particle.spec = spec.clone();
      }
      if (item.name) {
        // TODO: errors.
        assert(!items.byName.has(item.name));
        particle.localName = item.name;
        items.byName.set(item.name, {item, particle});
      }
      items.byParticle.set(particle, item);

      for (let slotConnectionItem of item.slotConnections) {
        let slotConn = particle.consumedSlotConnections[slotConnectionItem.param];
        if (!slotConn) {
          slotConn = particle.addSlotConnection(slotConnectionItem.param);
        }
        slotConn.tags = slotConnectionItem.tags || [];
        slotConnectionItem.providedSlots.forEach(ps => {
          let providedSlot = slotConn.providedSlots[ps.param];
          if (providedSlot) {
            if (ps.name) {
              items.byName.set(ps.name, providedSlot);
            }
            items.bySlot.set(providedSlot, ps);
          } else
            providedSlot = items.byName.get(ps.name);
          if (!providedSlot) {
            providedSlot = recipe.newSlot(ps.param);
            providedSlot.localName = ps.name;
            providedSlot.sourceConnection = slotConn;
            if (ps.name) {
              assert(!items.byName.has(ps.name));
              items.byName.set(ps.name, providedSlot);
            }
            items.bySlot.set(providedSlot, ps);
          }
          if (!slotConn.providedSlots[ps.param]) {
            slotConn.providedSlots[ps.param] = providedSlot;
          }
        });
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
          if (connection.direction != direction && direction != 'inout' && !(connection.direction == 'host' && direction == 'in')) {
            throw new ManifestError(
                connectionItem.location,
                `'${connectionItem.dir}' not compatible with '${connection.direction}' param of '${particle.name}'`);
          }
        } else {
          if (connectionItem.param != '*' && particle.spec !== undefined) {
            throw new ManifestError(
                connectionItem.location,
                `param '${connectionItem.param}' is not defined by '${particle.name}'`);
          }
          connection.direction = direction;
        }

        let targetHandle;
        let targetParticle;

        if (connectionItem.target && connectionItem.target.name) {
          let entry = items.byName.get(connectionItem.target.name);
          if (!entry) {
            throw new ManifestError(
                connectionItem.location,
                `Could not find handle '${connectionItem.target.name}'`);
          }
          if (entry.item.kind == 'handle') {
            targetHandle = entry.handle;
          } else if (entry.item.kind == 'particle') {
            targetParticle = entry.particle;
          } else {
            assert(false, `did not expect ${entry.item.kind}`);
          }
        }

        // Handle implicit handle connections in the form `param = SomeParticle`
        if (connectionItem.target && connectionItem.target.particle) {
          let hostedParticle = manifest.findParticleByName(connectionItem.target.particle);
          if (!hostedParticle) {
            throw new ManifestError(
                connectionItem.target.location,
                `Could not find hosted particle '${connectionItem.target.particle}'`);
          }
          assert(!connection.type.hasVariableReference);
          let type = TypeChecker.restrictType(connection.type, hostedParticle);
          if (!type) {
            throw new ManifestError(
                connectionItem.target.location,
                `Hosted particle '${hostedParticle.name}' does not match shape '${connection.name}'`);
          }
          // TODO: loader should not be optional.
          if (hostedParticle.implFile && loader) {
            hostedParticle.implFile = loader.join(manifest.fileName, hostedParticle.implFile);
          }
          const hostedParticleLiteral = hostedParticle.clone().toLiteral();
          let particleSpecHash = await digest(JSON.stringify(hostedParticleLiteral));
          let id = `${manifest.generateID()}:${particleSpecHash}:${hostedParticle.name}`;
          targetHandle = recipe.newHandle();
          targetHandle.fate = 'copy';
          let store = await manifest.newStore(type, null, id, []);
          store.set(hostedParticleLiteral);
          targetHandle.mapToStorage(store);
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

          targetHandle = targetConnection.handle;
          if (!targetHandle) {
            // TODO: tags?
            targetHandle = recipe.newHandle();
            targetConnection.connectToHandle(targetHandle);
          }
        }

        if (targetHandle) {
          connection.connectToHandle(targetHandle);
        }
      }

      for (let slotConnectionItem of item.slotConnections) {
        // particles that reference verbs should store slot connection information as constraints to be used
        // during verb matching. However, if there's a spec then the slots need to be validated against it
        // instead.
        if (particle.spec !== undefined) {
          // Validate consumed and provided slots names are according to spec.
          if (!particle.spec.slots.has(slotConnectionItem.param)) {
            throw new ManifestError(
                slotConnectionItem.location,
                `Consumed slot '${slotConnectionItem.param}' is not defined by '${particle.name}'`);
          }
          slotConnectionItem.providedSlots.forEach(ps => {
            if (!particle.spec.slots.get(slotConnectionItem.param).getProvidedSlotSpec(ps.param)) {
              throw new ManifestError(
                  ps.location,
                  `Provided slot '${ps.param}' is not defined by '${particle.name}'`);
            }
          });
        }

        let targetSlot = items.byName.get(slotConnectionItem.name);
        if (targetSlot) {
          assert(items.bySlot.has(targetSlot));
          if (!targetSlot.name) {
            targetSlot.name = slotConnectionItem.param;
          }
          assert(targetSlot == items.byName.get(slotConnectionItem.name),
                 `Target slot ${targetSlot.name} doesn't match slot connection ${slotConnectionItem.param}`);
        } else if (slotConnectionItem.name) {
          targetSlot = recipe.newSlot(slotConnectionItem.param);
          targetSlot.localName = slotConnectionItem.name;
          if (slotConnectionItem.name)
            items.byName.set(slotConnectionItem.name, targetSlot);
          items.bySlot.set(targetSlot, slotConnectionItem);
        }
        if (targetSlot) {
          particle.consumedSlotConnections[slotConnectionItem.param].connectToSlot(targetSlot);
        }
      }
    }

    if (items.description && items.description.description) {
      recipe.description = items.description.description;
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
    return null;
  }
  static async _processStore(manifest, item, loader) {
    let name = item.name;
    let id = item.id;
    let type = item.type.model;
    if (id == null) {
      id = `${manifest._id}store${manifest._stores.length}`;
    }
    let tags = item.tags;
    if (tags == null)
      tags = [];

    if (item.origin == 'storage') {
      manifest.newStorageStub(type, name, id, item.source, tags);
      return;
    }

    let json;
    let source;
    if (item.origin == 'file') {
      source = loader.join(manifest.fileName, item.source);
      // TODO: json5?
      json = await loader.loadResource(source);
    } else if (item.origin == 'resource') {
      source = item.source;
      json = manifest.resources[source];
      if (json == undefined)
        throw new Error(`Resource '${source}' referenced by store '${id}' is not defined in this manifest`);
    }
    let entities;
    try {
      entities = JSON.parse(json);
    } catch (e) {
      throw new ManifestError(item.location, `Error parsing JSON from '${source}' (${e.message})'`);
    }

    let unitType;
    if (!type.isCollection) {
      if (entities.length == 0) {
        await Manifest._createStore(manifest, type, name, id, tags, item);
        return;
      }
      entities = entities.slice(entities.length - 1);
      unitType = type;
    } else {
      unitType = type.primitiveType();
    }

    if (unitType.isEntity) {
      let hasSerializedId = false;
      entities = entities.map(entity => {
        if (entity == null)
          return null;
        hasSerializedId = hasSerializedId || entity.$id;
        let id = entity.$id || manifest.generateID();
        delete entity.$id;
        return {id, rawData: entity};
      });
      // TODO(wkorman): Efficiency improvement opportunities: (1) We could build
      // array of entities in above map rather than mapping again below, (2) we
      // could hash the object tree data directly rather than stringifying.
      if (!item.id && !hasSerializedId) {
        let entityHash = await digest(JSON.stringify(entities.map(entity => entity.rawData)));
        id = `${id}:${entityHash}`;
      }
    }

    let version = item.version || 0;

    let store = await Manifest._createStore(manifest, type, name, id, tags, item);
    if (type.isCollection) {
      store._fromListWithVersion(entities, version);
    } else {
      store._setWithVersion(entities[0], version);
    }
  }
  static async _createStore(manifest, type, name, id, tags, item) {
    let store = await manifest.newStore(type, name, id, tags);
    store.source = item.source;
    store.description = item.description;
    return store;
  }
  _newRecipe(name) {
    let recipe = new Recipe(name);
    this._recipes.push(recipe);
    return recipe;
  }

  toString(options) {
    // TODO: sort?
    options = options || {};
    let results = [];

    this._imports.forEach(i => {
      if (options.recursive) {
        results.push(`// import '${i.fileName}'`);
        let importStr = i.toString(options);
        results.push(`${i.toString(options)}`);
      } else {
        results.push(`import '${i.fileName}'`);
      }
    });

    Object.values(this._schemas).forEach(s => {
      results.push(s.toManifestString());
    });

    Object.values(this._particles).forEach(p => {
      results.push(p.toString());
    });

    this._recipes.forEach(r => {
      results.push(r.toString(options));
    });

    let stores = [...this.stores].sort(util.compareComparables);
    stores.forEach(store => {
      results.push(store.toString(this._storeTags.get(store).map(a => `#${a}`)));
    });

    return results.join('\n');
  }
}
