/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {parse, SyntaxError} from '../gen/runtime/manifest-parser.js';
import {assert} from '../platform/assert-web.js';
import {digest} from '../platform/digest-web.js';

import {Id, IdGenerator, ArcId} from './id.js';
import {InterfaceInfo} from './interface-info.js';
import {Runnable} from './hot.js';
import {ManifestMeta} from './manifest-meta.js';
import * as AstNode from './manifest-ast-nodes.js';
import {ParticleSpec} from './particle-spec.js';
import {compareComparables, compareNumbers, compareStrings} from './recipe/comparable.js';
import {HandleEndPoint, ParticleEndPoint, TagEndPoint} from './recipe/connection-constraint.js';
import {Handle} from './recipe/handle.js';
import {RecipeUtil} from './recipe/recipe-util.js';
import {HandleConnection} from './recipe/handle-connection.js';
import {Recipe, RequireSection} from './recipe/recipe.js';
import {Search} from './recipe/search.js';
import {TypeChecker} from './recipe/type-checker.js';
import {Schema} from './schema.js';
import {StorageProviderBase} from './storage/storage-provider-base.js';
import {StorageProviderFactory} from './storage/storage-provider-factory.js';
import {BigCollectionType, CollectionType, EntityType, InterfaceType, ReferenceType, SlotType, Type, TypeVariable} from './type.js';
import {Dictionary} from './hot.js';

export class ManifestError extends Error {
  location: AstNode.SourceLocation;
  key: string;
  constructor(location: AstNode.SourceLocation, message: string) {
    super(message);
    this.location = location;
  }
}

// TODO(shans): Make sure that after refactor Storage objects have a lifecycle and can be directly used
// deflated rather than requiring this stub.
export class StorageStub {
  type: Type;
  id: string;
  name: string;
  storageKey: string;
  storageProviderFactory: StorageProviderFactory;
  referenceMode = false;
  originalId: string;

  constructor(type: Type, id: string, name: string, storageKey: string, storageProviderFactory: StorageProviderFactory, originalId: string) {
    this.type = type;
    this.id = id;
    this.name = name;
    this.storageKey = storageKey;
    this.storageProviderFactory = storageProviderFactory;
    this.originalId = originalId;
  }

  get version(): number {
    return undefined; // Fake to match StorageProviderBase.
  }

  get description(): string {
    return undefined; // Fake to match StorageProviderBase;
  }

  async inflate() {
    const store = await this.storageProviderFactory.connect(this.id, this.type, this.storageKey);
    assert(store != null, 'inflating missing storageKey ' + this.storageKey);
    store.originalId = this.originalId;
    return store;
  }

  toLiteral() {
    return undefined; // Fake to match StorageProviderBase;
  }

  toString(handleTags: string[]): string {
    const results: string[] = [];
    const handleStr: string[] = [];
    handleStr.push(`store`);
    if (this.name) {
      handleStr.push(`${this.name}`);
    }
    handleStr.push(`of ${this.type.toString()}`);
    if (this.id) {
      handleStr.push(`'${this.id}'`);
    }
    if (handleTags && handleTags.length) {
      handleStr.push(`${handleTags.join(' ')}`);
    }
    // TODO(shans): there's a 'this.source' in StorageProviderBase which is sometimes
    // serialized here too - could it ever be part of StorageStub?
    results.push(handleStr.join(' '));
    if (this.description) {
      results.push(`  description \`${this.description}\``);
    }
    return results.join('\n');
  }

  _compareTo(other: StorageProviderBase) : number {
    let cmp: number;
    cmp = compareStrings(this.name, other.name);
    if (cmp !== 0) return cmp;
    cmp = compareStrings(this.id, other.id);
    if (cmp !== 0) return cmp;
    return 0;
  }
}

/**
 * Calls `this.visit()` for each node in a manfest AST, parents before children.
 */
class ManifestVisitor {
  traverse(ast: AstNode.BaseNode) {
    if (['string', 'number', 'boolean'].includes(typeof ast) || ast === null) {
      return;
    }
    if (ast instanceof Array) {
      for (const item of ast as AstNode.BaseNode[]) {
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
  visit(node: AstNode.BaseNode, visitChildren: Runnable) {
  }
}

const globalWarningKeys: Set<string> = new Set();

type ManifestFinder<a> = (manifest: Manifest) => a;
type ManifestFinderGenerator<a> = ((manifest: Manifest) => IterableIterator<a>) | ((manifest: Manifest) => a[]);

export class Manifest {
  private _recipes: Recipe[] = [];
  private _imports: Manifest[] = [];
  // TODO: These should be lists, possibly with a separate flattened map.
  private _particles: Dictionary<ParticleSpec> = {};
  private _schemas: Dictionary<Schema> = {};
  private _stores: (StorageProviderBase|StorageStub)[] = [];
  private _interfaces = <InterfaceInfo[]>[];
  storeTags: Map<StorageProviderBase|StorageStub, string[]> = new Map();
  private _fileName: string|null = null;
  private readonly _id: Id;
  // TODO(csilvestrini): Inject an IdGenerator instance instead of creating a new one.
  private readonly _idGenerator: IdGenerator = IdGenerator.newSession();
  private _storageProviderFactory: StorageProviderFactory|undefined = undefined;
  private _meta = new ManifestMeta();
  private _resources = {};
  private storeManifestUrls: Map<string, string> = new Map();
  private errors: ManifestError[] = [];

  constructor({id}: {id: Id|string}) {
    // TODO: Cleanup usage of strings as Ids.
    assert(id instanceof Id || typeof id === 'string');
    if (id instanceof Id) {
      this._id = id;
    } else {
      // We use the first component of an ID as a session ID, for manifests parsed
      // from the file, this is the 'manifest' phrase.
      // TODO: Figure out if this is ok, and stop using internal Id APIs.
      const components = id.split(':');
      this._id = Id._newIdInternal(components[0], components.slice(1));
    }
  }

  get id() {
    if (this._meta.name) {
      return Id.fromString(this._meta.name);
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
    return Object.values(this._particles);
  }
  get allParticles() {
    return [...new Set(this._findAll(manifest => Object.values(manifest._particles)))];
  }
  get imports() {
    return this._imports;
  }
  get schemas(): Dictionary<Schema> {
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
  get interfaces() {
    return this._interfaces;
  }
  get meta() {
    return this._meta;
  }
  get resources() {
    return this._resources;
  }
  applyMeta(section: { name: string }&{key: string, value:string}[]) {
    if (this._storageProviderFactory !== undefined) {
      assert(
          section.name === this._meta.name || section.name == undefined,
          `can't change manifest ID after storage is constructed`);
    }
    this._meta.apply(section);
  }
  // TODO: newParticle, Schema, etc.
  // TODO: simplify() / isValid().
  async createStore(type: Type, name: string, id: string, tags: string[], storageKey?: string) {
    const store = await this.storageProviderFactory.construct(id, type, storageKey || `volatile://${this.id}`);
    assert(store.version !== null);
    store.name = name;
    this.storeManifestUrls.set(store.id, this.fileName);
    return this._addStore(store, tags);
  }

  _addStore(store: StorageProviderBase | StorageStub, tags: string[]) {
    this._stores.push(store);
    this.storeTags.set(store, tags ? tags : []);
    return store;
  }

  newStorageStub(type: Type, name: string, id: string, storageKey: string, tags: string[], originalId: string) {
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
  findSchemaByName(name: string): Schema {
    return this._find(manifest => manifest._schemas[name]);
  }

  findTypeByName(name: string): EntityType | InterfaceType | undefined {
    const schema = this.findSchemaByName(name);
    if (schema) {
      return new EntityType(schema);
    }
    const iface = this.findInterfaceByName(name);
    if (iface) {
      return new InterfaceType(iface);
    }
    return undefined;
  }
  findParticleByName(name: string) {
    return this._find(manifest => manifest._particles[name]);
  }
  findParticlesByVerb(verb: string) {
    return [...this._findAll(manifest => Object.values(manifest._particles).filter(particle => particle.primaryVerb === verb))];
  }
  findStoreByName(name: string) {
    return this._find(manifest => manifest._stores.find(store => store.name === name));
  }
  findStoreById(id: string) {
    return this._find(manifest => manifest._stores.find(store => store.id === id));
  }
  findStoreTags(store: StorageProviderBase | StorageStub ) {
    return this._find(manifest => manifest.storeTags.get(store));
  }
  findManifestUrlForHandleId(id: string) {
    return this._find(manifest => manifest.storeManifestUrls.get(id));
  }
  findStoresByType(type: Type, options = {tags: <string[]>[], subtype: false}): (StorageProviderBase | StorageStub)[] {
    const tags = options.tags || [];
    const subtype = options.subtype || false;
    function typePredicate(store: StorageProviderBase | StorageStub) {
      const resolvedType = type.resolvedType();
      if (!resolvedType.isResolved()) {
        return (type instanceof CollectionType) === (store.type instanceof CollectionType) &&
               (type instanceof BigCollectionType) === (store.type instanceof BigCollectionType);
      }

      if (subtype) {
        const [left, right] = Type.unwrapPair(store.type, resolvedType);
        if (left instanceof EntityType && right instanceof EntityType) {
          return left.entitySchema.isMoreSpecificThan(right.entitySchema);
        }
        return false;
      }

      return TypeChecker.compareTypes({type: store.type}, {type});
    }
    function tagPredicate(manifest: Manifest, store: StorageProviderBase | StorageStub) {
      return tags.filter(tag => !manifest.storeTags.get(store).includes(tag)).length === 0;
    }

    const stores = [...this._findAll(manifest => manifest._stores.filter(store => typePredicate(store) && tagPredicate(manifest, store)))];

    // Quick check that a new handle can fulfill the type contract.
    // Rewrite of this method tracked by https://github.com/PolymerLabs/arcs/issues/1636.
    return stores.filter(s => !!Handle.effectiveType(
      type, [{type: s.type, direction: (s.type instanceof InterfaceType) ? 'host' : 'inout'}]));
  }
  findInterfaceByName(name: string) {
    return this._find(manifest => manifest._interfaces.find(iface => iface.name === name));
  }

  findRecipesByVerb(verb: string) {
    return [...this._findAll(manifest => manifest._recipes.filter(recipe => recipe.verbs.includes(verb)))];
  }

  generateID(): Id {
    return this._idGenerator.newChildId(this.id);
  }

  static async load(fileName: string, loader: {loadResource, path?, join?}, options?): Promise<Manifest> {
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
      });
    })();
    return await registry[fileName];
  }

  static getErrors(manifest: Manifest): ManifestError[] {
    return manifest.errors;
  }

  static async parse(content: string, options?): Promise<Manifest> {
    options = options || {};
    // TODO(sjmiles): allow `context` for including an existing manifest in the import list
    let {session_id, fileName, loader, registry, context, throwImportErrors} = options;
    registry = registry || {};
    const id = `manifest:${fileName}:`;

    function dumpErrors(manifest: Manifest) {
      for (const error of manifest.errors) {
        // TODO: make a decision as to whether we should be logging these here, or if it should
        //       be a responsibility of the caller.
        // TODO: figure out how to have node print the correct message and stack trace
        if (error.key) {
          if (globalWarningKeys.has(error.key)) {
            continue;
          }
          globalWarningKeys.add(error.key);
        }
        console.warn(processError(error).message);
      }
    }

    // tslint:disable-next-line: no-any
    function processError(e: ManifestError|any, parseError: boolean|undefined = undefined) {
      if (!((e instanceof ManifestError) || e.location)) {
        return e;
      }
      return processManifestError(e, parseError);
    }

    function processManifestError(e: ManifestError, parseError: boolean|undefined = undefined) {
      const lines = content.split('\n');
      const line = lines[e.location.start.line - 1];
      // TODO(sjmiles): see https://github.com/PolymerLabs/arcs/issues/2570
      let message: string = e.message || '';
      if (line) {
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
        let preamble: string;
        if (parseError) {
          preamble = 'Parse error in';
        } else {
          preamble = 'Post-parse processing error caused by';
        }
        message = `${preamble} '${fileName}' line ${e.location.start.line}.
${e.message}
  ${line}
  ${highlight}`;
      }
      const err = new ManifestError(e.location, message);
      if (!parseError) {
        err.stack = e.stack;
      }
      return err;
    }

    let items: AstNode.All[] = [];
    try {
      items = parse(content) as AstNode.All[];
    } catch (e) {
      throw processError(e, true);
    }
    const manifest = new Manifest({id});
    manifest._fileName = fileName;

    // TODO(sjmiles): optionally include pre-existing context
    if (context) {
      manifest._imports.push(context);
    }

    try {
      // Loading of imported manifests is triggered in parallel to avoid a serial loading
      // of resources over the network.
      await Promise.all(items.map(async item => {
        if (item.kind === 'import') {
          // item is an AstNode.Import
          const path = loader.path(manifest.fileName);
          const target = loader.join(path, item.path);
          try {
            manifest._imports.push(await Manifest.load(target, loader, {registry}));
          } catch (e) {
            manifest.errors.push(e);
            manifest.errors.push(new ManifestError(item.location, `Error importing '${target}'`));
          }
        }
      }));

      const processItems = async (kind: string, f: Function) => {
        for (const item of items) {
          if (item.kind === kind) {
            Manifest._augmentAstWithTypes(manifest, item);
            await f(item);  // TODO(cypher1): Use Promise.all here.
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
      await processItems('interface', item => this._processInterface(manifest, item));
      await processItems('particle', item => this._processParticle(manifest, item, loader));
      await processItems('store', item => this._processStore(manifest, item, loader));
      await processItems('recipe', item => this._processRecipe(manifest, item, loader));
    } catch (e) {
      dumpErrors(manifest);
      throw processError(e, false);
    }
    dumpErrors(manifest);
    if (options.throwImportErrors && manifest.errors.length > 0) {
      throw manifest.errors[0];
    }
    return manifest;
  }

  private static _augmentAstWithTypes(manifest: Manifest, items) {
    const visitor = new class extends ManifestVisitor {
      constructor() {
        super();
      }
      visit(node, visitChildren: Runnable) {
        // TODO(dstockwell): set up a scope and merge type variables here, so that
        //     errors relating to failed merges can reference the manifest source.
        visitChildren();

        switch (node.kind) {
        case 'schema-inline': {
          const schemas: Schema[] = [];
          const aliases: Schema[] = [];
          const names: string[] = [];
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
          let schema = new Schema(names, fields);
          for (const alias of aliases) {
            schema = Schema.union(alias, schema);
            if (!schema) {
              throw new ManifestError(node.location, `Could not merge schema aliases`);
            }
          }
          node.model = new EntityType(schema);
          return;
        }
        case 'variable-type': {
          const constraint = node.constraint && node.constraint.model;
          node.model = TypeVariable.make(node.name, constraint, null);
          return;
        }
        case 'slot-type': {
          const fields = {};
          for (const fieldIndex of Object.keys(node.fields)) {
            const field = node.fields[fieldIndex];
            fields[field.name] = field.value;
          }
          node.model = SlotType.make(fields['formFactor'], fields['handle']);
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
            node.model = new EntityType(resolved.schema);
          } else if (resolved.iface) {
            node.model = new InterfaceType(resolved.iface);
          } else {
            throw new ManifestError(node.location, 'Expected {iface} or {schema}');
          }
          return;
        }
        case 'collection-type':
          node.model = new CollectionType(node.type.model);
          return;
        case 'big-collection-type':
          node.model = new BigCollectionType(node.type.model);
          return;
        case 'reference-type':
          node.model = new ReferenceType(node.type.model);
          return;
        default:
          return;
        }
      }
    }();
    visitor.traverse(items);
  }

  private static _processSchema(manifest: Manifest, schemaItem) {
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
    const schema = new Schema(names, fields, description);
    if (schemaItem.alias) {
      schema.isAlias = true;
    }
    manifest._schemas[name] = schema;
  }

  private static _processResource(manifest: Manifest, schemaItem) {
    manifest._resources[schemaItem.name] = schemaItem.data;
  }

  private static _processParticle(manifest: Manifest, particleItem, loader) {
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
      manifest['_warnings'].push(warning);
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

    manifest._particles[particleItem.name] = new ParticleSpec(particleItem);
  }

  // TODO: Move this to a generic pass over the AST and merge with resolveTypeName.
  private static _processInterface(manifest: Manifest, interfaceItem) {
    const handles = [];
    for (const arg of interfaceItem.args) {
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
    for (const slotItem of interfaceItem.slots) {
      slots.push({
        direction: slotItem.direction,
        name: slotItem.name,
        isRequired: slotItem.isRequired,
        isSet: slotItem.isSet
      });
    }
    // TODO: move interface to recipe/ and add interface builder?
    const ifaceInfo = new InterfaceInfo(interfaceItem.name, handles, slots);
    manifest._interfaces.push(ifaceInfo);
  }

  // TODO(cypher): Remove loader dependency.
  private static _processRecipe(manifest: Manifest, recipeItem: AstNode.RecipeNode, loader) {
    const recipe = manifest._newRecipe(recipeItem.name);

    if (recipeItem.annotation) {
      recipe.annotation = recipeItem.annotation;
    }
    if (recipeItem.verbs) {
      recipe.verbs = recipeItem.verbs;
    }
    this._buildRecipe(manifest, recipe, recipeItem.items);
  }

  private static _buildRecipe(manifest: Manifest, recipe: Recipe, recipeItems: AstNode.RecipeItem[]) {
    const items = {
      require: recipeItems.filter(item => item.kind === 'require') as AstNode.RecipeRequire[],
      handles: recipeItems.filter(item => item.kind === 'handle') as AstNode.RecipeHandle[],
      byHandle: new Map(),
      // requireHandles are handles constructed by the 'handle' keyword. This is intended to replace handles.
      requireHandles: recipeItems.filter(item => item.kind === 'requireHandle') as AstNode.RequireHandleSection[],
      byRequireHandle: new Map(),
      particles: recipeItems.filter(item => item.kind === 'particle') as AstNode.RecipeParticle[],
      byParticle: new Map(),
      slots: recipeItems.filter(item => item.kind === 'slot') as AstNode.RecipeSlot[],
      bySlot: new Map(),
      byName: new Map(),
      connections: recipeItems.filter(item => item.kind === 'connection') as AstNode.RecipeConnection[],
      search: recipeItems.find(item => item.kind === 'search') as AstNode.RecipeSearch,
      description: recipeItems.find(item => item.kind === 'description') as AstNode.Description
    };

    // A recipe should either source handles by the 'handle' keyword (requireHandle item) or use fates (handle item).
    // A recipe should not use both methods.
    assert(!(items.handles.length > 0 && items.requireHandles.length > 0), `Inconsistent handle definitions`);
    const itemHandles = (items.handles.length > 0 ? items.handles : items.requireHandles) as (AstNode.RecipeHandle | AstNode.RequireHandleSection)[];
    for (const item of itemHandles) {
      const handle = recipe.newHandle();
      const ref = item.ref;
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
        assert(!items.byName.has(item.name), `duplicate handle name: ${item.name}`);
        handle.localName = item.name;
        items.byName.set(item.name, {item, handle});
      }
      handle.fate = item.fate ? item.fate : null;
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
          if (info.param !== null && !particle.handleConnectionMap.has(info.param)) {
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
          throw new ManifestError(connection.location, `endpoint ${info.targetType} not supported`);
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
      // TODO(mmandlis): newSlot requires a name. What should the name be here?
      const slot = recipe.newSlot(undefined);
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
      particle.verbs = item.ref.verbs;

      if (!(recipe instanceof RequireSection)) {
        if (item.ref.name) {
          const spec = manifest.findParticleByName(item.ref.name);
          if (!spec) {
            throw new ManifestError(item.location, `could not find particle ${item.ref.name}`);
          }
          particle.spec = spec.clone();
        }
      }
      if (item.name) {
        // TODO: errors.
        assert(!items.byName.has(item.name));
        particle.localName = item.name;
        items.byName.set(item.name, {item, particle});
      }
      items.byParticle.set(particle, item);

      for (const slotConnectionItem of item.slotConnections) {
        if (slotConnectionItem.direction === 'provide') {
          throw new ManifestError(item.location, `invalid slot connection: provide slot must be dependent`);
        }
        let slotConn = particle.consumedSlotConnections[slotConnectionItem.param];
        if (!slotConn) {
          // particles that reference verbs should store slot connection information as constraints to be used
          // during verb matching. However, if there's a spec then the slots need to be validated against it
          // instead.
          if (particle.spec !== undefined) {
            // Validate consumed and provided slots names are according to spec.
            if (!particle.spec.slotConnections.has(slotConnectionItem.param)) {
              throw new ManifestError(
                  slotConnectionItem.location,
                  `Consumed slot '${slotConnectionItem.param}' is not defined by '${particle.name}'`);
            }
            slotConnectionItem.dependentSlotConnections.forEach(ps => {
              if (!particle.getSlotSpecByName(ps.param)) {
                throw new ManifestError(
                    ps.location,
                    `Provided slot '${ps.param}' is not defined by '${particle.name}'`);
              }
            });
          }
          slotConn = particle.addSlotConnection(slotConnectionItem.param);
        }
        slotConn.tags = slotConnectionItem.tags || [];
        slotConnectionItem.dependentSlotConnections.forEach(ps => {
          if (ps.direction === 'consume') {
            throw new ManifestError(item.location, `invalid slot connection: consume slot must not be dependent`);
          }
          if (ps.dependentSlotConnections.length !== 0) {
            throw new ManifestError(item.location, `invalid slot connection: provide slot must not have dependencies`);
          }
          if (recipe instanceof RequireSection) {
            // replace provided slot if it already exist in recipe.
            const existingSlot = recipe.parent.slots.find(rslot => rslot.localName === ps.name);
            if (existingSlot !== undefined) {
              slotConn.providedSlots[ps.param] = existingSlot;
              existingSlot.sourceConnection = slotConn;
              existingSlot.name = ps.param;
            }
          }
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
                providedSlot.id = theSlot.id;
                providedSlot.tags = theSlot.tags;
                items.byName.set(ps.name, providedSlot);
                recipe.removeSlot(theSlot);
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
          providedSlot.localName = ps.name;
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
            // TODO: item does not exist on handle.
            handle['item'] = {kind: 'handle'};
            entry = {item: handle['item'], handle};
            items.byName.set(handle.localName, entry);
            items.byHandle.set(handle, handle['item']);
          } else if (!entry.item) {
            throw new ManifestError(connectionItem.location, `did not expect '${entry}' expected handle or particle`);
          }

          if (entry.item.kind === 'handle' || entry.item.kind === 'requireHandle') {
            targetHandle = entry.handle;
          } else if (entry.item.kind === 'particle') {
            targetParticle = entry.particle;
          } else {
            throw new ManifestError(connectionItem.location, `did not expect ${entry.item.kind}`);
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

          targetHandle = RecipeUtil.constructImmediateValueHandle(
            connection, hostedParticle, manifest.generateID());

          if (!targetHandle) {
            throw new ManifestError(
                connectionItem.target.location,
                `Hosted particle '${hostedParticle.name}' does not match interface '${connection.name}'`);
          }
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
        let targetSlot = items.byName.get(slotConnectionItem.name);
        if (targetSlot) {
          assert(items.bySlot.has(targetSlot));
          if (!targetSlot.name) {
            targetSlot.name = slotConnectionItem.param;
          }
          assert(targetSlot === items.byName.get(slotConnectionItem.name),
                 `Target slot ${targetSlot.name} doesn't match slot connection ${slotConnectionItem.param}`);
        } else if (slotConnectionItem.name) {
          // if this is a require section, check if slot exists in recipe.
          if (recipe instanceof RequireSection) {
            targetSlot = recipe.parent.slots.find(slot => slot.localName === slotConnectionItem.name);
            if (targetSlot !== undefined) {
              items.bySlot.set(targetSlot, slotConnectionItem);
              if (slotConnectionItem.name) {
                items.byName.set(slotConnectionItem.name, targetSlot);
              }
            }
          }
          if (targetSlot == undefined) {
            targetSlot = recipe.newSlot(slotConnectionItem.param);
            targetSlot.localName = slotConnectionItem.name;
            items.byName.set(slotConnectionItem.name, targetSlot);
            items.bySlot.set(targetSlot, slotConnectionItem);
          }
        }
        if (targetSlot) {
          particle.consumedSlotConnections[slotConnectionItem.param].connectToSlot(targetSlot);
        }
      }
    }

    if (items.description && items.description.description) {
      recipe.description = items.description.description;
    }

    if (items.require) {
      for (const item of items.require) {
        const requireSection = recipe.newRequireSection();
        this._buildRecipe(manifest, requireSection, item.items);
      }
    }
  }
  resolveTypeName(name: string): {schema?: Schema, iface?: InterfaceInfo}|null {
    const schema = this.findSchemaByName(name);
    if (schema) {
      return {schema};
    }
    const iface = this.findInterfaceByName(name);
    if (iface) {
      return {iface};
    }
    return null;
  }

  private static async _processStore(manifest: Manifest, item, loader) {
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

    let json: string;
    let source;
    if (item.origin === 'file') {
      item.source = loader.join(manifest.fileName, item.source);
      // TODO: json5?
      json = await loader.loadResource(item.source);
    } else if (item.origin === 'resource') {
      source = item.source;
      json = manifest.resources[source];
      if (json == undefined) {
        throw new ManifestError(item.location, `Resource '${source}' referenced by store '${id}' is not defined in this manifest`);
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
    if (type instanceof CollectionType) {
      unitType = type.collectionType;
    } else if (type instanceof BigCollectionType) {
      unitType = type.bigCollectionType;
    } else {
      if (entities.length === 0) {
        await Manifest._createStore(manifest, type, name, id, tags, item, originalId);
        return;
      }
      entities = entities.slice(entities.length - 1);
      unitType = type;
    }

    if (unitType instanceof EntityType) {
      let hasSerializedId = false;
      entities = entities.map(entity => {
        if (entity == null) {
          // FIXME: perhaps this happens when we have an empty singleton?
          // we should just generate an empty list in that case.
          return null;
        }
        hasSerializedId = hasSerializedId || entity.$id;
        const id = entity.$id || manifest.generateID().toString();
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
    if (type instanceof CollectionType) {
      model = entities.map(value => ({id: value.id, value, keys: new Set([value.id])}));
    } else if (type instanceof BigCollectionType) {
      model = entities.map(value => {
        const index = value.rawData.$index;
        delete value.rawData.$index;
        return {id: value.id, index, value, keys: new Set([value.id])};
      });
    } else {
      model = entities.map(value => ({id: value.id, value}));
    }
    await store.fromLiteral({version, model});
  }

  private static async _createStore(manifest, type: Type, name: string, id: string, tags: string[], item, originalId: string) {
    const store = await manifest.createStore(type, name, id, tags);
    store.source = item.source;
    store.description = item.description;
    store.originalId = originalId;
    return store;
  }

  private _newRecipe(name: string): Recipe {
    const recipe = new Recipe(name);
    this._recipes.push(recipe);
    return recipe;
  }

  toString(options?: {recursive?: boolean, showUnresolved?: boolean, hideFields?: boolean}): string {
    // TODO: sort?
    options = options || {};
    const results: string[] = [];

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

  get idGeneratorForTesting(): IdGenerator {
    return this._idGenerator;
  }
}
