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

class Arc {
  constructor({id, context, pecFactory, slotComposer, loader, storageKey}) {
    // TODO: context should not be optional.
    this._context = context || new Manifest({id});
    // TODO: pecFactory should not be optional. update all callers and fix here.
    this._pecFactory = pecFactory || FakePecFactory.bind(null);
    this.id = id;
    this._nextLocalID = 0;
    this._activeRecipe = new Recipe();
    // TODO: rename: this are just tuples of {particles, views, slots} of instantiated recipes merged into active recipe..
    this._recipes = [];
    this._loader = loader;
    this._scheduler = scheduler;

    // All the views, mapped by view ID
    this._viewsById = new Map();
    // .. and mapped by Type
    this._viewsByType = new Map();

    // information about last-seen-versions of views
    this._lastSeenVersion = new Map();

    // storage keys for referenced views
    this._storageKeys = {};
    this._storageKey = storageKey;

    this.particleViewMaps = new Map();
    let pecId = this.generateID();
    let innerPecPort = this._pecFactory(pecId);
    this.pec = new OuterPec(innerPecPort, slotComposer, this, `${pecId}:outer`);
    if (slotComposer) {
      slotComposer.arc = this;
    }
    this.nextParticleHandle = 0;
    this._storageProviderFactory = new StorageProviderFactory(this);

    // Dictionary from each tag string to a list of views
    this._tags = {};
    // Map from each view to a list of tags.
    this._viewTags = new Map();

    this._search = null;
    this._description = new Description(this);
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
    this._scheduler.idleCallack = callback;
  }

  static deserialize({serialization, pecFactory, slotComposer, arcMap}) {
    var entityMap = {};
    var viewMap = {};
    serialization.entities.forEach(e => entityMap[e.id] = e);
    var arc = new Arc({id: serialization.id, slotComposer});
    for (var serializedView of serialization.views) {
      if (serializedView.arc) {
        var view = arcMap.get(serializedView.arc).findViewById(serializedView.id);
        arc.mapView(view);
      } else {
        // TODO add a separate deserialize constructor for view?
        var view = arc.createView(new Type(serializedView.type.tag, serializedView.type.data), serializedView.name, serializedView.id);
        view._version = serializedView.version;

        if (serializedView.sort == 'view') {
          var values = serializedView.values.map(a => entityMap[a]);
          values.forEach(v => view._items.set(v.id, v));
        } else {
          var value = entityMap[serializedView.value];
          view._stored = value;
        }
      }
      viewMap[view.id] = view;
      arc._lastSeenVersion.set(view.id, serializedView.version);
    }
    for (var serializedParticle of serialization.particles) {
      var particleHandle = arc._instantiateParticle(serializedParticle.name);
      for (var name in serializedParticle.views) {
        arc._connectParticleToView(particleHandle, serializedParticle, name, viewMap[serializedParticle.views[name]]);
      }
    }
    return arc;
  }

  get context() {
    return this._context;
  }

  get activeRecipe() { return this._activeRecipe; }
  get recipes() { return this._recipes; }

  loadedParticles() {
    return [...this.particleViewMaps.values()].map(({spec}) => spec);
  }

  _instantiateParticle(recipeParticle) {
    var handle = this.nextParticleHandle++;
    let viewMap = {spec: recipeParticle.spec, views: new Map()};
    this.particleViewMaps.set(handle, viewMap);

    for (let [name, connection] of Object.entries(recipeParticle.connections)) {
      if (!connection.view) {
        assert(connection.isOptional);
        continue;
      }
      let view = this.findViewById(connection.view.id);
      assert(view);
      this._connectParticleToView(handle, recipeParticle, name, view);
    }

    // At least all non-optional connections must be resolved
    assert(viewMap.views.size >= viewMap.spec.connections.filter(c => !c.isOptional).length,
           `Not all mandatory connections are resolved for {$particle}`);
    this.pec.instantiate(recipeParticle, viewMap.spec, viewMap.views, this._lastSeenVersion);
    return handle;
  }

  generateID() {
    return `${this.id}:${this._nextLocalID++}`;
  }

  generateIDComponents() {
    return {base: this.id, component: () => this._nextLocalID++};
  }

  get _views() {
    return [...this._viewsById.values()];
  }

  // Makes a copy of the arc used for speculative execution.
  async cloneForSpeculativeExecution() {
    var arc = new Arc({id: this.generateID(), pecFactory: this._pecFactory, context: this.context, loader: this._loader});
    arc._scheduler = this._scheduler.clone();
    var viewMap = new Map();
    for (let v of this._views) {
      let clone = await arc._storageProviderFactory.construct(v.id, v.type, 'in-memory');
      await clone.cloneFrom(v);
      viewMap.set(v, clone);      
    };
    this.particleViewMaps.forEach((value, key) => {
      arc.particleViewMaps.set(key, {
        spec: value.spec,
        views: new Map()
      });
      value.views.forEach(v => arc.particleViewMaps.get(key).views.set(v.name, viewMap.get(v)));
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

    for (let v of viewMap.values()) {
      // FIXME: Tags
      arc._registerView(v, []);
    }
    return arc;
  }

  serialize() {
    var s = {views: [], particles: [], id: this.id};

    // 1. serialize entities
    var entities = new Set();
    for (var view of this._views)
      view.extractEntities(entities);

    s.entities = [...entities.values()];

    // 2. serialize views
    for (var view of this._views) {
      if (view._arc !== this) {
        view.serializeMappingRecord(s.views);
      } else {
        view.serialize(s.views);
      }
    }

    // 3. serialize particles
    for (var particle of this.particleViewMaps.values()) {
      if (particle.spec.transient)
        continue;
      var name = particle.spec.name;
      var serializedParticle = {name, views: {}};
      for (let [key, value] of particle.views) {
        serializedParticle.views[key] = value.id;
      }
      s.particles.push(serializedParticle);
    }
    return s;
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
        let view = await this.createView(recipeView.type, /* name= */ null, this.generateID(), recipeView.tags);
        if (recipeView.fate === 'copy') {
          var copiedView = this.findViewById(recipeView.id);
          await view.cloneFrom(copiedView);
        }
        recipeView.id = view.id;
        recipeView.fate = 'use';
        recipeView.storageKey = view.storageKey;
        // TODO: move the call to OuterPEC's DefineView to here
      }
      let storageKey = recipeView.storageKey;
      if (!storageKey)
        storageKey = this.keyForId(recipeView.id);
      let view = await this._storageProviderFactory.connect(recipeView.id, recipeView.type, storageKey);
      assert(view, `view '${recipeView.id}' was not found`);

      view.description = await this.description.getViewDescription(recipeView);
    }

    particles.forEach(recipeParticle => this._instantiateParticle(recipeParticle));

    if (this.pec.slotComposer) {
      // TODO: pass slot-connections instead
      this.pec.slotComposer.initializeRecipe(particles);
    }
  }

  _connectParticleToView(particleHandle, particle, name, targetView) {
    assert(targetView, 'no target view provided');
    var viewMap = this.particleViewMaps.get(particleHandle);
    assert(viewMap.spec.connectionMap.get(name) !== undefined, 'can\'t connect view to a view slot that doesn\'t exist');
    viewMap.views.set(name, targetView);
  }

  async createView(type, name, id, tags, storageKey) {
    assert(type instanceof Type, `can't createView with type ${type} that isn't a Type`);

    if (type.isRelation) {
      type = Type.newSetView(type);
    }

    if (id == undefined)
      id = this.generateID();

    if (storageKey == undefined && this._storageKey)
      storageKey = this._storageProviderFactory.parseStringAsKey(this._storageKey).childKeyForHandle(id).toString();

    if (storageKey == undefined)
      storageKey = 'in-memory';

    let view = await this._storageProviderFactory.construct(id, type, storageKey);
    assert(view, 'handle with id ${id} already exists');
    view.name = name;

    this._registerView(view, tags);
    return view;
  }

  _registerView(view, tags) {
    tags = tags || [];
    tags = Array.isArray(tags) ? tags : [tags];
    tags.forEach(tag => assert(tag.startsWith('#'),
      `tag ${tag} must start with '#'`));

    this._viewsById.set(view.id, view);
    let byType = this._viewsByType.get(Arc._viewKey(view.type)) || [];
    byType.push(view);
    this._viewsByType.set(Arc._viewKey(view.type), byType);

    if (tags.length) {
      for (let tag of tags) {
        if (this._tags[tag] == undefined)
          this._tags[tag] = [];
        this._tags[tag].push(view);
      }
    }
    this._viewTags.set(view, new Set(tags));

    this._storageKeys[view.id] = view.storageKey;
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

  findViewsByType(type, options) {
    // TODO: use options (location, labels, etc.) somehow.
    var views = this._viewsByType.get(Arc._viewKey(type)) || [];
    if (options && options.tags) {
      views = views.filter(view => options.tags.filter(tag => !this._viewTags.get(view).has(tag)).length == 0);
    }
    return views;
  }

  findViewById(id) {
    let view = this._viewsById.get(id);
    if (view == null) {
      view = this._context.findViewById(id);
    }
    return view;
  }

  keyForId(id) {
    return this._storageKeys[id];
  }

  newCommit(entityMap) {
    for (let [entity, view] of entityMap.entries()) {
      entity.identify(this.generateID());
    }
    for (let [entity, view] of entityMap.entries()) {
      new handle.handleFor(view).store(entity);
    }
  }

  stop() {
    this.pec.stop();
  }

  toContextString(options) {
    let results = [];
    let views = [...this._viewsById.values()].sort(util.compareComparables);
    views.forEach(v => {
      results.push(v.toString(this._viewTags.get(v)));
    });

    // TODO: include views entities
    // TODO: include (remote) slots?

    if (!this._activeRecipe.isEmpty()) {
      results.push(this._activeRecipe.toString());
    }

    return results.join('\n');
  }
}

export default Arc;
