/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {parse} from '../gen/runtime/manifest-parser.js';
import {assert} from '../platform/assert-web.js';
import {digest} from '../platform/digest-web.js';

import {Id, IdGenerator} from './id.js';
import {HandleConnection as InterfaceInfoHandleConnection, MuxType} from './type.js';
import {Slot as InterfaceInfoSlot} from './type.js';
import {Runnable} from './hot.js';
import {Loader} from '../platform/loader.js';
import {ManifestMeta} from './manifest-meta.js';
import * as AstNode from './manifest-ast-nodes.js';
import {ParticleSpec} from './particle-spec.js';
import {compareComparables} from './recipe/comparable.js';
import {HandleEndPoint, ParticleEndPoint, TagEndPoint} from './recipe/connection-constraint.js';
import {Handle} from './recipe/handle.js';
import {Particle} from './recipe/particle.js';
import {Slot} from './recipe/slot.js';
import {HandleConnection} from './recipe/handle-connection.js';
import {RecipeUtil} from './recipe/recipe-util.js';
import {connectionMatchesHandleDirection} from './recipe/direction-util.js';
import {Recipe, RequireSection} from './recipe/recipe.js';
import {Search} from './recipe/search.js';
import {TypeChecker} from './recipe/type-checker.js';
import {Schema} from './schema.js';
import {BigCollectionType, CollectionType, EntityType, InterfaceInfo, InterfaceType,
        ReferenceType, SlotType, Type, TypeVariable, SingletonType, TupleType} from './type.js';
import {Dictionary} from './hot.js';
import {ClaimIsTag} from './particle-claim.js';
import {AbstractStore, StoreClaims} from './storageNG/abstract-store.js';
import {Store} from './storageNG/store.js';
import {StorageKey} from './storageNG/storage-key.js';
import {Exists} from './storageNG/drivers/driver.js';
import {StorageKeyParser} from './storageNG/storage-key-parser.js';
import {VolatileMemoryProvider, VolatileStorageKey} from './storageNG/drivers/volatile.js';
import {RamDiskStorageKey} from './storageNG/drivers/ramdisk.js';
import {Refinement} from './refiner.js';
import {ReferenceModeStorageKey} from './storageNG/reference-mode-storage-key.js';
import {LoaderBase} from '../platform/loader-base.js';
import {Annotation, AnnotationRef} from './recipe/annotation.js';
import {SchemaPrimitiveTypeValue} from './manifest-ast-nodes.js';
import {canonicalManifest} from './canonical-manifest.js';
import {Policy} from './policy/policy.js';
import {resolveFieldPathType} from './field-path.js';

export enum ErrorSeverity {
  Error = 'error',
  Warning = 'warning'
}

export class ManifestError extends Error {
  location: AstNode.SourceLocation;
  key: string;
  severity = ErrorSeverity.Error;
  constructor(location: AstNode.SourceLocation, message: string) {
    super(message);
    this.location = location;
  }
}

export class ManifestWarning extends ManifestError {
  constructor(location: AstNode.SourceLocation, message: string) {
    super(location, message);
    this.severity = ErrorSeverity.Warning;
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
    if (ast instanceof Map) {
      for (const value of ast.values()) {
        this.traverse(value);
      }
      return;
    }
    assert(ast.location, 'expected manifest node to have `location`');
    assert(ast.kind, 'expected manifest node to have `kind`');
    if (ast.kind === 'entity-inline') {
      // This node holds an inline entity and will be handled by _processStore().
      return;
    }
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

export interface ManifestParseOptions {
  fileName?: string;
  loader?: LoaderBase;
  registry?: Dictionary<Promise<Manifest>>;
  memoryProvider?: VolatileMemoryProvider;
  context?: Manifest;
  throwImportErrors?: boolean;
}

interface ManifestLoadOptions {
  registry?: Dictionary<Promise<Manifest>>;
  memoryProvider?: VolatileMemoryProvider;
}

export class Manifest {
  private _recipes: Recipe[] = [];
  private _imports: Manifest[] = [];
  private _canonicalImports: Manifest[] = [];
  // TODO: These should be lists, possibly with a separate flattened map.
  private _particles: Dictionary<ParticleSpec> = {};
  private _schemas: Dictionary<Schema> = {};
  private _stores: AbstractStore[] = [];
  private _interfaces = <InterfaceInfo[]>[];
  private _policies: Policy[] = [];
  storeTags: Map<AbstractStore, string[]> = new Map();
  private _fileName: string|null = null;
  private readonly _id: Id;
  // TODO(csilvestrini): Inject an IdGenerator instance instead of creating a new one.
  readonly idGenerator: IdGenerator = IdGenerator.newSession();
  private _meta = new ManifestMeta();
  private _resources: Dictionary<string> = {};
  private storeManifestUrls: Map<string, string> = new Map();
  readonly errors: ManifestError[] = [];
  private _annotations: Dictionary<Annotation> = {};
  // readonly warnings: ManifestError[] = [];

  constructor({id}: {id: Id | string}) {
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

  get recipes() {
    return this._recipes;
  }
  get allRecipes() {
    return [...new Set(this._findAll(manifest => manifest._recipes))];
  }
  get allHandles() {
    // TODO(#4820) Update `reduce` to use flatMap
    return this.allRecipes.reduce((acc, x) => acc.concat(x.handles), []);
  }
  get activeRecipe() {
    return this._recipes.find(recipe => recipe.getAnnotation('active'));
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
  get canonicalImports(): Manifest[] {
    return this._canonicalImports;
  }
  get schemas(): Dictionary<Schema> {
    return this._schemas;
  }

  get allSchemas() {
    return [...new Set(this._findAll(manifest => Object.values(manifest._schemas)))];
  }

  get fileName() {
    return this._fileName;
  }
  get stores(): AbstractStore[] {
    return this._stores;
  }
  get allStores() {
    return [...this._findAll(manifest => manifest._stores)];
  }
  get interfaces() {
    return this._interfaces;
  }
  get policies() {
    return this._policies;
  }
  get allPolicies() {
    return [...new Set(this._findAll(manifest => manifest._policies))];
  }
  get meta() {
    return this._meta;
  }
  get resources() {
    return this._resources;
  }
  get allResources(): {name: string, resource: string}[] {
    return [...new Set(this._findAll(manifest => Object.entries(manifest.resources).map(([name, resource]) => ({name, resource}))))];
  }
  get annotations() {
    return this._annotations;
  }
  get allAnnotations() {
    return [...new Set(this._findAll(manifest => Object.values(manifest.annotations)))];
  }
  findAnnotationByName(name: string) : Annotation|null {
    return this.allAnnotations.find(a => a.name === name);
  }


  applyMeta(section: {name: string} & {key: string, value: string}[]) {
    this._meta.apply(section);
  }
  // TODO: newParticle, Schema, etc.
  // TODO: simplify() / isValid().

  _addStore(store: AbstractStore, tags: string[]) {
    this._stores.push(store);
    this.storeTags.set(store, tags ? tags : []);
    return store;
  }

  newStore(opts: {
      type: Type,
      name: string,
      id: string,
      storageKey: string | StorageKey,
      tags: string[],
      claims?: StoreClaims,
      originalId?: string,
      description?: string,
      version?: string,
      source?: string,
      origin?: 'file' | 'resource' | 'storage' | 'inline',
      referenceMode?: boolean,
      model?: {}[],
      annotations?: AnnotationRef[]
  }) {
    if (opts.source) {
      this.storeManifestUrls.set(opts.id, this.fileName);
    }

    let storageKey = opts.storageKey;
    if (typeof storageKey === 'string') {
      storageKey = StorageKeyParser.parse(storageKey);
    }
    const store = new Store(opts.type, {...opts, storageKey, exists: Exists.MayExist});
    return this._addStore(store, opts.tags);
  }

  _find<a>(manifestFinder: ManifestFinder<a>): a {
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
  * _findAll<a>(manifestFinder: ManifestFinderGenerator<a>): IterableIterator<a> {
    yield* manifestFinder(this);
    for (const importedManifest of [...this._imports, ...this._canonicalImports]) {
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
  findStoreTags(store: AbstractStore) : Set<string> {
    return new Set(this._find(manifest => manifest.storeTags.get(store)));
  }
  findManifestUrlForHandleId(id: string) {
    return this._find(manifest => manifest.storeManifestUrls.get(id));
  }
  findStoresByType(type: Type, options = {tags: <string[]>[], subtype: false}): AbstractStore[] {
    const tags = options.tags || [];
    const subtype = options.subtype || false;
    function tagPredicate(manifest: Manifest, store: AbstractStore) {
      return tags.filter(tag => !manifest.storeTags.get(store).includes(tag)).length === 0;
    }
    const stores = [...this._findAll(manifest =>
      manifest._stores.filter(store => this.typesMatch(store, type, subtype) && tagPredicate(manifest, store)))];

    // Quick check that a new handle can fulfill the type contract.
    // Rewrite of this method tracked by https://github.com/PolymerLabs/arcs/issues/1636.
    return stores.filter(s => !!Handle.effectiveType(
      type, [{type: s.type, direction: (s.type instanceof InterfaceType) ? 'hosts' : 'reads writes'}]));
  }
  findHandlesByType(type: Type, options = {tags: <string[]>[], fates: <string[]>[], subtype: false}): Handle[] {
    const tags = options.tags || [];
    const subtype = options.subtype || false;
    const fates = options.fates || [];
    function hasAllTags(handle: Handle) {
      return tags.every(tag => handle.tags.includes(tag));
    }
    function matchesFate(handle: Handle) {
      return fates === [] || fates.includes(handle.fate);
    }
    // TODO(#4820) Update `reduce` to use flatMap
    return [...this.allRecipes
      .reduce((acc, r) => acc.concat(r.handles), [])
      .filter(h => this.typesMatch(h, type, subtype) && hasAllTags(h) && matchesFate(h))];
  }
  findHandlesById(id: string): Handle[] {
    return this.allHandles.filter(h => h.id === id);
  }
  findInterfaceByName(name: string) {
    return this._find(manifest => manifest._interfaces.find(iface => iface.name === name));
  }
  findPolicyByName(name: string) {
    return this._find(manifest => manifest._policies.find(policy => policy.name === name));
  }
  findRecipesByVerb(verb: string) {
    return [...this._findAll(manifest => manifest._recipes.filter(recipe => recipe.verbs.includes(verb)))];
  }
  private typesMatch(candidate: {type: Type}, type: Type, checkSubtype: boolean) {
    const resolvedType = type.resolvedType();
    if (!resolvedType.isResolved()) {
      return (type instanceof CollectionType) === (candidate.type instanceof CollectionType) &&
        (type instanceof BigCollectionType) === (candidate.type instanceof BigCollectionType);
    }

    if (checkSubtype) {
      const [left, right] = Type.unwrapPair(candidate.type, resolvedType);
      if (left instanceof EntityType && right instanceof EntityType) {
        return left.entitySchema.isAtLeastAsSpecificAs(right.entitySchema);
      }
      return false;
    }

    return TypeChecker.compareTypes({type: candidate.type}, {type});
  }

  generateID(subcomponent?: string): Id {
    return this.idGenerator.newChildId(this.id, subcomponent);
  }

  static async load(fileName: string, loader: LoaderBase, options: ManifestLoadOptions = {}): Promise<Manifest> {
    let {registry, memoryProvider} = options;
    registry = registry || {};
    if (registry && registry[fileName]) {
      return await registry[fileName];
    }
    registry[fileName] = (async () => {
      const content: string = await loader.loadResource(fileName);
      // TODO: When does this happen? The loader should probably throw an exception here.
      assert(content !== undefined, `${fileName} unable to be loaded by Manifest parser`);
      return await Manifest.parse(content, {
        fileName,
        loader,
        registry,
        memoryProvider
      });
    })();
    return await registry[fileName];
  }

  static getErrors(manifest: Manifest): ManifestError[] {
    return manifest.errors;
  }

  static async parse(content: string, options: ManifestParseOptions = {}): Promise<Manifest> {
    // allow `context` for including an existing manifest in the import list
    let {fileName, loader, registry, context, memoryProvider} = options;
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
    function processError(e: ManifestError | any, parseError?: boolean): ManifestError {
      if (!((e instanceof ManifestError) || e.location)) {
        return e;
      }
      return processManifestError(e, parseError);
    }

    function processManifestError(e: ManifestError, parseError?: boolean): ManifestError {
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
        // Peg Parsing Errors don't have severity attached.
        const severity = e.severity || ErrorSeverity.Error;
        if (parseError) {
          preamble = `Parse ${severity} in`;
        } else {
          preamble = `Post-parse processing ${severity} caused by`;
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
    } // end processManifestError

    let items: AstNode.All[] = [];
    try {
      items = parse(content, {filename: fileName}) as AstNode.All[];
    } catch (e) {
      throw processError(e, true);
    }
    const manifest = new Manifest({id});
    manifest._fileName = fileName;

    // include (optional) pre-existing context
    if (context) {
      manifest._imports.push(context);
    }

    try {
      if (content !== canonicalManifest) {
        try {
          manifest._canonicalImports.push(await Manifest.parse(canonicalManifest, options));
        } catch (e) {
          manifest.errors.push(e);
        }
      }

      // Loading of imported manifests is triggered in parallel to avoid a serial loading
      // of resources over the network.
      await Promise.all(items.map(async (item: AstNode.All) => {
        if (item.kind === 'import') {
          if (!loader) {
            throw new Error('loader required to parse import statements');
          }
          // item is an AstNode.Import
          const path = loader.path(manifest.fileName);
          const target = loader.join(path, item.path);
          try {
            manifest._imports.push(await Manifest.load(target, loader, {registry, memoryProvider}));
          } catch (e) {
            manifest.errors.push(e);
            manifest.errors.push(new ManifestError(item.location, `Error importing '${target}'`));
          }
        }
      }));

      // The items to process may refer to items defined later on. We should do a pass over all
      // definitions first, and then resolve all the references to external definitions, but that
      // would require serious refactoring. As a short term fix we're doing multiple passes over
      // the list as long as we see progress.
      // TODO(b/156427820): Improve this with 2 pass schema resolution and support cycles.
      const processItems = async (kind: string, f: Function) => {
        let firstError: boolean;
        let itemsToProcess = [...items.filter(i => i.kind === kind)];
        let thisRound = [];

        do {
          thisRound = itemsToProcess;
          itemsToProcess = [];
          firstError = null;
          for (const item of thisRound) {
            try {
              Manifest._augmentAstWithTypes(manifest, item);
              await f(item);
            } catch (err) {
              if (!firstError) firstError = err;
              itemsToProcess.push(item);
              continue;
            }
          }
          // As long as we're making progress we're trying again.
        } while (itemsToProcess.length < thisRound.length);

        // If we didn't make any progress and still have items to process,
        // rethrow the first error we saw in this round.
        if (itemsToProcess.length > 0) throw firstError;
      };
      // processing meta sections should come first as this contains identifying
      // information that might need to be used in other sections. For example,
      // the meta.name, if present, becomes the manifest id which is relevant
      // when constructing manifest stores.
      await processItems('meta', meta => manifest.applyMeta(meta.items));
      // similarly, resources may be referenced from other parts of the manifest.
      await processItems('resource', item => Manifest._processResource(manifest, item));
      await processItems('annotation-node', item => Manifest._processAnnotation(manifest, item));
      await processItems('schema', item => Manifest._processSchema(manifest, item));
      await processItems('interface', item => Manifest._processInterface(manifest, item));
      await processItems('particle', item => Manifest._processParticle(manifest, item, loader));
      await processItems('store', item => Manifest._processStore(manifest, item, loader, memoryProvider));
      await processItems('recipe', item => Manifest._processRecipe(manifest, item));
      await processItems('policy', item => Manifest._processPolicy(manifest, item));
    } catch (e) {
      dumpErrors(manifest);
      throw processError(e, false);
    }
    dumpErrors(manifest);
    if (options.throwImportErrors) {
      const error = manifest.errors.find(e => e.severity === ErrorSeverity.Error);
      if (error) {
        throw error;
      }
    }
    return manifest;
  }

  private static _augmentAstWithTypes(manifest: Manifest, items: AstNode.All): void {
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
            // tslint:disable-next-line: no-any
            const fields: Dictionary<any> = {};
            const typeData = {};
            for (let {name, type} of node.fields) {
              if (type && type.refinement) {
                type.refinement = Refinement.fromAst(type.refinement, {[name]: type.type});
              }
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
              typeData[name] = type.type;
            }
            const refinement = node.refinement && Refinement.fromAst(node.refinement, typeData);
            let schema = new Schema(names, fields, {refinement});
            for (const alias of aliases) {
              schema = Schema.union(alias, schema);
              if (!schema) {
                throw new ManifestError(node.location, `Could not merge schema aliases`);
              }
            }
            node.model = new EntityType(schema);
            delete node.fields;
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
          case 'mux-type':
            node.model = new MuxType(node.type.model);
            return;
          case 'singleton-type':
            node.model = new SingletonType(node.type.model);
            return;
          case 'tuple-type':
            if (node.types.some(t => t.kind !== 'reference-type')) {
              throw new ManifestError(node.location, 'Only tuples of references are supported.');
            }
            node.model = new TupleType(node.types.map(t => t.model));
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
          if (fields[field.name].refinement) {
            fields[field.name].refinement = Refinement.fromAst(fields[field.name].refinement, {[field.name]: field.type.type});
          }
          if (fields[field.name].annotations) {
            fields[field.name].annotations = Manifest._buildAnnotationRefs(manifest, fields[field.name].annotations);
          }
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
    names = [...new Set(names)];
    const name = schemaItem.alias || names[0];
    if (!name) {
      throw new ManifestError(
        schemaItem.location,
        `Schema defined without name or alias`);
    }
    const annotations: AnnotationRef[] = Manifest._buildAnnotationRefs(manifest, schemaItem.annotationRefs);
    const schema = new Schema(names, fields, {description, annotations});
    if (schemaItem.alias) {
      schema.isAlias = true;
    }
    manifest._schemas[name] = schema;
  }

  private static _processResource(manifest: Manifest, schemaItem: AstNode.Resource) {
    manifest._resources[schemaItem.name] = schemaItem.data;
  }

  private static _processAnnotation(manifest: Manifest, annotationItem: AstNode.AnnotationNode) {
    const params: Dictionary<SchemaPrimitiveTypeValue> = {};
    for (const param of annotationItem.params) {
      params[param.name] = param.type;
    }
    manifest._annotations[annotationItem.name] = new Annotation(
      annotationItem.name, params, annotationItem.targets, annotationItem.retention,
      annotationItem.allowMultiple, annotationItem.doc);
  }

  private static _processParticle(manifest: Manifest, particleItem, loader?: LoaderBase) {
    // TODO: we should be producing a new particleSpec, not mutating
    //       particleItem directly.
    // TODO: we should require both of these and update failing tests...
    assert(particleItem.implFile == null || particleItem.args !== null, 'no valid body defined for this particle');
    if (!particleItem.args) {
      particleItem.args = [];
    }

    if (particleItem.hasParticleArgument) {
      const warning = new ManifestWarning(particleItem.location, `Particle uses deprecated argument body`);
      warning.key = 'hasParticleArgument';
      manifest.errors.push(warning);
    }

    // TODO: loader should not be optional.
    if (particleItem.implFile && loader) {
      if (!loader.isJvmClasspath(particleItem.implFile)) {
        particleItem.implFile = loader.join(manifest.fileName, particleItem.implFile);
      }
    }

    const processArgTypes = args => {
      for (const arg of args) {
        if (arg.type && arg.type.kind === 'type-name'
            // For now let's focus on entities, we should do interfaces next.
            && arg.type.model && arg.type.model.tag === 'Entity') {
          const warning = new ManifestWarning(arg.location, `Particle uses deprecated external schema`);
          warning.key = 'externalSchemas';
          manifest.errors.push(warning);
        }
        arg.type = arg.type.model;
        if (arg.type.getEntitySchema()) {
          const fields = arg.type.getEntitySchema().fields;
          for (const name of Object.keys(fields)) {
            fields[name].annotations = Manifest._buildAnnotationRefs(manifest, fields[name].annotations);
          }
        }
        processArgTypes(arg.dependentConnections);
        arg.annotations = Manifest._buildAnnotationRefs(manifest, arg.annotations);
      }
    };
    processArgTypes(particleItem.args);
    particleItem.annotations = Manifest._buildAnnotationRefs(manifest, particleItem.annotationRefs);
    manifest._particles[particleItem.name] = new ParticleSpec(particleItem);
  }

  // TODO: Move this to a generic pass over the AST and merge with resolveTypeName.
  private static _processInterface(manifest: Manifest, interfaceItem) {
    const handles: InterfaceInfoHandleConnection[] = [];
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
    const slots: InterfaceInfoSlot[] = [];
    for (const slotItem of interfaceItem.slots) {
      slots.push({
        direction: slotItem.direction,
        name: slotItem.name,
        isRequired: slotItem.isRequired,
        isSet: slotItem.isSet
      });
    }
    // TODO: move interface to recipe/ and add interface builder?
    const ifaceInfo = InterfaceInfo.make(interfaceItem.name, handles, slots);
    manifest._interfaces.push(ifaceInfo);
  }

  private static _processPolicy(manifest: Manifest, policyItem: AstNode.Policy) {
    const buildAnnotationRefs = (refs: AstNode.AnnotationRef[]) => Manifest._buildAnnotationRefs(manifest, refs);
    const policy = Policy.fromAstNode(policyItem, buildAnnotationRefs);
    if (manifest._policies.some(p => p.name === policy.name)) {
      throw new ManifestError(policyItem.location, `A policy named ${policy.name} already exists.`);
    }
    manifest._policies.push(policy);
  }

  private static _processRecipe(manifest: Manifest, recipeItem: AstNode.RecipeNode) {
    const recipe = manifest._newRecipe(recipeItem.name);

    recipe.annotations = Manifest._buildAnnotationRefs(manifest, recipeItem.annotationRefs);

    if (recipeItem.verbs) {
      recipe.verbs = recipeItem.verbs;
    }
    Manifest._buildRecipe(manifest, recipe, recipeItem.items);
  }

  private static _buildRecipe(manifest: Manifest, recipe: Recipe, recipeItems: AstNode.RecipeItem[]) {
    const items = {
      require: recipeItems.filter(item => item.kind === 'require') as AstNode.RecipeRequire[],
      handles: recipeItems.filter(item => item.kind === 'handle') as AstNode.RecipeHandle[],
      syntheticHandles: recipeItems.filter(item => item.kind === 'synthetic-handle') as AstNode.RecipeSyntheticHandle[],
      byHandle: new Map<Handle, AstNode.RecipeHandle | AstNode.RecipeSyntheticHandle | AstNode.RequireHandleSection>(),
      // requireHandles are handles constructed by the 'handle' keyword. This is intended to replace handles.
      requireHandles: recipeItems.filter(item => item.kind === 'require-handle') as AstNode.RequireHandleSection[],
      particles: recipeItems.filter(item => item.kind === 'recipe-particle') as AstNode.RecipeParticle[],
      byParticle: new Map<Particle, AstNode.RecipeParticle>(),
      slots: recipeItems.filter(item => item.kind === 'slot') as AstNode.RecipeSlot[],
      bySlot: new Map<Slot, AstNode.RecipeSlot | AstNode.RecipeParticleSlotConnection>(),
      // tslint:disable-next-line: no-any
      byName: new Map<string, any>(),
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
      handle.fate = item.kind === 'handle' && item.fate ? item.fate : null;
      if (item.kind === 'handle') {
        if (item.annotations) {
          handle.annotations = Manifest._buildAnnotationRefs(manifest, item.annotations);
        }
      }
      items.byHandle.set(handle, item);
    }

    for (const item of items.syntheticHandles) {
      const handle = recipe.newHandle();
      handle.fate = 'join';

      if (item.name) {
        assert(!items.byName.has(item.name), `duplicate handle name: ${item.name}`);
        handle.localName = item.name;
        items.byName.set(item.name, {item, handle});
      }

      for (const association of item.associations) {
        const associatedItem = items.byName.get(association);
        assert(associatedItem, `unrecognized name: ${association}`);
        const associatedHandle = associatedItem && associatedItem.handle;
        assert(associatedHandle, `only handles allowed to be joined: "${association}" is not a handle`);
        handle.joinDataFromHandle(associatedHandle);
      }

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
      recipe.newConnectionConstraint(from, to, connection.direction, connection.relaxed);
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
        if (slotConnectionItem.direction === 'provides') {
          throw new ManifestError(item.location, `invalid slot connection: provide slot must be dependent`);
        }
        let slotConn = particle.getSlotConnectionByName(slotConnectionItem.param);
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
        slotConn.tags = slotConnectionItem.target.tags;
        slotConnectionItem.dependentSlotConnections.forEach(ps => {
          if (ps.direction === 'consumes') {
            throw new ManifestError(item.location, `invalid slot connection: consume slot must not be dependent`);
          }
          if (ps.dependentSlotConnections.length !== 0) {
            throw new ManifestError(item.location, `invalid slot connection: provide slot must not have dependencies`);
          }
          if (recipe instanceof RequireSection) {
            // replace provided slot if it already exist in recipe.
            const existingSlot = recipe.parent.slots.find(rslot => rslot.localName === ps.target.name);
            if (existingSlot !== undefined) {
              slotConn.providedSlots[ps.param] = existingSlot;
              existingSlot.sourceConnection = slotConn;
              existingSlot.name = ps.param;
            }
          }
          let providedSlot = slotConn.providedSlots[ps.param];
          if (providedSlot) {
            if (ps.target.name) {
              if (items.byName.has(ps.target.name)) {
                // The slot was added to the recipe twice - once as part of the
                // slots in the manifest, then as part of particle spec.
                // Unifying both slots, updating name and source slot connection.
                const theSlot = items.byName.get(ps.target.name);
                assert(theSlot !== providedSlot);
                assert(!theSlot.name && providedSlot);
                assert(!theSlot.sourceConnection && providedSlot.sourceConnection);
                providedSlot.id = theSlot.id;
                providedSlot.tags = theSlot.tags;
                items.byName.set(ps.target.name, providedSlot);
                recipe.removeSlot(theSlot);
              } else {
                items.byName.set(ps.target.name, providedSlot);
              }
            }
            items.bySlot.set(providedSlot, ps);
          } else {
            providedSlot = items.byName.get(ps.target.name);
          }
          if (!providedSlot) {
            providedSlot = recipe.newSlot(ps.param);
            providedSlot.localName = ps.target.name;
            providedSlot.sourceConnection = slotConn;
            if (ps.target.name) {
              assert(!items.byName.has(ps.target.name));
              items.byName.set(ps.target.name, providedSlot);
            }
            items.bySlot.set(providedSlot, ps);
          }
          if (!slotConn.providedSlots[ps.param]) {
            slotConn.providedSlots[ps.param] = providedSlot;
          }
          providedSlot.localName = ps.target.name;
        });
      }
    }

    const newConnection = (particle: Particle, connectionItem: AstNode.RecipeParticleConnection) => {
        let connection: HandleConnection;
        // Find or create the connection.
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
        const direction = connectionItem.direction;
        if (!connectionMatchesHandleDirection(direction, connection.direction)) {
          throw new ManifestError(
              connectionItem.location,
              `'${direction}' not compatible with '${connection.direction}' param of '${particle.name}'`);
        } else if (connection.direction === 'any') {
          if (connectionItem.param !== '*' && particle.spec !== undefined) {
            throw new ManifestError(
              connectionItem.location,
              `param '${connectionItem.param}' is not defined by '${particle.name}'`);
          }
          connection.direction = direction;
        }
        // TODO(cypher1): If particle handle connections are able to be relaxed this will need to be expanded to
        // perform relaxation matching.
        connection.relaxed = connectionItem.relaxed;

        let targetHandle: Handle;
        let targetParticle: Particle;

        if (connectionItem.target && connectionItem.target.name) {
          let entry = items.byName.get(connectionItem.target.name);
          if (!entry) {
            const handle = recipe.newHandle();
            handle.tags = [];
            handle.localName = connectionItem.target.name;
            if (connection.direction === '`consumes' || connection.direction === '`provides') {
              // TODO(jopra): This is something of a hack to catch users who have not forward-declared their slandles.
              handle.fate = '`slot';
            } else {
              handle.fate = 'create';
            }
            // TODO: item does not exist on handle.
            handle['item'] = {kind: 'handle'};
            entry = {item: handle['item'], handle};
            items.byName.set(handle.localName, entry);
            items.byHandle.set(handle, handle['item']);
          } else if (!entry.item) {
            throw new ManifestError(connectionItem.location, `did not expect '${entry}' expected handle or particle`);
          }

          if (entry.item.kind === 'handle'
              || entry.item.kind === 'synthetic-handle'
              || entry.item.kind === 'require-handle') {
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
          let targetConnection: HandleConnection;

          // TODO(lindner): replaced param with name since param is not defined, but name/particle are...
          if (connectionItem.target.name) {
            targetConnection = targetParticle.connections[connectionItem.target.name];
            if (!targetConnection) {
              targetConnection = targetParticle.addConnectionName(connectionItem.target.name);
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

        connectionItem.dependentConnections.forEach(item => newConnection(particle, item));
    };

    const newSlotConnection = (particle: Particle, slotConnectionItem: AstNode.RecipeParticleSlotConnection) => {
      let targetSlot = items.byName.get(slotConnectionItem.target.name);
      // Note: Support for 'target' (instead of name + tags) is new, and likely buggy.
      // TODO(cypher1): target.particle should not be ignored (but currently is).
      if (targetSlot) {
        assert(items.bySlot.has(targetSlot));
        if (!targetSlot.name) {
          targetSlot.name = slotConnectionItem.param;
        }
        assert(targetSlot === items.byName.get(slotConnectionItem.target.name),
          `Target slot ${targetSlot.name} doesn't match slot connection ${slotConnectionItem.param}`);
      } else if (slotConnectionItem.target.name) {
        // if this is a require section, check if slot exists in recipe.
        if (recipe instanceof RequireSection) {
          targetSlot = recipe.parent.slots.find(slot => slot.localName === slotConnectionItem.target.name);
          if (targetSlot !== undefined) {
            items.bySlot.set(targetSlot, slotConnectionItem);
            if (slotConnectionItem.target.name) {
              items.byName.set(slotConnectionItem.target.name, targetSlot);
            }
          }
        }
        if (targetSlot == undefined) {
          targetSlot = recipe.newSlot(slotConnectionItem.param);
          targetSlot.localName = slotConnectionItem.target.name;
          items.byName.set(slotConnectionItem.target.name, targetSlot);
          items.bySlot.set(targetSlot, slotConnectionItem);
        }
      }
      if (targetSlot) {
        particle.getSlotConnectionByName(slotConnectionItem.param).connectToSlot(targetSlot);
      }
    };


    for (const [particle, item] of items.byParticle) {
      for (const connectionItem of item.connections) {
        newConnection(particle, connectionItem);
      }

      for (const slotConnectionItem of item.slotConnections) {
        newSlotConnection(particle, slotConnectionItem);
      }
    }

    if (items.description && items.description.description) {
      recipe.description = items.description.description;
    }

    if (items.require) {
      for (const item of items.require) {
        const requireSection = recipe.newRequireSection();
        Manifest._buildRecipe(manifest, requireSection, item.items);
      }
    }
  }

  resolveTypeName(name: string): {schema?: Schema, iface?: InterfaceInfo} | null {
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

  /**
   * Creates a new storage key for data local to the manifest itself (e.g.
   * from embedded JSON data, or an external JSON file).
   */
  private createLocalDataStorageKey(): RamDiskStorageKey {
    return new RamDiskStorageKey(this.generateID('local-data').toString());
  }

  private static _buildAnnotationRefs(manifest: Manifest, annotationRefItems: AstNode.AnnotationRef[]): AnnotationRef[] {
    const annotationRefs: AnnotationRef[] = [];
    for (const aRefItem of annotationRefItems) {
      const annotation = manifest.findAnnotationByName(aRefItem.name);
      if (!annotation) {
        throw new ManifestError(
            aRefItem.location, `annotation not found: '${aRefItem.name}'`);
      }
      if (!annotation.allowMultiple) {
        if (annotationRefs.some(a => a.name === aRefItem.name)) {
          throw new ManifestError(
              aRefItem.location, `annotation '${aRefItem.name}' already exists.`);
        }
      }
      const params: Dictionary<string|number|boolean|{}> = {};
      for (const param of aRefItem.params) {
        if (param.kind === 'annotation-named-param') {
          if (params[param.name]) {
            throw new ManifestError(
                aRefItem.location, `annotation '${annotation.name}' can only have one value for: '${param.name}'`);
          }
          const aParam = annotation.params[param.name];
          if (!aParam) {
            throw new ManifestError(
                aRefItem.location, `unexpected annotation param: '${param.name}'`);
          }
          params[param.name] = param.value;
        } else {
          if (Object.keys(annotation.params).length !== 1) {
            throw new ManifestError(
              aRefItem.location, `annotation '${annotation.name}' has unexpected unnamed param '${param.value}'`);
          }
          params[Object.keys(annotation.params)[0]] = param.value;
        }
      }
      annotationRefs.push(new AnnotationRef(annotation, params));
    }
    return annotationRefs;
  }

  private static async _processStore(manifest: Manifest, item: AstNode.ManifestStorage, loader?: LoaderBase, memoryProvider?: VolatileMemoryProvider) {
    const {name, originalId, description, version, origin} = item;
    let id = item.id;
    let type = item.type['model'];  // Model added in _augmentAstWithTypes.
    if (id == null) {
      id = `${manifest._id}store${manifest._stores.length}`;
    }
    let tags = item.tags;
    if (tags == null) {
      tags = [];
    }

    const claims: Map<string, ClaimIsTag[]> = new Map();
    item.claims.forEach(claim => {
      resolveFieldPathType(claim.fieldPath, type);
      const target = claim.fieldPath.join('.');
      if (claims.has(target)) {
        throw new ManifestError(claim.location, `A claim for target ${target} already exists in store ${name}`);
      }
      const tags = claim.tags.map(tag => new ClaimIsTag(/* isNot= */ false, tag));
      claims.set(target, tags);
    });

    // Instead of creating links to remote firebase during manifest parsing,
    // we generate storage stubs that contain the relevant information.
    if (item.origin === 'storage') {
      return manifest.newStore({
        type, name, id, storageKey: item.source, tags,
        originalId, claims, description, version, origin
      });
    }

    let json: string;
    let entities;
    if (item.origin === 'file') {
      if (!loader) {
        throw new ManifestError(item.location, 'No loader available for file');
      }
      item.source = loader.join(manifest.fileName, item.source);
      json = await loader.loadResource(item.source);
      entities = this.parseJson(json, item);
    } else if (item.origin === 'resource') {
      json = manifest.resources[item.source];
      if (json == undefined) {
        throw new ManifestError(item.location, `Resource '${item.source}' referenced by store '${id}' is not defined in this manifest`);
      }
      entities = this.parseJson(json, item);
    } else if (item.origin === 'inline') {
      entities = this.inlineEntitiesToSerialisedFormat(manifest, item);
    }

    const storageKey = item['storageKey'] || manifest.createLocalDataStorageKey();
    if (storageKey instanceof RamDiskStorageKey) {
      if (!memoryProvider) {
        throw new ManifestError(item.location, `Creating ram disk stores requires having a memory provider.`);
      }
      memoryProvider.getVolatileMemory().deserialize(entities, storageKey.unique);
    }
    // Note that we used to use a singleton entity ID (if present) instead of the hash. It seems
    // cleaner not to rely on that.
    if (!item.id) {
      const entityHash = await digest(json || JSON.stringify(entities));
      id = `${id}:${entityHash}`;
    }
    if (!type.isSingleton && !type.isCollectionType()) {
      type = new SingletonType(type);
    }
    return manifest.newStore({
      type, name, id, storageKey, tags, originalId, claims, description, version,
      source: item.source, origin, referenceMode: false, model: entities,
      annotations: Manifest._buildAnnotationRefs(manifest, item.annotationRefs)
    });
  }

  private static parseJson(json, item) {
    try {
      return JSON.parse(json);
    } catch (e) {
      throw new ManifestError(item.location, `Error parsing JSON from '${item.source}' (${e.message})'`);
    }
  }

  private static inlineEntitiesToSerialisedFormat(manifest: Manifest, item: AstNode.ManifestStorage) {
    const values = {};
    const version = {inline: 1};
    for (const entityAst of item.entities) {
      const rawData = {};
      for (const [name, descriptor] of Object.entries(entityAst.fields)) {
        rawData[name] = descriptor.value;
      }
      const id = manifest.generateID('inline').toString();
      values[id] = {
        value: {id, creationTimestamp: 0, rawData},
        version
      };
    }
    return {root: {values, version}, locations: {}};
  }

  private _newRecipe(name: string): Recipe {
    const recipe = new Recipe(name);
    this._recipes.push(recipe);
    return recipe;
  }

  // TODO: This is a temporary method to allow sharing stores with other Arcs.
  registerStore(store: AbstractStore, tags: string[]): void {
    // Only register stores that have non-volatile storage key and don't have a
    // #volatile tag.
    if (!this.findStoreById(store.id) && !this.isVolatileStore(store, tags)) {
      this._addStore(store, tags);
    }
  }

  isVolatileStore(store: AbstractStore, tags: string[]): boolean {
    if (store.storageKey.protocol === VolatileStorageKey.protocol) return true;
    if (store.storageKey.protocol === ReferenceModeStorageKey.protocol &&
        (store.storageKey as ReferenceModeStorageKey).backingKey.protocol === VolatileStorageKey.protocol &&
        (store.storageKey as ReferenceModeStorageKey).storageKey.protocol === VolatileStorageKey.protocol) {
      return true;
    }
    if (tags.includes('volatile')) return true;
    return false;
  }

  /**
   * Verifies that all definitions in the manifest (including all other
   * manifests that it imports) have unique names.
   */
  validateUniqueDefinitions() {
    function checkUnique(type: string, items: {name: string}[]) {
      const names: Set<string> = new Set();
      for (const item of items) {
        if (names.has(item.name)) {
          throw new Error(`Duplicate definition of ${type} named '${item.name}'.`);
        }
        names.add(item.name);
      }
    }
    // TODO: Validate annotations as well. They're tricky because of canonical
    // annotations.
    checkUnique('particle', this.allParticles);
    checkUnique('policy', this.allPolicies);
    checkUnique('recipe', this.allRecipes);
    checkUnique('resource', this.allResources);
    checkUnique('schema', this.allSchemas);
    checkUnique('store', this.allStores);
  }

  toString(options: {recursive?: boolean, showUnresolved?: boolean, hideFields?: boolean} = {}): string {
    // TODO: sort?
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

    Object.values(this._annotations).forEach(a => {
      results.push(a.toManifestString());
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
      results.push(store.toManifestString({handleTags: this.storeTags.get(store)}));
    });

    this._policies.forEach(policy => {
      results.push(policy.toManifestString());
    });

    return results.join('\n');
  }
}
