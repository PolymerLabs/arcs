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

class Arc {
  constructor({id, context, pecFactory, slotComposer, loader, storageKey}) {
    // TODO: context should not be optional.
    this._context = context || new Manifest({id});
    // TODO: pecFactory should not be optional. update all callers and fix here.
    this._pecFactory = pecFactory || FakePecFactory.bind(null);
    this.id = id;
    this._nextLocalID = 0;
    this._activeRecipe = new Recipe();
    // TODO: rename: this are just tuples of {particles, handles, slots} of instantiated recipes merged into active recipe..
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
    this._storageProviderFactory = new StorageProviderFactory(this.id);

    // Dictionary from each tag string to a list of handles
    this._tags = {};
    // Map from each handle to a list of tags.
    this._handleTags = new Map();
    // Map from each handle to its description (originating in the manifest).
    this._handleDescriptions = new Map();

    this._search = null;
    this._description = new Description(this);

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

  serialize() {
    return `
meta
  name: '${this.id}'

@active
${this.activeRecipe.toString()}`;
  }

  static async deserialize({serialization, pecFactory, slotComposer, loader}) {
    let manifest = await Manifest.parse(serialization, {loader});
    var arc = new Arc({id: manifest.meta.name, slotComposer, pecFactory, loader});
    var recipe = manifest.activeRecipe.clone();
    recipe.normalize();
    arc.instantiate(recipe);
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
    let id = this.generateID();
    let handleMap = {spec: recipeParticle.spec, views: new Map()};
    this.particleHandleMaps.set(id, handleMap);

    for (let [name, connection] of Object.entries(recipeParticle.connections)) {
      if (!connection.view) {
        assert(connection.isOptional);
        continue;
      }
      let handle = this.findHandleById(connection.view.id);
      assert(handle);
      this._connectParticleToHandle(id, recipeParticle, name, handle);
    }

    // At least all non-optional connections must be resolved
    assert(handleMap.views.size >= handleMap.spec.connections.filter(c => !c.isOptional).length,
           `Not all mandatory connections are resolved for {$particle}`);
    this.pec.instantiate(recipeParticle, id, handleMap.spec, handleMap.views, this._lastSeenVersion);
    recipeParticle._scheduler = this.scheduler;
    return id;
  }

  generateID() {
    return `${this.id}:${this._nextLocalID++}`;
  }

  generateIDComponents() {
    return {base: this.id, component: () => this._nextLocalID++};
  }

  get _views() {
    return [...this._handlesById.values()];
  }

  // Makes a copy of the arc used for speculative execution.
  async cloneForSpeculativeExecution() {
    var arc = new Arc({id: this.generateID(), pecFactory: this._pecFactory, context: this.context, loader: this._loader});
    arc._scheduler = this._scheduler.clone();
    let handleMap = new Map();
    for (let v of this._views) {
      let clone = await arc._storageProviderFactory.construct(v.id, v.type, 'in-memory');
      await clone.cloneFrom(v);
      handleMap.set(v, clone);
      if (this._handleDescriptions.has(v)) {
        arc._handleDescriptions.set(clone, this._handleDescriptions.get(v));
      }
    };
    this.particleHandleMaps.forEach((value, key) => {
      arc.particleHandleMaps.set(key, {
        spec: value.spec,
        views: new Map()
      });
      value.views.forEach(v => arc.particleHandleMaps.get(key).views.set(v.name, handleMap.get(v)));
    });

   let {particles, views, slots} = this._activeRecipe.mergeInto(arc._activeRecipe);
   let particleIndex = 0, viewIndex = 0, slotIndex = 0;
   this._recipes.forEach(recipe => {
     let arcRecipe = {particles: [], views: [], slots: [], innerArcs: new Map()};
     recipe.particles.forEach(p => {
       arcRecipe.particles.push(particles[particleIndex++]);
       if (recipe.innerArcs.has(p)) {
         let thisInnerArc = recipe.innerArcs.get(p);
         let transformationParticle = arcRecipe.particles[arcRecipe.particles.length - 1];
         let innerArc = {activeRecipe: new Recipe(), recipes: []};
         let innerTuples = thisInnerArc.activeRecipe.mergeInto(innerArc.activeRecipe);
         thisInnerArc.recipes.forEach(thisInnerArcRecipe => {
           let innerArcRecipe = {particles: [], views: [], slots: [], innerArcs: new Map()};
           let innerIndex = 0;
           thisInnerArcRecipe.particles.forEach(thisInnerArcRecipeParticle => {
             innerArcRecipe.particles.push(innerTuples.particles[innerIndex++]);
           });
           innerIndex = 0;
           thisInnerArcRecipe.views.forEach(thisInnerArcRecipeParticle => {
             innerArcRecipe.views.push(innerTuples.views[innerIndex++]);
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
     recipe.views.forEach(p => {
       arcRecipe.views.push(views[viewIndex++]);
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
    let {views, particles, slots} = recipe.mergeInto(currentArc.activeRecipe);
    currentArc.recipes.push({particles, views, slots, innerArcs: new Map()});

    for (let recipeView of views) {
      if (['copy', 'create'].includes(recipeView.fate)) {
        let view = await this.createHandle(recipeView.type, /* name= */ null, this.generateID(), recipeView.tags);
        if (recipeView.fate === 'copy') {
          var copiedView = this.findHandleById(recipeView.id);
          await view.cloneFrom(copiedView);
          let copiedViewDesc = this.getHandleDescription(copiedView);
          if (copiedViewDesc) {
            this._handleDescriptions.set(view, copiedViewDesc);
          }
        }
        recipeView.id = view.id;
        recipeView.fate = 'use';
        recipeView.storageKey = view.storageKey;
        // TODO: move the call to OuterPEC's DefineView to here
      }
      let storageKey = recipeView.storageKey;
      if (!storageKey)
        storageKey = this.keyForId(recipeView.id);
      assert(storageKey, `couldn't find storage key for view '${recipeView}'`);
      let view = await this._storageProviderFactory.connect(recipeView.id, recipeView.type, storageKey);
      assert(view, `view '${recipeView.id}' was not found`);
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
    handleMap.views.set(name, targetHandle);
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
      return `list:${type.primitiveType().entitySchema.name}`;
    } else if (type.isEntity) {
      return type.entitySchema.name;
    } else if (type.isShape) {
      // TODO we need to fix this too, otherwise all views of shape type will
      // be of the 'same type' when searching by type.
      return type.shapeShape;
    }
  }

  findHandlesByType(type, options) {
    // TODO: use options (location, labels, etc.) somehow.
    var views = this._handlesByType.get(Arc._viewKey(type)) || [];
    if (options && options.tags) {
      views = views.filter(view => options.tags.filter(tag => !this._handleTags.get(view).has(tag)).length == 0);
    }
    return views;
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
    this.pec.initDebug();
  }
}

export default Arc;
