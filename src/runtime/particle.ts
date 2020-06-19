/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Handle} from './storageNG/handle.js';
import {Runnable, Consumer} from './hot.js';
import {InnerArcHandle} from './particle-execution-context.js';
import {HandleConnectionSpec, ParticleSpec} from './particle-spec.js';
import {Relevance} from './relevance.js';
import {Entity, EntityRawData, MutableEntityData} from './entity.js';
import {CRDTTypeRecord} from './crdt/crdt.js';
import {EntityHandleFactory} from './storageNG/entity-handle-factory.js';
import {CRDTMuxEntity} from './storageNG/storage-ng.js';

export interface Capabilities {
  constructInnerArc?: (particle: Particle) => Promise<InnerArcHandle>;
  serviceRequest?: (particle: Particle, args, callback) => void;
  // TODO(sjmiles): missing type info
  output?;
}

/**
 * A basic particle. For particles that provide UI, you may like to
 * instead use DOMParticle.
 */
export class Particle {
  public static spec: ParticleSpec;
  public spec: ParticleSpec;
  public readonly extraData: boolean;
  public readonly relevances: (Relevance | number)[] = [];
  public handles: ReadonlyMap<string, Handle<CRDTTypeRecord>>;
  public handleFactories: ReadonlyMap<string, EntityHandleFactory<CRDTMuxEntity>>;

  private _idle: Promise<void> = Promise.resolve();
  private _idleResolver: Runnable;
  private _busy = 0;
  private created: boolean;

  protected _handlesToSync: number;

  private capabilities: Capabilities;
  protected onError: Consumer<Error>;

  constructor() {
    // Typescript only sees this.constructor as a Function type.
    // TODO(shans): move spec off the constructor
    this.spec = this.constructor['spec'];
    if (this.spec && this.spec.inputs.length === 0) {
      this.extraData = true;
    }
    this.created = false;
  }

  callOnFirstStart(): void {
    if (this.created) return;
    this.created = true;
    this.onFirstStart();
  }

  /**
   * Called after handles are writable, only on first initialization of particle.
   */
  protected onFirstStart(): void {}

  callOnReady(): void {
    if (!this.created) {
      this.callOnFirstStart();
    }
    this.onReady();
  }

  setCreated(): void {
    this.created = true;
  }

  /**
   * Called after handles are synced the first time, override to provide initial processing.
   * This will be called after onFirstStart, but will not wait for onFirstStart to finish.
   */
  protected onReady(): void {}

  /**
   * This sets the capabilities for this particle.  This can only
   * be called once.
   */
  setCapabilities(capabilities: Capabilities): void {
    if (this.capabilities) {
      // Capabilities already set, throw an error.
      throw new Error('capabilities should only be set once');
    }
    this.capabilities = capabilities || {};
  }

  // tslint:disable-next-line: no-any
  protected async invokeSafely(fun: (p: this) => Promise<any>, err: Consumer<Error>) {
    try {
      this.startBusy();
      return await fun(this);
    } catch (e) {
      err(e);
    } finally {
      this.doneBusy();
    }
  }

  async callSetHandles(handles: ReadonlyMap<string, Handle<CRDTTypeRecord>>, handleFactories: ReadonlyMap<string, EntityHandleFactory<CRDTMuxEntity>>, onException: Consumer<Error>) {
    this.handles = handles;
    this.handleFactories = handleFactories;

    const allHandles = new Map<string, Handle<CRDTTypeRecord>|EntityHandleFactory<CRDTMuxEntity>>();
    this.handles.forEach((handle, name) => {allHandles.set(name, handle); });
    this.handleFactories.forEach((handleFactory, name) => {allHandles.set(name, handleFactory); });

    await this.invokeSafely(async p => p.setHandles(allHandles), onException);
    this._handlesToSync = this._countInputHandles(handles);
    this.onError = onException;
    if (!this._handlesToSync) {
      // onHandleSync is called IFF there are input handles, otherwise we are ready now
      this.callOnReady();
    }
  }

  /**
   * This method is invoked with a handle for each store this particle
   * is registered to interact with, once those handles are ready for
   * interaction. Override the method to register for events from
   * the handles.
   *
   * @param handles a map from handle names to store handles.
   */
  protected async setHandles(handles: ReadonlyMap<string, Handle<CRDTTypeRecord>|EntityHandleFactory<CRDTMuxEntity>>): Promise<void> {
  }

  private _countInputHandles(handles: ReadonlyMap<string, Handle<CRDTTypeRecord>>): number {
    let count = 0;
    for (const [name, handle] of handles) {
      if (handle.canRead) {
        count++;
      }
    }
    return count;
  }

  async callOnHandleSync(handle: Handle<CRDTTypeRecord>, model, onException: Consumer<Error>) {
    await this.invokeSafely(async p => p.onHandleSync(handle, model), onException);
    // once we've synced each readable handle, we are ready to start
    if (--this._handlesToSync === 0) {
      this.callOnReady();
    }
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
  protected async onHandleSync(handle: Handle<CRDTTypeRecord>, model): Promise<void> {
  }

  // tslint:disable-next-line: no-any
  async callOnHandleUpdate(handle: Handle<CRDTTypeRecord>, update: {data?: any, added?: any, removed?: any, originator?: any}, onException: Consumer<Error>) {
    await this.invokeSafely(async p => p.onHandleUpdate(handle, update), onException);
  }

  /**
   * Called for handles that are configured with notifyUpdate, when change events are received from
   * the backing store. For handles also configured with keepSynced these events will be correctly
   * ordered, with some potential skips if a desync occurs. For handles not configured with
   * keepSynced, all change events will be passed through as they are received.
   *
   * @param handle The Handle instance that was updated.
   * @param update An object containing one of the following fields:
   *  - data: The full Entity for a Singleton-backed Handle.
   *  - added: An Array of Entities added to a Collection-backed Handle.
   *  - removed: An Array of Entities removed from a Collection-backed Handle.
   *  - originator: whether the update originated from this particle.
   */
  // tslint:disable-next-line: no-any
  protected async onHandleUpdate(handle: Handle<CRDTTypeRecord>, update: {data?: any, added?: any, removed?: any, originator?: boolean}): Promise<void> {
  }

  async callOnHandleDesync(handle: Handle<CRDTTypeRecord>, onException: Consumer<Error>) {
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
  protected async onHandleDesync(handle: Handle<CRDTTypeRecord>): Promise<void> {
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

  /**
   * Request (outerPEC) service invocations.
   */
  async service(request) {
    if (!this.capabilities.serviceRequest) {
      console.warn(`${this.spec.name} has no service support.`);
      return null;
    }
    return new Promise(resolve => {
      this.capabilities.serviceRequest(this, request, response => resolve(response));
    });
  }

  static buildManifest(strings: string[], ...bits): string {
    const output: string[] = [];
    for (let i = 0; i < bits.length; i++) {
        const str = strings[i];
        const indent = / *$/.exec(str)[0];
        let bitStr: string;
        if (typeof bits[i] === 'string') {
          bitStr = bits[i];
        } else if (!bits[i]) {
          bitStr = '';
        } else {
          if (!bits[i].toManifestString) {
            throw new Error(`${bits[i]} doesn't have toManifestString implementation`);
          }
          bitStr = bits[i].toManifestString();
        }
        bitStr = bitStr.replace(/(\n)/g, `$1${indent}`);
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
      return true;
    }
    throw new Error('A particle needs a description handle to set a decription pattern');
  }

  // Entity functions.
  idFor(entity: Entity): string {
    return Entity.id(entity);
  }

  dataClone(entity: Entity): EntityRawData {
    return Entity.dataClone(entity);
  }

  mutate(entity: Entity, mutation: Consumer<MutableEntityData> | {}): void {
    Entity.mutate(entity, mutation);
  }

  // render path
  output(content) {
    const {output} = this.capabilities;
    if (output) {
      output(this, content);
    }
  }

  // abstract
  fireEvent(slotName: string, event: {}): void {}
}
