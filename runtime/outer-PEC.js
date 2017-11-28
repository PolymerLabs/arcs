/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

const PEC = require('./particle-execution-context.js');
const assert = require('assert');
const PECOuterPort = require('./api-channel.js').PECOuterPort;
const Manifest = require('./manifest.js');

// TODO: fix
const Loader = require('./loader.js');

class OuterPEC extends PEC {
  constructor(port, slotComposer, arc) {
    super();
    this._particles = [];
    this._apiPort = new PECOuterPort(port);
    this._arc = arc;
    this._nextIdentifier = 0;
    this.slotComposer = slotComposer;

    this._apiPort.onRender = ({particle, slotName, content}) => {
      if (this.slotComposer) {
        this.slotComposer.renderSlot(particle, slotName, content);
      }
    }

    this._apiPort.onSynchronize = ({view, target, callback, modelCallback, type}) => {
      if (view.constructor.name == 'Variable') {
        var model = view.get();
      } else {
        var model = view.toList();
      }
      this._apiPort.SimpleCallback({callback: modelCallback, data: model}, target);
      view.on(type, data => this._apiPort.SimpleCallback({callback, data}), target);
    };

    this._apiPort.onHandleGet = ({view, callback}) => {
      this._apiPort.SimpleCallback({callback, data: view.get()});
    }

    this._apiPort.onHandleToList = ({view, callback}) => {
      this._apiPort.SimpleCallback({callback, data: view.toList()});
    }

    this._apiPort.onHandleSet = ({view, data}) => view.set(data);
    this._apiPort.onHandleStore = ({view, data}) => view.store(data);
    this._apiPort.onHandleClear = ({view}) => view.clear();
    this._apiPort.onHandleRemove = ({view, data}) => view.remove(data);

    this._apiPort.onIdle = ({version, relevance}) => {
      if (version == this._idleVersion) {
        this._idlePromise = undefined;
        this._idleResolve(relevance);
      }
    }

    this._apiPort.onConstructInnerArc = ({callback, particle}) => {
      var arc = {};
      this._apiPort.ConstructArcCallback({callback, arc});
    }

    this._apiPort.onArcCreateHandle = ({callback, arc, viewType, name}) => {
      var view = this._arc.createView(viewType, name);
      this._apiPort.CreateHandleCallback(view, {viewType, name, callback, id: view.id});
    }

    this._apiPort.onArcCreateSlot = ({callback, arc, transformationParticle, transformationSlotName, hostedParticleName,  hostedSlotName}) => {
      if (this.slotComposer) {
        var hostedSlotId = this.slotComposer.createHostedSlot(transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName);
      }
      this._apiPort.CreateSlotCallback({}, {callback, hostedSlotId});
    }

    this._apiPort.onArcLoadRecipe = async ({arc, recipe, callback}) => {
      let manifest = await Manifest.parse(recipe, {loader: this._arc._loader, fileName: ''});
      let error = undefined;
      var recipe = manifest.recipes[0];
      if (recipe) {
        for (var view of recipe.views) {
          view.mapToView(this._arc.findViewById(view.id));
        }
        if (recipe.normalize()) {
          if (recipe.isResolved()) {
            this._arc.instantiate(recipe);
          } else {
            error = `Recipe is not resolvable ${recipe.toString({showUnresolved: true})}`;
          }
        } else {
          error = "Recipe could not be normalized";
        }
      } else {
        error = "No recipe defined";
      }
      this._apiPort.SimpleCallback({callback, data: error})
    }
  }

  stop() {
    this._apiPort.Stop();
  }

  get idle() {
    if (this._idlePromise == undefined) {
      this._idlePromise = new Promise((resolve, reject) => {
        this._idleResolve = resolve;
      });
    }
    this._idleVersion = this._nextIdentifier;
    this._apiPort.AwaitIdle({version: this._nextIdentifier++});
    return this._idlePromise;
  }

  get messageCount() {
    return this._apiPort.messageCount;
  }

  sendEvent(particle, slotName, event) {
    this._apiPort.UIEvent({particle, slotName, event})
  }

  instantiate(particleSpec, spec, views, lastSeenVersion) {
    views.forEach(view => {
      var version = lastSeenVersion.get(view.id) || 0;
      this._apiPort.DefineHandle(view, { viewType: view.type, name: view.name,
                                       version });
    });

    // TODO: Can we just always define the particle and map a handle for use in later
    //       calls to InstantiateParticle?
    if (spec._model._isInline) {
      this._apiPort.DefineParticle({
        particleDefinition: spec._model._inlineDefinition,
        particleFunction: spec._model._inlineUpdateFunction
      });
    }

    // TODO: rename this concept to something like instantiatedParticle, handle or registration.
    this._apiPort.InstantiateParticle(particleSpec, {spec, views});
    return particleSpec;
  }
  startRender({particle, slotName, contentTypes}) {
    this._apiPort.StartRender({particle, slotName, contentTypes});
  }
  stopRender({particle, slotName}) {
    this._apiPort.StopRender({particle, slotName});
  }
  innerArcRender(transformationParticle, transformationSlotName, hostedSlotId, content) {
    this._apiPort.InnerArcRender({transformationParticle, transformationSlotName, hostedSlotId, content})
  }
}

module.exports = OuterPEC;
