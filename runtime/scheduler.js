// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import tracing from "tracelib";
import assert from '../platform/assert-web.js';

class Scheduler {
  constructor() {
    this.frameQueue = [];
    this.targetMap = new Map();
    this._finishNotifiers = [];
    this._idle = Promise.resolve();
    this._idleResolver = null;
  }

  enqueue(view, eventRecords) {
    var trace = tracing.flow({cat: 'view', name: 'ViewBase::_fire flow'}).start();
    if (this.frameQueue.length == 0 && eventRecords.length > 0)
      this._asyncProcess();
    if (!this._idleResolver) {
      this._idle = new Promise((resolve, reject) => this._idleResolver = resolve);
    }
    for (var record of eventRecords) {
      var frame = this.targetMap.get(record.target);
      if (frame == undefined) {
        frame = {target: record.target, views: new Map(), traces: []};
        this.frameQueue.push(frame);
        this.targetMap.set(record.target, frame);
      }
      frame.traces.push(trace);
      var viewEvents = frame.views.get(view);
      if (viewEvents == undefined) {
        viewEvents = new Map();
        frame.views.set(view, viewEvents);
      }
      var kindEvents = viewEvents.get(record.kind);
      if (kindEvents == undefined) {
        kindEvents = [];
        viewEvents.set(record.kind, kindEvents);
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
      assert(this.frameQueue.length > 0, "_asyncProcess should not be invoked with 0 length queue");
      let frame = this.frameQueue.shift();
      this.targetMap.delete(frame.target);
      if (this.frameQueue.length > 0)
        this._asyncProcess();
      this._applyFrame(frame);
      if (this.frameQueue.length == 0) {
        this._idleResolver();
        this._idleResolver = null;
      }
    });
  }

  _applyFrame(frame) {
    var trace = tracing.start({cat: 'scheduler', name: 'Scheduler::_applyFrame', args: {target: frame.target ? frame.target.constructor.name : "NULL TARGET"}});

    var totalRecords = 0;
    for (let [view, kinds] of frame.views.entries()) {
      for (let [kind, records] of kinds.entries()) {
        var record = records[records.length - 1];
        record.callback(record.details);
      }
    }

    frame.traces.forEach(trace => trace.end());

    trace.end();
  }
}

export default new Scheduler();
