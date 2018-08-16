/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {assert} from '../platform/assert-web.js';
import {Type} from './ts-build/type.js';
import {ParticleExecutionHost} from './particle-execution-host.js';
import {Handle} from './recipe/handle.js';
import {Recipe} from './recipe/recipe.js';
import {Manifest} from './manifest.js';
import {Description} from './description.js';
import * as util from './recipe/util.js';
import {FakePecFactory} from './fake-pec-factory.js';
import {StorageProviderFactory} from './ts-build/storage/storage-provider-factory.js';
import {DevtoolsConnection} from './debug/devtools-connection.js';
import {Id} from './ts-build/id.js';
import {ArcDebugHandler} from './debug/arc-debug-handler.js';
import {RecipeIndex} from './recipe-index.js';

export class Arc {
  constructor({id, context, pecFactory, slotComposer, loader, storageKey, storageProviderFactory, speculative, scheduler, recipeIndex}) {
    // TODO: context should not be optional.
    this._context = context || new Manifest({id});
    // TODO: pecFactory should not be optional. update all callers and fix here.
    this._pecFactory = pecFactory || FakePecFactory.bind(null);

    // for now, every Arc gets its own session
    this.sessionId = Id.newSessionId();
    this.id = this.sessionId.fromString(id);
    this._speculative = !!speculative; // undefined => false
    this._nextLocalID = 0;
    this._activeRecipe = new Recipe();
    // TODO: rename: this are just tuples of {particles, handles, slots, pattern} of instantiated recipes merged into active recipe.
    this._recipes = [];
    this._loader = loader;
    this._dataChangeCallbacks = new Map();

    // All the stores, mapped by store ID
    this._storesById = new Map();

    // storage keys for referenced handles
    this._storageKeys = {};
    this._storageKey = storageKey;

    this.particleHandleMaps = new Map();
    let pecId = this.generateID();
    let innerPecPort = this._pecFactory(pecId);
    this.pec = new ParticleExecutionHost(innerPecPort, slotComposer, this, `${pecId}:outer`);
    if (slotComposer) {
      slotComposer.arc = this;
    }
    this._storageProviderFactory = storageProviderFactory || new StorageProviderFactory(this.id);

    // Map from each store to a set of tags.
    this._storeTags = new Map();
    // Map from each store to its description (originating in the manifest).
    this._storeDescriptions = new Map();

    this._description = new Description(this);

    this._instantiatePlanCallbacks = [];
    this._recipeIndex = recipeIndex || new RecipeIndex(this._context, slotComposer && slotComposer.affordance);

    DevtoolsConnection.onceConnected.then(
        devtoolsChannel => new ArcDebugHandler(this, devtoolsChannel));
  }
  get loader() {
    return this._loader;
  }

  get description() {
    return this._description;
  }

  get recipeIndex() {
    return this._recipeIndex;
  }

  registerInstantiatePlanCallback(callback) {
    this._instantiatePlanCallbacks.push(callback);
  }

  unregisterInstantiatePlanCallback(callback) {
    let index = this._instantiatePlanCallbacks.indexOf(callback);
    if (index >= 0) {
      this._instantiatePlanCallbacks.splice(index, 1);
      return true;
    }
    return false;
  }

  dispose() {
    this._instantiatePlanCallbacks = [];
    // TODO: disconnect all assocated store event handlers
    this.pec.close();
    this.pec.slotComposer && this.pec.slotComposer.dispose();
  }

  // Returns a promise that spins sending a single `AwaitIdle` message until it
  // sees no other messages were sent.
  async _waitForIdle() {
    let messageCount;
    do {
      messageCount = this.pec.messageCount;
      await this.pec.idle;
      // We expect two messages here, one requesting the idle status, and one answering it.
    } while (this.pec.messageCount !== messageCount + 2);
  }

  get idle() {
    if (!this._waitForIdlePromise) {
      // Store one active completion promise for use by any subsequent callers.
      // We explicitly want to avoid, for example, multiple simultaneous
      // attempts to identify idle state each sending their own `AwaitIdle`
      // message and expecting settlement that will never arrive.
      this._waitForIdlePromise =
          this._waitForIdle().then(() => this._waitForIdlePromise = null);
    }
    return this._waitForIdlePromise;
  }

  get isSpeculative() {
    return this._speculative;
  }

  async _serializeHandles() {
    let handles = '';
    let resources = '';
    let interfaces = '';

    let id = 0;
    let importSet = new Set();
    let handleSet = new Set();
    for (let handle of this._activeRecipe.handles) {
      if (handle.fate == 'map') {
        importSet.add(this.context.findManifestUrlForHandleId(handle.id));
      } else {
        handleSet.add(handle.id);
      }
    }
    for (let url of importSet.values()) {
      resources += `import '${url}'\n`;
    }

    for (let handle of this._stores) {
      if (!handleSet.has(handle.id)) {
        continue;
      }
      let type = handle.type;
      if (type.isCollection) {
        type = type.primitiveType();
      }
      if (type.isInterface) {
        interfaces += type.interfaceShape.toString() + '\n';
      }
      let key = this._storageProviderFactory.parseStringAsKey(handle.storageKey);
      let handleTags = [...this._storeTags.get(handle)].map(a => `#${a}`).join(' ');
      switch (key.protocol) {
        case 'firebase':
          handles += `store Store${id++} of ${handle.type.toString()} '${handle.id}' @${handle.version} ${handleTags} at '${handle.storageKey}'\n`;
          break;
        case 'in-memory': {
          resources += `resource Store${id}Resource\n`;
          let indent = '  ';
          resources += indent + 'start\n';
          // TODO(sjmiles): emit empty data for stores marked `nosync`: shell will supply data
          const nosync = handleTags.includes('nosync');
          let serializedData = nosync ?
              [] :
              (await handle.toLiteral()).model.map(({id, value}) => {
                if (value == null) {
                  return null;
                }
                if (value.rawData) {
                  let result = {};
                  for (let field in value.rawData) {
                    result[field] = value.rawData[field];
                  }
                  result.$id = id;
                  return result;
                } else {
                  return value;
                }
              });
          let data = JSON.stringify(serializedData);
          resources += data.split('\n').map(line => indent + line).join('\n');
          resources += '\n';
          handles += `store Store${id} of ${handle.type.toString()} '${handle.id}' @${handle.version} ${handleTags} in Store${id++}Resource\n`;
          break;
        }
      }
    }

    return resources + interfaces + handles;
  }

  _serializeParticles() {
    return this._activeRecipe.particles.map(entry => entry.spec.toString()).join('\n');
  }

  _serializeStorageKey() {
    if (this._storageKey) {
      return `storageKey: '${this._storageKey}'\n`;
    }
    return '';
  }

  async serialize() {
    await this.idle;
    return `
meta
  name: '${this.id}'
  ${this._serializeStorageKey()}

${await this._serializeHandles()}

${this._serializeParticles()}

@active
${this.activeRecipe.toString()}`;
  }

  static async deserialize({serialization, pecFactory, slotComposer, loader, fileName, context}) {
    let manifest = await Manifest.parse(serialization, {loader, fileName, context});
    let arc = new Arc({
      id: manifest.meta.name,
      storageKey: manifest.meta.storageKey,
      slotComposer,
      pecFactory,
      loader,
      storageProviderFactory: manifest._storageProviderFactory,
      context
    });
    await Promise.all(manifest.stores.map(async store => {
      if (store.constructor.name == 'StorageStub') {
        store = await store.inflate();
      }
      arc._registerStore(store, manifest._storeTags.get(store));
    }));
    let recipe = manifest.activeRecipe.clone();
    let options = {errors: new Map()};
    assert(recipe.normalize(options), `Couldn't normalize recipe ${recipe.toString()}:\n${[...options.errors.values()].join('\n')}`);
    await arc.instantiate(recipe);
    return arc;
  }

  get context() {
    return this._context;
  }

  get activeRecipe() { return this._activeRecipe; }
  get recipes() { return this._recipes; }

  loadedParticles() {
    return [...this.particleHandleMaps.values()].map(({spec}) => spec);
  }

  _instantiateParticle(recipeParticle) {
    let id = this.generateID('particle');
    let handleMap = {spec: recipeParticle.spec, handles: new Map()};
    this.particleHandleMaps.set(id, handleMap);

    for (let [name, connection] of Object.entries(recipeParticle.connections)) {
      if (!connection.handle) {
        assert(connection.isOptional);
        continue;
      }
      let handle = this.findStoreById(connection.handle.id);
      assert(handle, `can't find handle of id ${connection.handle.id}`);
      this._connectParticleToHandle(id, recipeParticle, name, handle);
    }

    // At least all non-optional connections must be resolved
    assert(handleMap.handles.size >= handleMap.spec.connections.filter(c => !c.isOptional).length,
           `Not all mandatory connections are resolved for {$particle}`);
    this.pec.instantiate(recipeParticle, id, handleMap.spec, handleMap.handles);
    return id;
  }

  generateID(component) {
    return this.id.createId(component).toString();
  }

  generateIDComponents() {
    return {base: this.id, component: () => this._nextLocalID++};
  }

  get _stores() {
    return [...this._storesById.values()];
  }

  // Makes a copy of the arc used for speculative execution.
  async cloneForSpeculativeExecution() {
    let arc = new Arc({id: this.generateID().toString(), pecFactory: this._pecFactory, context: this.context, loader: this._loader, recipeIndex: this._recipeIndex, speculative: true});
    let handleMap = new Map();
    for (let handle of this._stores) {
      let clone = await arc._storageProviderFactory.construct(handle.id, handle.type, 'in-memory');
      await clone.cloneFrom(handle);
      handleMap.set(handle, clone);
      if (this._storeDescriptions.has(handle)) {
        arc._storeDescriptions.set(clone, this._storeDescriptions.get(handle));
      }
    }
    this.particleHandleMaps.forEach((value, key) => {
      arc.particleHandleMaps.set(key, {
        spec: value.spec,
        handles: new Map()
      });
      value.handles.forEach(handle => arc.particleHandleMaps.get(key).handles.set(handle.name, handleMap.get(handle)));
    });

   let {particles, handles, slots} = this._activeRecipe.mergeInto(arc._activeRecipe);
   let particleIndex = 0;
   let handleIndex = 0;
   let slotIndex = 0;
    
   this._recipes.forEach(recipe => {
     let arcRecipe = {particles: [], handles: [], slots: [], innerArcs: new Map(), pattern: recipe.pattern};
     recipe.particles.forEach(p => {
       arcRecipe.particles.push(particles[particleIndex++]);
       if (recipe.innerArcs.has(p)) {
         let thisInnerArc = recipe.innerArcs.get(p);
         let transformationParticle = arcRecipe.particles[arcRecipe.particles.length - 1];
         let innerArc = {activeRecipe: new Recipe(), recipes: []};
         let innerTuples = thisInnerArc.activeRecipe.mergeInto(innerArc.activeRecipe);
         thisInnerArc.recipes.forEach(thisInnerArcRecipe => {
           let innerArcRecipe = {particles: [], handles: [], slots: [], innerArcs: new Map()};
           let innerIndex = 0;
           thisInnerArcRecipe.particles.forEach(thisInnerArcRecipeParticle => {
             innerArcRecipe.particles.push(innerTuples.particles[innerIndex++]);
           });
           innerIndex = 0;
           thisInnerArcRecipe.handles.forEach(thisInnerArcRecipeParticle => {
             innerArcRecipe.handles.push(innerTuples.handles[innerIndex++]);
           });
           innerIndex = 0;
           thisInnerArcRecipe.slots.forEach(thisInnerArcRecipeParticle => {
             innerArcRecipe.slots.push(innerTuples.slots[innerIndex++]);
           });
           innerArc.recipes.push(innerArcRecipe);
         });
         arcRecipe.innerArcs.set(transformationParticle, innerArc);
       }
     });
     recipe.handles.forEach(p => {
       arcRecipe.handles.push(handles[handleIndex++]);
     });
     recipe.slots.forEach(p => {
       arcRecipe.slots.push(slots[slotIndex++]);
     });

     arc._recipes.push(arcRecipe);
   });

    for (let v of handleMap.values()) {
      // FIXME: Tags
      arc._registerStore(v, []);
    }
    return arc;
  }

  async instantiate(recipe, innerArc) {
    assert(recipe.isResolved(), `Cannot instantiate an unresolved recipe: ${recipe.toString({showUnresolved: true})}`);

    let currentArc = {activeRecipe: this._activeRecipe, recipes: this._recipes};
    if (innerArc) {
      let innerArcs = this._recipes.find(r => !!r.particles.find(p => p == innerArc.particle)).innerArcs;
      if (!innerArcs.has(innerArc.particle)) {
         innerArcs.set(innerArc.particle, {activeRecipe: new Recipe(), recipes: []});
      }
      currentArc = innerArcs.get(innerArc.particle);
    }
    let {handles, particles, slots} = recipe.mergeInto(currentArc.activeRecipe);
    currentArc.recipes.push({particles, handles, slots, innerArcs: new Map(), pattern: recipe.pattern});
    slots.forEach(slot => slot.id = slot.id || `slotid-${this.generateID()}`);

    for (let recipeHandle of handles) {
      if (['copy', 'create'].includes(recipeHandle.fate)) {
        let type = recipeHandle.type;
        if (recipeHandle.fate == 'create') {
          assert(
              type.maybeEnsureResolved(),
              `Can't assign resolved type to ${type}`);
        }

        type = type.resolvedType();
        assert(type.isResolved(), `Can't create handle for unresolved type ${type}`);

        let newStore = await this.createStore(type, /* name= */ null, this.generateID(), recipeHandle.tags);
        if (recipeHandle.id && recipeHandle.type.isInterface
            && recipeHandle.id.includes(':particle-literal:')) {
          // 'particle-literal' handles are created by the FindHostedParticle strategy.
          let particleName = recipeHandle.id.match(/:particle-literal:([a-zA-Z]+)$/)[1];
          let particle = this.context.findParticleByName(particleName);
          assert(recipeHandle.type.interfaceShape.particleMatches(particle));
          newStore.set(particle.clone().toLiteral());
        } else if (recipeHandle.fate === 'copy') {
          let copiedStore = this.findStoreById(recipeHandle.id);
          assert(copiedStore.version !== null);
          await newStore.cloneFrom(copiedStore);
          this._tagStore(newStore, this.findStoreTags(copiedStore));
          let copiedStoreDesc = this.getStoreDescription(copiedStore);
          if (copiedStoreDesc) {
            this._storeDescriptions.set(newStore, copiedStoreDesc);
          }
        }
        recipeHandle.id = newStore.id;
        recipeHandle.fate = 'use';
        recipeHandle.storageKey = newStore.storageKey;
        // TODO: move the call to ParticleExecutionHost's DefineHandle to here
      }

      let storageKey = recipeHandle.storageKey;
      if (!storageKey) {
        storageKey = this.keyForId(recipeHandle.id);
      }
      assert(storageKey, `couldn't find storage key for handle '${recipeHandle}'`);
      let store = await this._storageProviderFactory.connect(recipeHandle.id, recipeHandle.type, storageKey);
      assert(store, `store '${recipeHandle.id}' was not found`);
    }

    particles.forEach(recipeParticle => this._instantiateParticle(recipeParticle));

    if (this.pec.slotComposer) {
      // TODO: pass slot-connections instead
      this.pec.slotComposer.initializeRecipe(particles);
    }

    if (!this.isSpeculative && !innerArc) {
      // Note: callbacks not triggered for inner-arc recipe instantiation or speculative arcs.
      this._instantiatePlanCallbacks.forEach(callback => callback(recipe));
    }
  }

  _connectParticleToHandle(particleId, particle, name, targetHandle) {
    assert(targetHandle, 'no target handle provided');
    let handleMap = this.particleHandleMaps.get(particleId);
    assert(handleMap.spec.connectionMap.get(name) !== undefined, 'can\'t connect handle to a connection that doesn\'t exist');
    handleMap.handles.set(name, targetHandle);
  }

  async createStore(type, name, id, tags, storageKey) {
    assert(type instanceof Type, `can't createStore with type ${type} that isn't a Type`);

    if (type.isRelation) {
      type = Type.newCollection(type);
    }

    if (id == undefined) {
      id = this.generateID();
    }

    if (storageKey == undefined && this._storageKey) {
      storageKey =
          this._storageProviderFactory.parseStringAsKey(this._storageKey)
              .childKeyForHandle(id)
              .toString();
    }

    if (storageKey == undefined) {
      storageKey = 'in-memory';
    }

    let store = await this._storageProviderFactory.construct(id, type, storageKey);
    assert(store, 'stopre with id ${id} already exists');
    store.name = name;

    this._registerStore(store, tags);
    return store;
  }

  _registerStore(store, tags) {
    assert(!this._storesById.has(store.id), `Store already registered '${store.id}'`);
    tags = tags || [];
    tags = Array.isArray(tags) ? tags : [tags];


    this._storesById.set(store.id, store);

    this._storeTags.set(store, new Set(tags));

    this._storageKeys[store.id] = store.storageKey;
    store.on('change', () => this._onDataChange(), this);
  }

  _tagStore(store, tags) {
    assert(this._storesById.has(store.id) && this._storeTags.has(store), `Store not registered '${store.id}'`);
    let storeTags = this._storeTags.get(store);
    (tags || []).forEach(tag => storeTags.add(tag));
  }

  _onDataChange() {
    for (let callback of this._dataChangeCallbacks.values()) {
      callback();
    }
  }

  onDataChange(callback, registration) {
    this._dataChangeCallbacks.set(registration, callback);
  }

  clearDataChange(registration) {
    this._dataChangeCallbacks.delete(registration);
  }

  // Convert a type to a normalized key that we can use for
  // equality testing.
  //
  // TODO: we should be testing the schemas for compatiblity instead of using just the name.
  // TODO: now that this is only used to implement findStoresByType we can probably replace
  // the check there with a type system equality check or similar.
  static _typeToKey(type) {
    if (type.isCollection) {
      let key = this._typeToKey(type.primitiveType());
      if (key) {
        return `list:${key}`;
      }
    } else if (type.isEntity) {
      return type.entitySchema.name;
    } else if (type.isShape) {
      // TODO we need to fix this too, otherwise all handles of shape type will
      // be of the 'same type' when searching by type.
      return type.shapeShape;
    } else if (type.isVariable && type.isResolved()) {
      return Arc._typeToKey(type.resolvedType());
    }
  }

  findStoresByType(type, options) {
    let typeKey = Arc._typeToKey(type);
    let stores = [...this._storesById.values()].filter(handle => {
      if (typeKey) {
        let handleKey = Arc._typeToKey(handle.type);
        if (typeKey === handleKey) {
          return true;
        }
      } else {
        if (type.isVariable && !type.isResolved() && handle.type.isEntity) {
          return true;
        } else if (type.isCollection && type.primitiveType().isVariable && !type.primitiveType().isResolved() && handle.type.isCollection) {
          return true;
        }
      }
      return false;
    });

    if (options && options.tags && options.tags.length > 0) {
      stores = stores.filter(store => options.tags.filter(tag => !this._storeTags.get(store).has(tag)).length == 0);
    }

    // Quick check that a new handle can fulfill the type contract.
    // Rewrite of this method tracked by https://github.com/PolymerLabs/arcs/issues/1636.
    return stores.filter(s => !!Handle.effectiveType(
      type, [{type: s.type, direction: s.type.isInterface ? 'host' : 'inout'}]));
  }

  findStoreById(id) {
    let store = this._storesById.get(id);
    if (store == null) {
      store = this._context.findStoreById(id);
    }
    return store;
  }

  findStoreTags(store) {
    if (this._storeTags.has(store)) {
      return this._storeTags.get(store);
    }
    return this._context.findStoreTags(store);
  }

  getStoreDescription(store) {
    assert(store, 'Cannot fetch description for nonexistent store');
    return this._storeDescriptions.get(store) || store.description;
  }

  getStoresState() {
    let versionById = new Map();
    this._storesById.forEach((handle, id) => versionById.set(id, handle.version));
    return versionById;
  }

  isSameState(storesState) {
    for (let [id, version] of storesState ) {
      if (!this._storesById.has(id) || this._storesById.get(id).version != version) {
        return false;
      }
    }
    return true;
  }

  keyForId(id) {
    return this._storageKeys[id];
  }

  stop() {
    this.pec.stop();
  }

  toContextString(options) {
    let results = [];
    let stores = [...this._storesById.values()].sort(util.compareComparables);
    stores.forEach(store => {
      results.push(store.toString(this._storeTags.get(store)));
    });

    // TODO: include stores entities
    // TODO: include (remote) slots?

    if (!this._activeRecipe.isEmpty()) {
      results.push(this._activeRecipe.toString());
    }

    return results.join('\n');
  }
}
