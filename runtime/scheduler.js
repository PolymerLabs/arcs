// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import {Tracing} from '../tracelib/trace.js';
import {assert} from '../platform/assert-web.js';

export class Scheduler {
  constructor() {
    this.frameQueue = [];
    this.targetMap = new Map();
    this._finishNotifiers = [];
    this._idle = Promise.resolve();
    this._idleResolver = null;
    this._idleCallbacks = [];
  }

  registerIdleCallback(callback) { this._idleCallbacks.push(callback); }

  unregisterIdleCallback(callback) {
    let index = this._idleCallbacks.indexOf(callback);
    assert(index >= 0, 'Cannot unregister nonexisted callback');
    this._idleCallbacks.splice(index, 1);
  }

  unregisterArc(arc) {
    this.targetMap.delete(arc);
    this.frameQueue = this.frameQueue.filter(frame => frame.target !== arc);
  }

  enqueue(handle, eventRecords) {
    let trace = Tracing.flow({cat: 'handle', name: 'StorageBase::_fire flow'}).start();
    if (this.frameQueue.length == 0 && eventRecords.length > 0)
      this._asyncProcess();
    if (!this._idleResolver) {
      this._idle = new Promise((resolve, reject) => this._idleResolver = resolve);
    }
    for (let record of eventRecords) {
      let frame = this.targetMap.get(record.target);
      if (frame == undefined) {
        frame = {target: record.target, handles: new Map(), traces: []};
        this.frameQueue.push(frame);
        this.targetMap.set(record.target, frame);
      }
      frame.traces.push(trace);
      let handleEvents = frame.handles.get(handle);
      if (handleEvents == undefined) {
        handleEvents = new Map();
        frame.handles.set(handle, handleEvents);
      }
      let kindEvents = handleEvents.get(record.kind);
      if (kindEvents == undefined) {
        kindEvents = [];
        handleEvents.set(record.kind, kindEvents);
      }
      kindEvents.push(record);
    }
  }

  get busy() {
    return this.frameQueue.length > 0;
  }

  get idle() {
    return this._idle;
  }

  _asyncProcess() {
    Promise.resolve().then(() => {
      assert(this.frameQueue.length > 0, '_asyncProcess should not be invoked with 0 length queue');
      let frame = this.frameQueue.shift();
      this.targetMap.delete(frame.target);
      if (this.frameQueue.length > 0)
        this._asyncProcess();
      this._applyFrame(frame);
      if (this.frameQueue.length == 0) {
        this._idleResolver();
        this._idleResolver = null;
        this._triggerIdleCallback();
      }
    });
  }

  _applyFrame(frame) {
    let trace = Tracing.start({cat: 'scheduler', name: 'Scheduler::_applyFrame', args: {target: frame.target ? frame.target.constructor.name : 'NULL TARGET'}});

    let totalRecords = 0;
    for (let [handle, kinds] of frame.handles.entries()) {
      for (let [kind, records] of kinds.entries()) {
        let record = records[records.length - 1];
        record.callback(record.details);
      }
    }

    frame.traces.forEach(trace => trace.end());

    trace.end();
  }

  _triggerIdleCallback() {
    this._idleCallbacks.forEach(callback => callback(/* pass info about what was updated */));
  }
}
