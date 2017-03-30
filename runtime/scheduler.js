// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

const tracing = require("../tracelib/trace.js");
const assert = require('assert');

class Scheduler {
  constructor() {
    this.frameQueue = [];
    this.targetMap = new Map();
    this._finishNotifiers = [];
  }

  enqueue(view, eventRecords) {
    var trace = tracing.flow({cat: 'view', name: 'ViewBase::_fire flow'}).start();
    if (this.frameQueue.length == 0 && eventRecords.length > 0)
      this._asyncProcess();
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
        viewEvents = [];
        frame.views.set(view, viewEvents);
      }
      viewEvents.push(record);
    }
  }

  finish() {
    assert(this.frameQueue.length > 0);
    return new Promise((resolve, reject) => {
      this._finishNotifiers.push(resolve);
    });
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
        this._finishNotifiers.forEach(f => f());
        this._finishNotifiers = [];
      }
    });
  }

  _applyFrame(frame) {
    var trace = tracing.start({cat: 'scheduler', name: 'Scheduler::_applyFrame', args: {target: frame.target ? frame.target.constructor.name : "NULL TARGET"}});

    var totalRecords = 0;
    for (var view of frame.views.keys()) {
      totalRecords += frame.views.get(view).length;
      for (var record of frame.views.get(view)) {
        view.dispatch(record);
      }
    }

    frame.traces.forEach(trace => trace.end({args: {records: totalRecords}}));

    trace.end();
  }
}

module.exports = new Scheduler();
