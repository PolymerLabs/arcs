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

import {Tracing} from '../tracelib/trace.js';
import {assert} from '../platform/assert-web.js';

/** @class Particle
 * A basic particle. For particles that provide UI, you may like to
 * instead use DOMParticle.
 */
export class Particle {
  constructor(capabilities) {
    this.spec = this.constructor.spec;
    if (this.spec.inputs.length == 0) {
      this.extraData = true;
    }
    this.relevances = [];
    this._idle = Promise.resolve();
    this._busy = 0;
    this._slotByName = new Map();
    this.capabilities = capabilities || {};
  }

  /** @method setHandles(handles)
   * This method is invoked with a handle for each store this particle
   * is registered to interact with, once those handles are ready for
   * interaction. Override the method to register for events from
   * the handles.
   *
   * Handles is a map from handle names to store handles.
   */
  setHandles(handles) {
  }
  
  /** @method setViews(views)
   * This method is deprecated. Use setHandles instead.
   */
  setViews(views) {
  }

  /** @method onHandleSync(handle, model)
   * Called for handles that are configured with both keepSynced and notifySync, when they are
   * updated with the full model of their data. This will occur once after setHandles() and any time
   * thereafter if the handle is resynchronized.
   *
   * handle: The Handle instance that was updated.
   * model: For Variable-backed Handles, the Entity data or null if the Variable is not set.
   *        For Collection-backed Handles, the Array of Entities, which may be empty.
   */
  onHandleSync(handle, model) {
  }

  /** @method onHandleUpdate(handle, update)
   * Called for handles that are configued with notifyUpdate, when change events are received from
   * the backing store. For handles also configured with keepSynced these events will be correctly
   * ordered, with some potential skips if a desync occurs. For handles not configured with
   * keepSynced, all change events will be passed through as they are received.
   *
   * handle: The Handle instance that was updated.
   * update: An object containing one of the following fields:
   *    data: The full Entity for a Variable-backed Handle.
   *    added: An Array of Entities added to a Collection-backed Handle.
   *    removed: An Array of Entities removed from a Collection-backed Handle.
   */
  onHandleUpdate(handle, update) {
  }

  /** @method onHandleDesync(handle)
   * Called for handles that are configured with both keepSynced and notifyDesync, when they are
   * detected as being out-of-date against the backing store. For Variables, the event that triggers
   * this will also resync the data and thus this call may usually be ignored. For Collections, the
   * underlying proxy will automatically request a full copy of the stored data to resynchronize.
   * onHandleSync will be invoked when that is received.
   *
   * handle: The Handle instance that was desynchronized.
   */
  onHandleDesync(handle) {
  }

  constructInnerArc() {
    if (!this.capabilities.constructInnerArc) {
      throw new Error('This particle is not allowed to construct inner arcs');
    }
    return this.capabilities.constructInnerArc(this);
  }

  get busy() {
    return this._busy > 0;
  }

  get idle() {
    return this._idle;
  }

  set relevance(r) {
    this.relevances.push(r);
  }

  startBusy() {
    if (this._busy == 0) {
      this._idle = new Promise(resolve => this._idleResolver = resolve);
    }
    this._busy++;
  }
  
   doneBusy() {
    this._busy--;
    if (this._busy == 0) {
      this._idleResolver();
    }
  }

  inputs() {
    return this.spec.inputs;
  }

  outputs() {
    return this.spec.outputs;
  }

  /** @method getSlot(name)
   * Returns the slot with provided name.
   */
  getSlot(name) {
    return this._slotByName.get(name);
  }

  static buildManifest(strings, ...bits) {
    let output = [];
    for (let i = 0; i < bits.length; i++) {
        let str = strings[i];
        let indent = / *$/.exec(str)[0];
        let bitStr;
        if (typeof bits[i] == 'string') {
          bitStr = bits[i];
        } else {
          bitStr = bits[i].toManifestString();
        }
        bitStr = bitStr.replace(/(\n)/g, '$1' + indent);
        output.push(str);
        output.push(bitStr);
    }
    if (strings.length > bits.length) {
      output.push(strings[strings.length - 1]);
    }
    return output.join('');
  }

  setParticleDescription(pattern) {
    return this.setDescriptionPattern('pattern', pattern);
  }
  setDescriptionPattern(connectionName, pattern) {
    let descriptions = this.handles.get('descriptions');
    if (descriptions) {
      descriptions.store(new descriptions.entityClass({key: connectionName, value: pattern}, this.spec.name + '-' + connectionName));
      return true;
    }
    return false;
  }
}
