// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

const tracing = require("../tracelib/trace.js");

class Scheduler {
  constructor() {
    this.frameQueue = [];
  }

  enqueue(view, eventRecords) {
    var trace = tracing.flow({cat: 'view', name: 'ViewBase::_fire flow'}).start();
    if (this.frameQueue.length == 0)
      this._asyncProcess();
    this.frameQueue.push({view, eventRecords, trace});
  }

  _asyncProcess() {
    Promise.resolve().then(() => {
      let context = this.frameQueue.shift();
      if (this.frameQueue.length > 0)
        this._asyncProcess();
      this._applyFrame(context);
    });
  }

  _applyFrame(frameContext) {
    var trace = tracing.start({cat: 'view', name: 'applyFrame', args: {type: frameContext.view._type.key, name: frameContext.name}});
    frameContext.trace.end({args: {records: frameContext.eventRecords.length}});
    for (let record of frameContext.eventRecords) {
      frameContext.view.dispatch(record);
    }
    trace.update(frameContext.view.traceInfo());
    frameContext.view.pendingCallbackCompleted();
    trace.end();
  }
}

module.exports = new Scheduler();
