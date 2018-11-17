/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {digest} from '../../platform/digest-web.js';
import {parser} from '../build/manifest-parser.js';
import {Recipe} from './recipe/recipe.js';
import {Handle} from './recipe/handle.js';
import {ParticleSpec} from './particle-spec.js';
import {Schema} from './schema.js';
import {Search} from './recipe/search.js';
import {Shape} from './shape.js';
import {Type} from './type.js';
import {compareComparables} from './recipe/util.js';
import {StorageProviderBase} from './storage/storage-provider-base.js';
import {StorageProviderFactory} from './storage/storage-provider-factory.js';
import {ManifestMeta} from './manifest-meta.js';
import {ParticleEndPoint, HandleEndPoint, TagEndPoint} from './recipe/connection-constraint.js';
import {Id} from './id.js';
import {TypeVariable} from './type-variable.js';
import {SlotInfo} from './slot-info.js';

import {RecipeIndex} from '../recipe-index.js';

class ManifestError extends Error {
  location: {offset: number, line: number, column: number};
  key: string;
  constructor(location, message) {
    super(message);
    this.location = location;
  }
}

export class StorageStub {
  type: Type;
  id: string;
  originalId: string;
  name: string;
  storageKey: string;
  storageProviderFactory: StorageProviderFactory;
  constructor(type, id, name, storageKey, storageProviderFactory, originalId) {
    this.type = type;
    this.id = id;
    this.originalId = originalId;
    this.name = name;
    this.storageKey = storageKey;
    this.storageProviderFactory = storageProviderFactory;
  }

  async inflate() {
    const store = await this.storageProviderFactory.connect(this.id, this.type, this.storageKey);
    store.originalId = this.originalId;
    return store;
  }
}

/**
 * Calls `this.visit()` for each node in a manfest AST, parents before children.
 */
class ManifestVisitor {
  traverse(ast) {
    if (['string', 'number', 'boolean'].includes(typeof ast) || ast === null) {
      return;
    }
    if (Array.isArray(ast)) {
      for (const item of ast) {
        this.traverse(item);
      }
      return;
    }
    assert(ast.location, 'expected manifest node to have `location`');
    assert(ast.kind, 'expected manifest node to have `kind`');
    let childrenVisited = false;
    const visitChildren = () => {
      if (childrenVisited) {
        return;
      }
      childrenVisited = true;
      for (const key of Object.keys(ast)) {
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

const globalWarningKeys = new Set();

type ManifestFinder<a> = (manifest: Manifest) => a;
type ManifestFinderGenerator<a> = ((manifest: Manifest) => IterableIterator<a>) | ((manifest: Manifest) => a[]);


export class Manifest {
  private _recipes = <Recipe[]>[];
  private _imports = <Manifest[]>[];
    // TODO: These should be lists, possibly with a separate flattened map.
  private _particles: {[index: string]: ParticleSpec} = {};
  private _schemas: {[index: string]: Schema} = {};
  private _stores = <StorageProviderBase[]>[];
  private _shapes = <Shape[]>[];
  storeTags: Map<StorageProviderBase, string[]> = new Map();
  private _fileName: string|null = null;
  private nextLocalID = 0;
  private readonly _id: Id;
  private _storageProviderFactory: StorageProviderFactory|undefined = undefined;
  private _meta = new ManifestMeta();
  private _resources = {};
  private storeManifestUrls: Map<string, string> = new Map();
  private warnings = <ManifestError[]>[];
  constructor({id}) {
    this._id = id;
    this['recipeIndex'] = {recipes: []};
  }
  get id() {
    if (this._meta.name) {
      return Id.newSessionId().fromString(this._meta.name);
    }
    return this._id;
  }
  get storageProviderFactory() {
    if (this._storageProviderFactory == undefined) {
      this._storageProviderFactory = new StorageProviderFactory(this.id);
    }
    return this._storageProviderFactory;
  }
  get recipes() {
    return this._recipes;
  }
  get allRecipes() {
    return [...new Set(this._findAll(manifest => manifest._recipes))];
  }

  get activeRecipe() {
    return this._recipes.find(recipe => recipe.annotation === 'active');
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
  get allStores() {
    return [...this._findAll(manifest => manifest._stores)];
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
  get context() {
    return this;
  }
  get pec() { // This is a hack :(
    // QUESTION: slotComposer is a member of PEC.
    // Shouln't it also be a direct member of Arc?
    return {
      slotComposer: {
        getAvailableContexts: () => {
          return [
            {name: 'root', id: 'r0', tags: ['#root'], handles: [], handleConnections: [], spec: {isSet: false}},
            {name: 'action', id: 'r1', tags: ['#remote'], handles: [], handleConnections: [], spec: {isSet: false}},
          ];
        }
      }
    };
  }
  applyMeta(section) {
    if (this._storageProviderFactory !== undefined) {
      assert(
          section.name === this._meta.name || section.name == undefined,
          `can't change manifest ID after storage is constructed`);
    }
    this._meta.apply(section);
  }
  // TODO: newParticle, Schema, etc.
  // TODO: simplify() / isValid().
  async createStore(type, name, id, tags, storageKey) {
    assert(!type.hasVariableReference, `stores can't have variable references`);
    const store = await this.storageProviderFactory.construct(id, type, storageKey || `volatile://${this.id}`);
    assert(store.version !== null);
    store.name = name;
    this.storeManifestUrls.set(store.id, this.fileName);
    return this._addStore(store, tags);
  }

  _addStore(store, tags) {
    this._stores.push(store);
    this.storeTags.set(store, tags ? tags : []);
    return store;
  }

  newStorageStub(type, name, id, storageKey, tags, originalId) {
    return this._addStore(new StorageStub(type, id, name, storageKey, this.storageProviderFactory, originalId), tags);
  }

  _find<a>(manifestFinder : ManifestFinder<a>) : a {
    let result = manifestFinder(this);
    if (!result) {
      for (const importedManifest of this._imports) {
        result = importedManifest._find(manifestFinder);
        if (result) {
          break;
        }
      }
    }
    return result;
  }
  * _findAll<a>(manifestFinder : ManifestFinderGenerator<a>) : IterableIterator<a> {
    yield* manifestFinder(this);
    for (const importedManifest of this._imports) {
      yield* importedManifest._findAll(manifestFinder);
    }
  }
  findSchemaByName(name) {
    return this._find(manifest => manifest._schemas[name]);
  }
  findTypeByName(name) {
    const schema = this.findSchemaByName(name);
    if (schema) {
      return Type.newEntity(schema);
    }
    const shape = this.findShapeByName(name);
    if (shape) {
      return Type.newInterface(shape);
    }
    return null;
  }
  findParticleByName(name) {
    return this._find(manifest => manifest._particles[name]);
  }
  findParticlesByVerb(verb) {
    return [...this._findAll(manifest => Object.values(manifest._particles).filter(particle => particle.primaryVerb === verb))];
  }
  findStoreByName(name) {
    return this._find(manifest => manifest._stores.find(store => store.name === name));
  }
  findStoreById(id) {
    return this._find(manifest => manifest._stores.find(store => store.id === id));
  }
  findStoreTags(store) {
    return this._find(manifest => manifest.storeTags.get(store));
  }
  findManifestUrlForHandleId(id) {
    return this._find(manifest => manifest.storeManifestUrls.get(id));
  }
  findStoreByType(type, options = {tags: <string[]>[], subtype: false}) {
    const tags = options.tags || [];
    const subtype = options.subtype || false;
    function typePredicate(store) {
      const resolvedType = type.resolvedType();
      if (!resolvedType.isResolved()) {
        return type.isCollection === store.type.isCollection && type.isBigCollection === store.type.isBigCollection;
      }

      if (subtype) {
        const [left, right] = Type.unwrapPair(store.type, resolvedType);
        if (left.isEntity && right.isEntity) {
          return left.entitySchema.isMoreSpecificThan(right.entitySchema);
        }
        return false;
      }

      return store.type.equals(type);
    }
    function tagPredicate(manifest: Manifest, handle) {
      return tags.filter(tag => !manifest.storeTags.get(handle).includes(tag)).length === 0;
    }

    const stores = [...this._findAll(manifest => manifest._stores.filter(store => typePredicate(store) && tagPredicate(manifest, store)))];

    // Quick check that a new handle can fulfill the type contract.
    // Rewrite of this method tracked by https://github.com/PolymerLabs/arcs/issues/1636.
    return stores.filter(s => !!Handle.effectiveType(
      type, [{type: s.type, direction: s.type.isInterface ? 'host' : 'inout'}]));
  }
  findShapeByName(name) {
    return this._find(manifest => manifest._shapes.find(shape => shape.name === name));
  }
  findRecipesByVerb(verb) {
    return [...this._findAll(manifest => manifest._recipes.filter(recipe => recipe.verbs.includes(verb)))];
  }
  generateID() {
    return `${this.id}:${this.nextLocalID++}`;
  }
  static async load(fileName, loader, options) {
    options = options || {};
    let {registry, id} = options;
    registry = registry || {};
    if (registry && registry[fileName]) {
      return await registry[fileName];
    }
    registry[fileName] = (async () => {
      const content = await loader.loadResource(fileName);
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
    // TODO(sjmiles): allow `context` for including an existing manifest in the import list
    let {id, fileName, position, loader, registry, context} = options;
    registry = registry || {};
    position = position || {line: 1, column: 0};
    id = `manifest:${fileName}:`;

    function dumpWarnings(manifest: Manifest) {
      for (const warning of manifest.warnings) {
        // TODO: make a decision as to whether we should be logging these here, or if it should
        //       be a responsibility of the caller.
        // TODO: figure out how to have node print the correct message and stack trace
        if (warning.key) {
          if (globalWarningKeys.has(warning.key)) {
            continue;
          }
          globalWarningKeys.add(warning.key);
        }
        console.warn(processError(warning).message);
      }
    }

    function processError(e, parseError=undefined) {
      if (!((e instanceof ManifestError) || e.location)) {
        return e;
      }
      const lines = content.split('\n');
      const line = lines[e.location.start.line - 1];
      let span = 1;
      if (e.location.end.line === e.location.start.line) {
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
      if (parseError) {
        preamble = 'Parse error in';
      } else {
        preamble = 'Post-parse processing error caused by';
      }
      const message = `${preamble} '${fileName}' line ${e.location.start.line}.
${e.message}
  ${line}
  ${highlight}`;
      const err = new Error(message);
      if (!parseError) {
        err.stack = e.stack;
      }
      return err;
    }

    let items = [];
    try {
      items = parser.parse(content);
    } catch (e) {
      throw processError(e, true);
    }
    const manifest = new Manifest({id});
    manifest._fileName = fileName;
    // This is a hack.
    this['recipeIndex'] = new RecipeIndex(manifest, loader, /* affordance= */ 'dom');

    // TODO(sjmiles): optionally include pre-existing context
    if (context) {
      manifest._imports.push(context);
    }

    try {
      // Loading of imported manifests is triggered in parallel to avoid a serial loading
      // of resources over the network.
      await Promise.all(items.filter(item => item.kind === 'import').map(async item => {
        const path = loader.path(manifest.fileName);
        const target = loader.join(path, item.path);
        try {
          manifest._imports.push(await Manifest.load(target, loader, {registry}));
        } catch (e) {
          manifest.warnings.push(e);
          manifest.warnings.push(new ManifestError(item.location, `Error importing '${target}'`));
        }
      }));

      const processItems = async (kind, f) => {
        for (const item of items) {
          if (item.kind === kind) {
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
    const visitor = new class extends ManifestVisitor {
      constructor() {
        super();
      }
      visit(node, visitChildren) {
        // TODO(dstockwell): set up a scope and merge type variables here, so that
        //     errors relating to failed merges can reference the manifest source.
        visitChildren();

        switch (node.kind) {
        case 'schema-inline': {
          const schemas = [];
          const aliases = [];
          const names = [];
          for (const name of node.names) {
            const resolved = manifest.resolveTypeName(name);
            if (resolved && resolved.schema && resolved.schema.isAlias) {
              aliases.push(resolved.schema);
            } else {
              names.push(name);
            }
            if (resolved && resolved.schema) {
              schemas.push(resolved.schema);
            }
          }
          const fields = {};
          for (let {name, type} of node.fields) {
            for (const schema of schemas) {
              if (!type) {
                // If we don't have a type, try to infer one from the schema.
                type = schema.fields[name];
              } else {
                // Validate that the specified or inferred type matches the schema.
                const externalType = schema.fields[name];
                if (externalType && !Schema.typesEqual(externalType, type)) {
                  throw new ManifestError(node.location, `Type of '${name}' does not match schema (${type} vs ${externalType})`);
                }
              }
            }
            if (!type) {
              throw new ManifestError(node.location, `Could not infer type of '${name}' field`);
            }
            fields[name] = type;
          }
          let schema = new Schema({
            names,
            fields,
          });
          for (const alias of aliases) {
            schema = Schema.union(alias, schema);
            if (!schema) {
              throw new ManifestError(node.location, `Could not merge schema aliases`);
            }
          }
          node.model = Type.newEntity(schema);
          return;
        }
        case 'variable-type': {
          const constraint = node.constraint && node.constraint.model;
          node.model = Type.newVariable(new TypeVariable(node.name, constraint, null));
          return;
        }
        case 'slot-type': {
          const fields = {};
          for (const fieldIndex of Object.keys(node.fields)) {
            const field = node.fields[fieldIndex];
            fields[field.name] = field.value;
          }
          const slotInfo = {formFactor: fields['formFactor'],
                            handle: fields['handle']};
          node.model = Type.newSlot(new SlotInfo(slotInfo));
          return;
        }
        case 'type-name': {
          const resolved = manifest.resolveTypeName(node.name);
          if (!resolved) {
            throw new ManifestError(
                node.location,
                `Could not resolve type reference to type name '${node.name}'`);
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
        case 'collection-type':
          node.model = Type.newCollection(node.type.model);
          return;
        case 'big-collection-type':
          node.model = Type.newBigCollection(node.type.model);
          return;
        case 'reference-type':
          node.model = Type.newReference(node.type.model);
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
    const fields = {};
    let names = [...schemaItem.names];
    for (const item of schemaItem.items) {
      switch (item.kind) {
        case 'schema-field': {
          const field = item;
          if (fields[field.name]) {
            throw new ManifestError(field.location, `Duplicate definition of field '${field.name}'`);
          }
          fields[field.name] = field.type;
          break;
        }
        case 'description': {
          if (description) {
            throw new ManifestError(item.location, `Duplicate schema description`);
          }
          description = item;
          break;
        }
        default:
          throw new ManifestError(item.location, `unknown parser artifact ${item.kind} while processing schema`);
      }
    }

    for (const parent of schemaItem.parents) {
      const result = manifest.findSchemaByName(parent);
      if (!result) {
        throw new ManifestError(
            schemaItem.location,
            `Could not find parent schema '${parent}'`);
      }
      for (const [name, type] of Object.entries(result.fields)) {
        if (fields[name] && !Schema.typesEqual(fields[name], type)) {
          throw new ManifestError(schemaItem.location,
              `'${parent}' defines incompatible type for field '${name}'`);
        }
      }
      Object.assign(fields, result.fields);
      names.push(...result.names);
    }
    names = [names[0], ...names.filter(name => name !== names[0])];
    const name = schemaItem.alias || names[0];
    if (!name) {
      throw new ManifestError(
          schemaItem.location,
          `Schema defined without name or alias`);
    }
    const model = {names, fields, description};
    const schema = new Schema(model);
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
      const warning = new ManifestError(particleItem.location, `Particle uses deprecated argument body`);
      warning.key = 'hasParticleArgument';
      manifest._warnings.push(warning);

    }

    // TODO: loader should not be optional.
    if (particleItem.implFile && loader) {
      particleItem.implFile = loader.join(manifest.fileName, particleItem.implFile);
    }

    const processArgTypes = args => {
      for (const arg of args) {
        arg.type = arg.type.model;
        processArgTypes(arg.dependentConnections);
      }
    };
    processArgTypes(particleItem.args);

    const particleSpec = new ParticleSpec(particleItem);
    manifest._particles[particleItem.name] = particleSpec;
  }
  // TODO: Move this to a generic pass over the AST and merge with resolveTypeName.
  static _processShape(manifest, shapeItem) {
    if (shapeItem.interface) {
      const warning = new ManifestError(shapeItem.location, `Shape uses deprecated argument body`);
      warning.key = 'hasShapeArgument';
      manifest._warnings.push(warning);
    }
    const inHandles = shapeItem.interface ? shapeItem.interface.args : shapeItem.args;
    const handles = [];

    for (const arg of inHandles) {
      const handle = {name: undefined, type: undefined, direction: arg.direction};
      if (arg.name !== '*') {
        handle.name = arg.name;
      }
      if (arg.type) {
        handle.type = arg.type.model;
      }
      handles.push(handle);
    }
    const slots = [];
    for (const slotItem of shapeItem.slots) {
      slots.push({
        direction: slotItem.direction,
        name: slotItem.name,
        isRequired: slotItem.isRequired,
        isSet: slotItem.isSet
      });
    }
    // TODO: move shape to recipe/ and add shape builder?
    const shape = new Shape(shapeItem.name, handles, slots);
    manifest._shapes.push(shape);
  }
  static async _processRecipe(manifest, recipeItem, loader) {
    // TODO: annotate other things too
    const recipe = manifest._newRecipe(recipeItem.name);
    recipe.annotation = recipeItem.annotation;
    recipe.verbs = recipeItem.verbs;
    const items = {
      handles: recipeItem.items.filter(item => item.kind === 'handle'),
      byHandle: new Map(),
      particles: recipeItem.items.filter(item => item.kind === 'particle'),
      byParticle: new Map(),
      slots: recipeItem.items.filter(item => item.kind === 'slot'),
      bySlot: new Map(),
      byName: new Map(),
      connections: recipeItem.items.filter(item => item.kind === 'connection'),
      search: recipeItem.items.find(item => item.kind === 'search'),
      description: recipeItem.items.find(item => item.kind === 'description')
    };

    for (const item of items.handles) {
      const handle = recipe.newHandle();
      const ref = item.ref || {tags: []};
      if (ref.id) {
        handle.id = ref.id;
        const targetStore = manifest.findStoreById(handle.id);
        if (targetStore) {
          handle.mapToStorage(targetStore);
        }
      } else if (ref.name) {
        const targetStore = manifest.findStoreByName(ref.name);
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

    const prepareEndpoint = (connection, info) => {
      switch (info.targetType) {
        case 'particle': {
          const particle = manifest.findParticleByName(info.particle);
          if (!particle) {
            throw new ManifestError(
                connection.location,
                `could not find particle '${info.particle}'`);
          }
          if (info.param !== null && !particle.connectionMap.has(info.param)) {
            throw new ManifestError(
                connection.location,
                `param '${info.param}' is not defined by '${info.particle}'`);
          }
          return new ParticleEndPoint(particle, info.param);
        }
        case 'localName': {
          if (!items.byName.has(info.name)) {
            throw new ManifestError(
                connection.location,
                `local name '${info.name}' does not exist in recipe`);
          }
          if (info.param == null && info.tags.length === 0 &&
              items.byName.get(info.name).handle) {
            return new HandleEndPoint(items.byName.get(info.name).handle);
          }
          throw new ManifestError(connection.location, `references to particles by local name not yet supported`);
        }
        case 'tag': {
          return new TagEndPoint(info.tags);
        }
        default:
          throw new Error(`endpoint ${info.targetType} not supported`);
      }
    };

    for (const connection of items.connections) {
      const from = prepareEndpoint(connection, connection.from);
      const to = prepareEndpoint(connection, connection.to);
      recipe.newConnectionConstraint(from, to, connection.direction);
    }

    if (items.search) {
      recipe.search = new Search(items.search.phrase, items.search.tokens);
    }

    for (const item of items.slots) {
      const slot = recipe.newSlot();
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
    for (const item of items.particles) {
      const particle = recipe.newParticle(item.ref.name);
      particle.tags = item.ref.tags;
      particle.verbs = item.ref.verbs;
      if (item.ref.name) {
        const spec = manifest.findParticleByName(item.ref.name);
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

      for (const slotConnectionItem of item.slotConnections) {
        let slotConn = particle.consumedSlotConnections[slotConnectionItem.param];
        if (!slotConn) {
          slotConn = particle.addSlotConnection(slotConnectionItem.param);
        }
        slotConn.tags = slotConnectionItem.tags || [];
        slotConnectionItem.providedSlots.forEach(ps => {
          let providedSlot = slotConn.providedSlots[ps.param];
          if (providedSlot) {
            if (ps.name) {
              if (items.byName.has(ps.name)) {
                // The slot was added to the recipe twice - once as part of the
                // slots in the manifest, then as part of particle spec.
                // Unifying both slots, updating name and source slot connection.
                const theSlot = items.byName.get(ps.name);
                assert(theSlot !== providedSlot);
                assert(!theSlot.name && providedSlot);
                assert(!theSlot.sourceConnection && providedSlot.sourceConnection);
                assert(theSlot.handleConnections.length === 0);
                theSlot.name = providedSlot.name;
                theSlot.sourceConnection = providedSlot.sourceConnection;
                theSlot.sourceConnection.providedSlots[theSlot.name] = theSlot;
                theSlot._handleConnections = providedSlot.handleConnections.slice();
                theSlot.recipe.removeSlot(providedSlot);
              } else {
                items.byName.set(ps.name, providedSlot);
              }
            }
            items.bySlot.set(providedSlot, ps);
          } else {
            providedSlot = items.byName.get(ps.name);
          }
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

    for (const [particle, item] of items.byParticle) {
      for (const connectionItem of item.connections) {
        let connection;
        if (connectionItem.param === '*') {
          connection = particle.addUnnamedConnection();
        } else {
          connection = particle.connections[connectionItem.param];
          if (!connection) {
            connection = particle.addConnectionName(connectionItem.param);
          }
          // TODO: else, merge tags? merge directions?
        }
        connection.tags = connectionItem.target ? connectionItem.target.tags : [];
        const direction = {'->': 'out', '<-': 'in', '=': 'inout', 'consume': '`consume', 'provide': '`provide'}[connectionItem.dir];
        if (connection.direction) {
          if (connection.direction !== direction &&
              direction !== 'inout' &&
              !(connection.direction === 'host' && direction === 'in') &&
              !(connection.direction === '`consume' && direction === 'in') &&
              !(connection.direction === '`provide' && direction === 'out')
            ) {
            throw new ManifestError(
                connectionItem.location,
                `'${connectionItem.dir}' not compatible with '${connection.direction}' param of '${particle.name}'`);
          }
        } else {
          if (connectionItem.param !== '*' && particle.spec !== undefined) {
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
            const handle = recipe.newHandle();
            handle.tags = [];
            handle.localName = connectionItem.target.name;
            handle.fate = 'create';
            handle.item = {kind: 'handle'};
            entry = {item: handle.item, handle};
            items.byName.set(handle.localName, entry);
            items.byHandle.set(handle, handle.item);
          } else if (!entry.item) {
            throw new Error(`did not expect ${entry} expected handle or particle`);
          }

          if (entry.item.kind === 'handle') {
            targetHandle = entry.handle;
          } else if (entry.item.kind === 'particle') {
            targetParticle = entry.particle;
          } else {
            throw new Error(`did not expect ${entry.item.kind}`);
          }
        }

        // Handle implicit handle connections in the form `param = SomeParticle`
        if (connectionItem.target && connectionItem.target.particle) {
          const hostedParticle = manifest.findParticleByName(connectionItem.target.particle);
          if (!hostedParticle) {
            throw new ManifestError(
                connectionItem.target.location,
                `Could not find hosted particle '${connectionItem.target.particle}'`);
          }
          assert(!connection.type.hasVariableReference);
          assert(connection.type.isInterface);
          if (!connection.type.interfaceShape.restrictType(hostedParticle)) {
            throw new ManifestError(
                connectionItem.target.location,
                `Hosted particle '${hostedParticle.name}' does not match shape '${connection.name}'`);
          }
          // TODO: loader should not be optional.
          if (hostedParticle.implFile && loader) {
            hostedParticle.implFile = loader.join(manifest.fileName, hostedParticle.implFile);
          }
          const hostedParticleLiteral = hostedParticle.clone().toLiteral();
          const particleSpecHash = await digest(JSON.stringify(hostedParticleLiteral));
          const id = `${manifest.generateID()}:${particleSpecHash}:${hostedParticle.name}`;
          hostedParticleLiteral.id = id;
          targetHandle = recipe.newHandle();
          targetHandle.fate = 'copy';
          const store = await manifest.createStore(connection.type, null, id, []);
          // TODO(shans): Work out a better way to turn off reference mode for these stores.
          // Maybe a different function call in the storageEngine? Alternatively another
          // param to the connect/construct functions?
          store.referenceMode = false;
          await store.set(hostedParticleLiteral);
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

      for (const slotConnectionItem of item.slotConnections) {
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
          assert(targetSlot === items.byName.get(slotConnectionItem.name),
                 `Target slot ${targetSlot.name} doesn't match slot connection ${slotConnectionItem.param}`);
        } else if (slotConnectionItem.name) {
          targetSlot = recipe.newSlot(slotConnectionItem.param);
          targetSlot.localName = slotConnectionItem.name;
          if (slotConnectionItem.name) {
            items.byName.set(slotConnectionItem.name, targetSlot);
          }
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
  resolveTypeName(name) {
    const schema = this.findSchemaByName(name);
    if (schema) {
      return {schema};
    }
    const shape = this.findShapeByName(name);
    if (shape) {
      return {shape};
    }
    return null;
  }
  static async _processStore(manifest, item, loader) {
    const name = item.name;
    let id = item.id;
    const originalId = item.originalId;
    const type = item.type.model;
    if (id == null) {
      id = `${manifest._id}store${manifest._stores.length}`;
    }
    let tags = item.tags;
    if (tags == null) {
      tags = [];
    }


    // Instead of creating links to remote firebase during manifest parsing,
    // we generate storage stubs that contain the relevant information.
    if (item.origin === 'storage') {
      manifest.newStorageStub(type, name, id, item.source, tags, originalId);
      return;
    }

    let json;
    let source;
    if (item.origin === 'file') {
      source = loader.join(manifest.fileName, item.source);
      // TODO: json5?
      json = await loader.loadResource(source);
    } else if (item.origin === 'resource') {
      source = item.source;
      json = manifest.resources[source];
      if (json == undefined) {
        throw new Error(`Resource '${source}' referenced by store '${id}' is not defined in this manifest`);
      }
    }
    let entities;
    try {
      entities = JSON.parse(json);
    } catch (e) {
      throw new ManifestError(item.location, `Error parsing JSON from '${source}' (${e.message})'`);
    }

    // TODO: clean this up
    let unitType;
    if (type.isCollection) {
      unitType = type.collectionType;
    } else if (type.isBigCollection) {
      unitType = type.bigCollectionType;
    } else {
      if (entities.length === 0) {
        await Manifest._createStore(manifest, type, name, id, tags, item, originalId);
        return;
      }
      entities = entities.slice(entities.length - 1);
      unitType = type;
    }

    if (unitType.isEntity) {
      let hasSerializedId = false;
      entities = entities.map(entity => {
        if (entity == null) {
          // FIXME: perhaps this happens when we have an empty variable?
          // we should just generate an empty list in that case.
          return null;
        }
        hasSerializedId = hasSerializedId || entity.$id;
        const id = entity.$id || manifest.generateID();
        delete entity.$id;
        return {id, rawData: entity};
      });
      // TODO(wkorman): Efficiency improvement opportunities: (1) We could build
      // array of entities in above map rather than mapping again below, (2) we
      // could hash the object tree data directly rather than stringifying.
      if (!item.id && !hasSerializedId) {
        const entityHash = await digest(JSON.stringify(entities.map(entity => entity.rawData)));
        id = `${id}:${entityHash}`;
      }
    }

    const version = item.version || 0;
    const store = await Manifest._createStore(manifest, type, name, id, tags, item, originalId);

    // While the referenceMode hack exists, we need to look at the entities being stored to
    // determine whether this store should be in referenceMode or not.
    // TODO(shans): Eventually the actual type will need to be part of the determination too.
    // TODO(shans): Need to take into account the possibility of multiple storage key mappings
    // at some point.
    if (entities.length > 0 && entities[0].rawData && entities[0].rawData.storageKey) {
      let storageKey = entities[0].rawData.storageKey;
      storageKey = manifest.findStoreByName(storageKey).storageKey;
      entities = entities.map(({id, rawData}) => ({id, storageKey}));
    } else if (entities.length > 0) {
      store.referenceMode = false;
    }

    // For this store to be able to be treated as a CRDT, each item needs a key.
    // Using id as key seems safe, nothing else should do this.
    let model;
    if (type.isCollection) {
      model = entities.map(value => ({id: value.id, value, keys: new Set([value.id])}));
    } else if (type.isBigCollection) {
      model = entities.map(value => {
        const index = value.rawData.$index;
        delete value.rawData.$index;
        return {id: value.id, index, value, keys: new Set([value.id])};
      });
    } else {
      model = entities.map(value => ({id: value.id, value}));
    }
    store.fromLiteral({version, model});
  }
  static async _createStore(manifest, type, name, id, tags, item, originalId) {
    const store = await manifest.createStore(type, name, id, tags);
    store.source = item.source;
    store.description = item.description;
    store.originalId = originalId;
    return store;
  }
  _newRecipe(name) {
    const recipe = new Recipe(name);
    this._recipes.push(recipe);
    return recipe;
  }

  toString(options) {
    // TODO: sort?
    options = options || {};
    const results = [];

    this._imports.forEach(i => {
      if (options.recursive) {
        results.push(`// import '${i.fileName}'`);
        const importStr = i.toString(options);
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

    const stores = [...this.stores].sort(compareComparables);
    stores.forEach(store => {
      results.push(store.toString(this.storeTags.get(store).map(a => `#${a}`)));
    });

    return results.join('\n');
  }
}
