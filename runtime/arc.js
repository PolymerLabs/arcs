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

import runtime from './runtime.js';
import assert from '../platform/assert-web.js';
import tracing from '../tracelib/trace.js';
import Type from './type.js';
import Relation from './relation.js';
import handle from './handle.js';
import OuterPec from './outer-PEC.js';
import Recipe from './recipe/recipe.js';
import Manifest from './manifest.js';
import Description from './description.js';
import util from './recipe/util.js';
import FakePecFactory from './fake-pec-factory.js';
import StorageProviderFactory from './storage/storage-provider-factory.js';
import scheduler from './scheduler.js';
import {registerArc} from '../devtools/shared/arc-registry.js';
import Id from './id.js';

class Arc {
  constructor({id, context, pecFactory, slotComposer, loader, storageKey, storageProviderFactory, speculative}) {
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
    this._scheduler = scheduler;

    // All the handles, mapped by handle ID
    this._handlesById = new Map();
    // .. and mapped by Type
    this._handlesByType = new Map();

    // information about last-seen-versions of handles
    this._lastSeenVersion = new Map();

    // storage keys for referenced handles
    this._storageKeys = {};
    this._storageKey = storageKey;


    this.particleHandleMaps = new Map();
    let pecId = this.generateID();
    let innerPecPort = this._pecFactory(pecId);
    this.pec = new OuterPec(innerPecPort, slotComposer, this, `${pecId}:outer`);
    if (slotComposer) {
      slotComposer.arc = this;
    }
    this._storageProviderFactory = storageProviderFactory || new StorageProviderFactory(this.id);

    // Dictionary from each tag string to a list of handles
    this._tags = {};
    // Map from each handle to a list of tags.
    this._handleTags = new Map();
    // Map from each handle to its description (originating in the manifest).
    this._handleDescriptions = new Map();

    this._search = null;
    this._description = new Description(this);
    this._debugging = false;

    registerArc(this);
  }
  get loader() {
    return this._loader;
  }

  get scheduler() {
    return this._scheduler;
  }

  set search(search) {
    this._search = search ? search.toLowerCase().trim() : null;
  }

  get search() {
    return this._search;
  }

  get description() { return this._description; }

  get makeSuggestions() { return this._makeSuggestions; }
  set makeSuggestions(callback) {
    this._makeSuggestions = callback;
    this._scheduler.idleCallback = callback;
  }

  get idle() {
    let awaitCompletion = async () => {
      await this.scheduler.idle;
      let messageCount = this.pec.messageCount;
      await this.pec.idle;
      if (this.pec.messageCount !== messageCount + 1)
        return awaitCompletion();
    };

    return awaitCompletion();
  }

  get isSpeculative() {
    return this._speculative;
  }

  async _serializeHandles() {
    let schemas = '';
    let handles = '';
    let resources = '';
    let interfaces = '';

    let id = 0;
    let schemaSet = new Set();
    let importSet = new Set();
    for (let handle of this._activeRecipe.handles) {
      if (handle.fate == 'map')
        importSet.add(this.context.findManifestUrlForHandleId(handle.id));
    }
    for (let url of importSet.values())
      resources += `import '${url}'\n`;

    for (let handle of this._handlesById.values()) {
      let type = handle.type;
      if (type.isSetView)
        type = type.primitiveType();
      if (type.isEntity) {
        let schema = type.entitySchema.toString();
        if (!schemaSet.has(schema)) {
          schemaSet.add(schema);
          schemas += schema + '\n';
        }
      }
      if (type.isInterface) {
        interfaces += type.interfaceShape.toString() + '\n';
      }
      let key = this._storageProviderFactory.parseStringAsKey(handle.storageKey);
      switch (key.protocol) {
        case 'firebase':
          handles += `view View${id++} of ${handle.type.toString()} '${handle.id}' @${handle._version} at '${handle.storageKey}'\n`;
          break;
        case 'in-memory': {
          resources += `resource View${id}Resource\n`;
          let indent = '  ';
          resources += indent + 'start\n';

          let serializedData = (await handle.serializedData()).map(a => {
            if (a == null)
              return null;
            if (a.rawData) {
              let result = {};
              result.$id = a.id;
              for (let field in a.rawData) {
                result[field] = a.rawData[field];
              }
              return result;
            }
            return a;
          });
          let data = JSON.stringify(serializedData);
          resources += data.split('\n').map(line => indent + line).join('\n');
          resources += '\n';
          handles += `view View${id} of ${handle.type.toString()} '${handle.id}' @${handle._version} in View${id++}Resource\n`;
          break;
        }
      }
    }

    return resources + interfaces + schemas + handles;
  }

  _serializeParticles() {
    return [...this.particleHandleMaps.values()].map(entry => entry.spec.toString()).join('\n');
  }

  _serializeStorageKey() {
    if (this._storageKey)
      return `storageKey: '${this._storageKey}'\n`;
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

  static async deserialize({serialization, pecFactory, slotComposer, loader, fileName}) {
    let manifest = await Manifest.parse(serialization, {loader, fileName});
    let arc = new Arc({
      id: manifest.meta.name,
      storageKey: manifest.meta.storageKey,
      slotComposer,
      pecFactory,
      loader,
      storageProviderFactory: manifest._storageProviderFactory,
      context: manifest
    });
    // TODO: pass tags through too
    manifest.handles.forEach(handle => arc._registerHandle(handle, []));
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
      let handle = this.findHandleById(connection.handle.id);
      assert(handle, `can't find handle of id ${connection.handle.id}`);
      this._connectParticleToHandle(id, recipeParticle, name, handle);
    }

    // At least all non-optional connections must be resolved
    assert(handleMap.handles.size >= handleMap.spec.connections.filter(c => !c.isOptional).length,
           `Not all mandatory connections are resolved for {$particle}`);
    this.pec.instantiate(recipeParticle, id, handleMap.spec, handleMap.handles, this._lastSeenVersion);
    recipeParticle._scheduler = this.scheduler;
    return id;
  }

  generateID(component) {
    return this.id.createId(component).toString();
  }

  generateIDComponents() {
    return {base: this.id, component: () => this._nextLocalID++};
  }

  get _handles() {
    return [...this._handlesById.values()];
  }

  // Makes a copy of the arc used for speculative execution.
  async cloneForSpeculativeExecution() {
    let arc = new Arc({id: this.generateID().toString(), pecFactory: this._pecFactory, context: this.context, loader: this._loader, speculative: true});
    arc._scheduler = this._scheduler.clone();
    let handleMap = new Map();
    for (let handle of this._handles) {
      let clone = await arc._storageProviderFactory.construct(handle.id, handle.type, 'in-memory');
      await clone.cloneFrom(handle);
      handleMap.set(handle, clone);
      if (this._handleDescriptions.has(handle)) {
        arc._handleDescriptions.set(clone, this._handleDescriptions.get(handle));
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
   let particleIndex = 0, handleIndex = 0, slotIndex = 0;
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
      arc._registerHandle(v, []);
    }
    return arc;
  }

  async instantiate(recipe, innerArc) {
    assert(recipe.isResolved(), 'Cannot instantiate an unresolved recipe');

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
        if (type.isVariable)
          type = type.resolvedType();
        let handle = await this.createHandle(type, /* name= */ null, this.generateID(), recipeHandle.tags);
        if (recipeHandle.fate === 'copy') {
          let copiedHandle = this.findHandleById(recipeHandle.id);
          assert(copiedHandle._version !== null);
          await handle.cloneFrom(copiedHandle);
          let copiedHandleDesc = this.getHandleDescription(copiedHandle);
          if (copiedHandleDesc) {
            this._handleDescriptions.set(handle, copiedHandleDesc);
          }
        }
        recipeHandle.id = handle.id;
        recipeHandle.fate = 'use';
        recipeHandle.storageKey = handle.storageKey;
        // TODO: move the call to OuterPEC's DefineView to here
      }
      
      let storageKey = recipeHandle.storageKey;
      if (!storageKey)
        storageKey = this.keyForId(recipeHandle.id);
      assert(storageKey, `couldn't find storage key for handle '${recipeHandle}'`);
      let handle = await this._storageProviderFactory.connect(recipeHandle.id, recipeHandle.type, storageKey);
      assert(handle, `handle '${recipeHandle.id}' was not found`);
    }

    particles.forEach(recipeParticle => this._instantiateParticle(recipeParticle));

    if (this.pec.slotComposer) {
      // TODO: pass slot-connections instead
      this.pec.slotComposer.initializeRecipe(particles);
    }
  }

  _connectParticleToHandle(particleId, particle, name, targetHandle) {
    assert(targetHandle, 'no target handle provided');
    let handleMap = this.particleHandleMaps.get(particleId);
    assert(handleMap.spec.connectionMap.get(name) !== undefined, 'can\'t connect handle to a view slot that doesn\'t exist');
    handleMap.handles.set(name, targetHandle);
  }

  async createHandle(type, name, id, tags, storageKey) {
    assert(type instanceof Type, `can't createHandle with type ${type} that isn't a Type`);

    if (type.isRelation) {
      type = Type.newSetView(type);
    }

    if (id == undefined)
      id = this.generateID();

    if (storageKey == undefined && this._storageKey)
      storageKey = this._storageProviderFactory.parseStringAsKey(this._storageKey).childKeyForHandle(id).toString();

    if (storageKey == undefined)
      storageKey = 'in-memory';

    let handle = await this._storageProviderFactory.construct(id, type, storageKey);
    assert(handle, 'handle with id ${id} already exists');
    handle.name = name;

    this._registerHandle(handle, tags);
    return handle;
  }

  _registerHandle(handle, tags) {
    tags = tags || [];
    tags = Array.isArray(tags) ? tags : [tags];
    tags.forEach(tag => assert(tag.startsWith('#'),
      `tag ${tag} must start with '#'`));

    this._handlesById.set(handle.id, handle);
    let byType = this._handlesByType.get(Arc._viewKey(handle.type)) || [];
    byType.push(handle);
    this._handlesByType.set(Arc._viewKey(handle.type), byType);

    if (tags.length) {
      for (let tag of tags) {
        if (this._tags[tag] == undefined)
          this._tags[tag] = [];
        this._tags[tag].push(handle);
      }
    }
    this._handleTags.set(handle, new Set(tags));

    this._storageKeys[handle.id] = handle.storageKey;
  }

  // TODO: Don't use this, we should be testing the schemas for compatiblity
  //       instead of using just the name.
  static _viewKey(type) {
    if (type.isSetView) {
      let key = this._viewKey(type.primitiveType());
      if (key) {
        return `list:${key}`;
      }
    } else if (type.isEntity) {
      return type.entitySchema.name;
    } else if (type.isShape) {
      // TODO we need to fix this too, otherwise all views of shape type will
      // be of the 'same type' when searching by type.
      return type.shapeShape;
    } else if (type.isVariable && type.isResolved()) {
      return Arc._viewKey(type.resolvedType());
    }
  }

  findHandlesByType(type, options) {
    // TODO: dstockwell to rewrite this to use constraints and more
    let typeKey = Arc._viewKey(type);
    let handles = [...this._handlesById.values()].filter(handle => {
      if (typeKey) {
        let handleKey = Arc._viewKey(handle.type);
        if (typeKey === handleKey) {
          return true;
        }
      } else {
        if (type.isVariable && !type.isResolved() && handle.type.isEntity) {
          return true;
        } else if (type.isSetView && type.primitiveType().isVariable && !type.primitiveType().isResolved() && handle.type.isSetView) {
          return true;
        }
      }
      return false;
    });

    if (options && options.tags && options.tags.length > 0) {
      handles = handles.filter(handle => options.tags.filter(tag => !this._handleTags.get(handle).has(tag)).length == 0);
    }
    return handles;
  }

  findHandleById(id) {
    let handle = this._handlesById.get(id);
    if (handle == null) {
      handle = this._context.findHandleById(id);
    }
    return handle;
  }

  getHandleDescription(handle) {
    assert(handle, 'Cannot fetch description for nonexistent handle');
    return this._handleDescriptions.get(handle) || handle.description;
  }

  keyForId(id) {
    return this._storageKeys[id];
  }

  newCommit(entityMap) {
    for (let [entity, handle] of entityMap.entries()) {
      entity.identify(this.generateID());
    }
    for (let [entity, handle] of entityMap.entries()) {
      new handle.handleFor(handle).store(entity);
    }
  }

  stop() {
    this.pec.stop();
  }

  toContextString(options) {
    let results = [];
    let handles = [...this._handlesById.values()].sort(util.compareComparables);
    handles.forEach(v => {
      results.push(v.toString(this._handleTags.get(v)));
    });

    // TODO: include handles entities
    // TODO: include (remote) slots?

    if (!this._activeRecipe.isEmpty()) {
      results.push(this._activeRecipe.toString());
    }

    return results.join('\n');
  }

  initDebug() {
    this._debugging = true;
    this.pec.initDebug();
  }
}

export default Arc;
