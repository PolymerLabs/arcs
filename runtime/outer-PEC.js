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

import PEC from './particle-execution-context.js';
import assert from '../platform/assert-web.js';
import {PECOuterPort} from './api-channel.js';
import Manifest from './manifest.js';

// TODO: fix
import Loader from './loader.js';

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
    };

    this._apiPort.onSynchronize = async ({handle, target, callback, modelCallback, type}) => {
      let model;
      if (handle.toList == undefined) {
        model = await handle.get();
      } else {
        model = await handle.toList();
      }
      this._apiPort.SimpleCallback({callback: modelCallback, data: model}, target);
      handle.on(type, data => this._apiPort.SimpleCallback({callback, data}), target);
    };

    this._apiPort.onHandleGet = async ({handle, callback}) => {
      this._apiPort.SimpleCallback({callback, data: await handle.get()});
    };

    this._apiPort.onHandleToList = async ({handle, callback}) => {
      this._apiPort.SimpleCallback({callback, data: await handle.toList()});
    };

    this._apiPort.onHandleSet = ({handle, data}) => {handle.set(data);};
    this._apiPort.onHandleStore = ({handle, data}) => handle.store(data);
    this._apiPort.onHandleClear = ({handle}) => handle.clear();
    this._apiPort.onHandleRemove = ({handle, data}) => handle.remove(data);

    this._apiPort.onIdle = ({version, relevance}) => {
      if (version == this._idleVersion) {
        this._idlePromise = undefined;
        this._idleResolve(relevance);
      }
    };

    this._apiPort.onConstructInnerArc = ({callback, particle}) => {
      let arc = {particle};
      this._apiPort.ConstructArcCallback({callback, arc});
    };

    this._apiPort.onArcCreateHandle = async ({callback, arc, type, name}) => {
      let handle = await this._arc.createHandle(type, name);
      this._apiPort.CreateHandleCallback(handle, {type, name, callback, id: handle.id});
    };

    this._apiPort.onArcMapHandle = async ({callback, arc, handle}) => {
      assert(this._arc.findHandleById(handle.id), `Cannot map nonexistent handle ${handle.id}`);
      // TODO: create hosted handles map with specially generated ids instead of returning the real ones?
      this._apiPort.MapHandleCallback({}, {callback, id: handle.id});
    };

    this._apiPort.onArcCreateSlot = ({callback, arc, transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName}) => {
      let hostedSlotId;
      if (this.slotComposer) {
        hostedSlotId = this.slotComposer.createHostedSlot(transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName);
      }
      this._apiPort.CreateSlotCallback({}, {callback, hostedSlotId});
    };

    this._apiPort.onArcLoadRecipe = async ({arc, recipe, callback}) => {
      let manifest = await Manifest.parse(recipe, {loader: this._arc._loader, fileName: ''});
      let error = undefined;
      let recipe0 = manifest.recipes[0];
      if (recipe0) {
        for (let handle of recipe0.views) {
          handle.mapToView(this._arc.findHandleById(handle.id));
        }
        let options = {errors: new Map()};
        if (recipe0.normalize(options)) {
          if (recipe0.isResolved()) {
            this._arc.instantiate(recipe0, arc);
          } else {
            error = `Recipe is not resolvable ${recipe0.toString({showUnresolved: true})}`;
          }
        } else {
          error = `Recipe ${recipe0.toString()} could not be normalized:\n${[...options.errors.values()].join('\n')}`;
        }
      } else {
        error = 'No recipe defined';
      }
      this._apiPort.SimpleCallback({callback, data: error});
    };
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
    this._apiPort.UIEvent({particle, slotName, event});
  }

  instantiate(particleSpec, id, spec, handles, lastSeenVersion) {
    handles.forEach(handle => {
      let version = lastSeenVersion.get(handle.id) || 0;
      this._apiPort.DefineHandle(handle, {type: handle.type.resolvedType(), name: handle.name,
                                       version});
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
    this._apiPort.InstantiateParticle(particleSpec, {id, spec, handles});
    return particleSpec;
  }
  startRender({particle, slotName, contentTypes}) {
    this._apiPort.StartRender({particle, slotName, contentTypes});
  }
  stopRender({particle, slotName}) {
    this._apiPort.StopRender({particle, slotName});
  }
  innerArcRender(transformationParticle, transformationSlotName, hostedSlotId, content) {
    this._apiPort.InnerArcRender({transformationParticle, transformationSlotName, hostedSlotId, content});
  }
  initDebug() {
    this._apiPort.initDebug(this._arc);
  }
}

export default OuterPEC;
