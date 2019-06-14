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
import {Runnable, Consumer} from './hot.js';
import {InnerArcHandle} from './particle-execution-context.js';
import {HandleConnectionSpec, ParticleSpec} from './particle-spec.js';
import {Relevance} from './relevance.js';
import {SlotProxy} from './slot-proxy.js';
import {UserException} from './arc-exceptions.js';

/**
 * A basic particle. For particles that provide UI, you may like to
 * instead use DOMParticle.
 */
export class Particle {
  public static spec: ParticleSpec;
  public spec: ParticleSpec;
  public readonly extraData: boolean;
  public readonly relevances: (Relevance | number)[] = [];
  public handles: ReadonlyMap<string, Handle>;

  private _idle: Promise<void> = Promise.resolve();
  private _idleResolver: Runnable;
  private _busy = 0;

  protected slotProxiesByName: Map<string, SlotProxy> = new Map();
  private capabilities: {constructInnerArc?: (particle: Particle) => Promise<InnerArcHandle>};

  constructor() {
    // Typescript only sees this.constructor as a Function type.
    // TODO(shans): move spec off the constructor
    this.spec = this.constructor['spec'];
    if (this.spec.inputs.length === 0) {
      this.extraData = true;
    }
  }

  /**
   * This sets the capabilities for this particle.  This can only
   * be called once.
   */
  setCapabilities(capabilities: {constructInnerArc?: (particle: Particle) => Promise<InnerArcHandle>}): void {
    if (this.capabilities) {
      // Capabilities already set, throw an error.
      throw new Error('capabilities should only be set once');
    }
    this.capabilities = capabilities || {};
  }

  private async invokeSafely(fun: (p: this) => Promise<void>, err: Consumer<Error>) {
    try {
      this.startBusy();
      await fun(this);
    } catch (e) {
      err(e);
    } finally {
      this.doneBusy();
    }
  }

  async callSetHandles(handles: ReadonlyMap<string, Handle>, onException: Consumer<Error>) {
    await this.invokeSafely(async p => p.setHandles(handles), onException);
  }

  /**
   * This method is invoked with a handle for each store this particle
   * is registered to interact with, once those handles are ready for
   * interaction. Override the method to register for events from
   * the handles.
   *
   * @param handles a map from handle names to store handles.
   */
  protected async setHandles(handles: ReadonlyMap<string, Handle>): Promise<void> {
  }

  async callOnHandleSync(handle: Handle, model, onException: Consumer<Error>) {
    await this.invokeSafely(async p => p.onHandleSync(handle, model), onException);
  }

  /**
   * Called for handles that are configured with both keepSynced and notifySync, when they are
   * updated with the full model of their data. This will occur once after setHandles() and any time
   * thereafter if the handle is resynchronized.
   *
   * @param handle The Handle instance that was updated.
   * @param model For Singleton-backed Handles, the Entity data or null if the Singleton is not set.
   *        For Collection-backed Handles, the Array of Entities, which may be empty.
   */
  protected async onHandleSync(handle: Handle, model): Promise<void> {
  }

  // tslint:disable-next-line: no-any
  async callOnHandleUpdate(handle: Handle, update: {data?: any, oldData?: any, added?: any, removed?: any, originator?: any}, onException: Consumer<Error>) {
    await this.invokeSafely(async p => p.onHandleUpdate(handle, update), onException);
  }

  /**
   * Called for handles that are configued with notifyUpdate, when change events are received from
   * the backing store. For handles also configured with keepSynced these events will be correctly
   * ordered, with some potential skips if a desync occurs. For handles not configured with
   * keepSynced, all change events will be passed through as they are received.
   *
   * @param handle The Handle instance that was updated.
   * @param update An object containing one of the following fields:
   *  - data: The full Entity for a Singleton-backed Handle.
   *  - oldData: The previous value of a Singleton before it was updated.
   *  - added: An Array of Entities added to a Collection-backed Handle.
   *  - removed: An Array of Entities removed from a Collection-backed Handle.
   */
  // tslint:disable-next-line: no-any
  protected async onHandleUpdate(handle: Handle, update: {data?: any, oldData?: any, added?: any, removed?: any, originator?: any}): Promise<void> {
  }

  async callOnHandleDesync(handle: Handle, onException: Consumer<Error>) {
    await this.invokeSafely(async p => p.onHandleDesync(handle), onException);
  }

  /**
   * Called for handles that are configured with both keepSynced and notifyDesync, when they are
   * detected as being out-of-date against the backing store. For Singletons, the event that triggers
   * this will also resync the data and thus this call may usually be ignored. For Collections, the
   * underlying proxy will automatically request a full copy of the stored data to resynchronize.
   * onHandleSync will be invoked when that is received.
   *
   * @param handle The Handle instance that was desynchronized.
   */
  protected async onHandleDesync(handle: Handle): Promise<void> {
  }

  async constructInnerArc(): Promise<InnerArcHandle> {
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
      this._idle = new Promise(resolve => this._idleResolver = () => resolve());
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

  hasSlotProxy(name: string): boolean {
    return this.slotProxiesByName.has(name);
  }

  addSlotProxy(slotlet: SlotProxy): void {
    this.slotProxiesByName.set(slotlet.slotName, slotlet);
  }

  removeSlotProxy(name: string): void {
    this.slotProxiesByName.delete(name);
  }

  /**
   * Request (outerPEC) service invocations.
   */
  // TODO(sjmiles): experimental services impl
  async service(request) {
    if (!this.capabilities['serviceRequest']) {
      console.warn(`${this.spec.name} has no service support.`);
      return null;
    }
    return new Promise(resolve => {
      this.capabilities['serviceRequest'](this, request, response => resolve(response));
    });
  }

  /**
   * Returns the slot with provided name.
   */
  getSlot(name: string): SlotProxy {
    return this.slotProxiesByName.get(name);
  }

  static buildManifest(strings: string[], ...bits): string {
    const output: string[] = [];
    for (let i = 0; i < bits.length; i++) {
        const str = strings[i];
        const indent = / *$/.exec(str)[0];
        let bitStr: string;
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

  async setParticleDescription(pattern): Promise<boolean> {
    return this.setDescriptionPattern('pattern', pattern);
  }

  async setDescriptionPattern(connectionName: string, pattern): Promise<boolean> {
    const descriptions = this.handles.get('descriptions');
    if (descriptions) {
      const entityClass = descriptions.entityClass;
      if (descriptions instanceof Collection || descriptions instanceof BigCollection) {
        await descriptions.store(new entityClass({key: connectionName, value: pattern}, this.spec.name + '-' + connectionName));
      }
      return true;
    }
    throw new Error('A particle needs a description handle to set a decription pattern');
  }

  // abstract
  renderSlot(slotName: string, contentTypes: string[]): void {}
  renderHostedSlot(slotName: string, hostedSlotId: string, content: string): void {}
  fireEvent(slotName: string, event: {}): void {}
}
