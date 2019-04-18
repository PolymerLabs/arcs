/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {BigCollection} from './handle.js';
import {Collection} from './handle.js';
import {Handle} from './handle.js';
import {HandleConnectionSpec, ParticleSpec} from './particle-spec.js';
import {Relevance} from './relevance.js';
import {SlotProxy} from './slot-proxy.js';

/**
 * A basic particle. For particles that provide UI, you may like to
 * instead use DOMParticle.
 */
export class Particle {
    public static spec: ParticleSpec;
    public spec: ParticleSpec;
    public readonly extraData: boolean;
    public readonly relevances: (Relevance | number)[] = [];
    public handles: Map<string, Handle>;

    private _idle: Promise<void> = Promise.resolve();
    private _idleResolver: (() => void);
    private _busy = 0;

    protected slotProxiesByName: Map<string, SlotProxy> = new Map();
    private readonly capabilities: {constructInnerArc?: Function};

  constructor(capabilities?: {constructInnerArc?: Function}) {
    // Typescript only sees this.constructor as a Function type.
    // TODO(shans): move spec off the constructor
    this.spec = this.constructor['spec'];
    if (this.spec.inputs.length === 0) {
      this.extraData = true;
    }
    this.capabilities = capabilities || {};
  }

  /**
   * This method is invoked with a handle for each store this particle
   * is registered to interact with, once those handles are ready for
   * interaction. Override the method to register for events from
   * the handles.
   *
   * @param handles a map from handle names to store handles.
   */
  setHandles(handles: Map<string, Handle>) {
  }

  /**
   * @deprecated Use setHandles instead.
   */
  setViews(views) {
  }

  /**
   * Called for handles that are configured with both keepSynced and notifySync, when they are
   * updated with the full model of their data. This will occur once after setHandles() and any time
   * thereafter if the handle is resynchronized.
   *
   * @param handle The Handle instance that was updated.
   * @param model For Variable-backed Handles, the Entity data or null if the Variable is not set.
   *        For Collection-backed Handles, the Array of Entities, which may be empty.
   */
  onHandleSync(handle: Handle, model) {
  }

  /**
   * Called for handles that are configued with notifyUpdate, when change events are received from
   * the backing store. For handles also configured with keepSynced these events will be correctly
   * ordered, with some potential skips if a desync occurs. For handles not configured with
   * keepSynced, all change events will be passed through as they are received.
   *
   * @param handle The Handle instance that was updated.
   * @param update An object containing one of the following fields:
   *  - data: The full Entity for a Variable-backed Handle.
   *  - oldData: The previous value of a Variable before it was updated.
   *  - added: An Array of Entities added to a Collection-backed Handle.
   *  - removed: An Array of Entities removed from a Collection-backed Handle.
   */
  // tslint:disable-next-line: no-any
  onHandleUpdate(handle: Handle, update: {data?: any, oldData?: any, added?: any, removed?: any, originator?: any}) {
  }

  /**
   * Called for handles that are configured with both keepSynced and notifyDesync, when they are
   * detected as being out-of-date against the backing store. For Variables, the event that triggers
   * this will also resync the data and thus this call may usually be ignored. For Collections, the
   * underlying proxy will automatically request a full copy of the stored data to resynchronize.
   * onHandleSync will be invoked when that is received.
   *
   * @param handle The Handle instance that was desynchronized.
   */
  onHandleDesync(handle: Handle) {
  }

  constructInnerArc() {
    if (!this.capabilities.constructInnerArc) {
      throw new Error('This particle is not allowed to construct inner arcs');
    }
    return this.capabilities.constructInnerArc(this);
  }

  get busy(): boolean {
    return this._busy > 0;
  }

  get idle(): Promise<void>  {
    return this._idle;
  }

  set relevance(r: Relevance | number) {
    this.relevances.push(r);
  }

  startBusy(): void {
    if (this._busy === 0) {
      this._idle = new Promise(resolve => this._idleResolver = resolve);
    }
    this._busy++;
  }

  doneBusy(): void {
    this._busy--;
    if (this._busy === 0) {
      this._idleResolver();
    }
  }

  inputs(): HandleConnectionSpec[] {
    return this.spec.inputs;
  }

  outputs(): HandleConnectionSpec[] {
    return this.spec.outputs;
  }

  hasSlotProxy(name: string) {
    return this.slotProxiesByName.has(name);
  }

  addSlotProxy(slotlet: SlotProxy) {
    this.slotProxiesByName.set(slotlet.slotName, slotlet);
  }

  removeSlotProxy(name: string) {
    this.slotProxiesByName.delete(name);
  }

  /**
   * Returns the slot with provided name.
   */
  getSlot(name) {
    return this.slotProxiesByName.get(name);
  }

  static buildManifest(strings: string[], ...bits): string {
    const output:string[] = [];
    for (let i = 0; i < bits.length; i++) {
        const str = strings[i];
        const indent = / *$/.exec(str)[0];
        let bitStr;
        if (typeof bits[i] === 'string') {
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

  setParticleDescription(pattern): boolean {
    return this.setDescriptionPattern('pattern', pattern);
  }

  setDescriptionPattern(connectionName: string, pattern): boolean {
    const descriptions = this.handles.get('descriptions');
    if (descriptions) {
      const entityClass = descriptions.entityClass;
      if (descriptions instanceof Collection || descriptions instanceof BigCollection) {
        descriptions.store(new entityClass({key: connectionName, value: pattern}, this.spec.name + '-' + connectionName));
      }
      return true;
    }
    throw new Error('A particle needs a description handle to set a decription pattern');
  }

  // abstract
  renderSlot(slotName: string, contentTypes: string[]) {}
  renderHostedSlot(slotName: string, hostedSlotId: string, content: string) {}
  fireEvent(slotName: string, event: {}) {}
}
