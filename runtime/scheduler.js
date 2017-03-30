// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

const tracing = require("../tracelib/trace.js");

class FrameContext {
  constructor(listenerMap, view, details, trace) {
    this.listeners = Array.from(listenerMap.keys());
    this.listenerVersions = listenerMap;
    this.view = view;
    this.details = details;
    this.trace = trace;
  }
}

class Scheduler {
  constructor() {
    this.frameQueue = [];
  }

  enqueue(listenerMap, view, details) {
    var trace = tracing.flow({cat: 'view', name: 'ViewBase::_fire flow'}).start();
    if (this.frameQueue.length == 0)
      this.asyncProcess();
    this.frameQueue.push(new FrameContext(listenerMap, view, details, trace));
  }

  asyncProcess() {
    Promise.resolve().then(() => {
      let context = this.frameQueue.shift();
      if (this.frameQueue.length > 0)
        this.asyncProcess();
      this.applyFrame(context);
    });
  }

  applyFrame(frameContext) {
    var trace = tracing.start({cat: 'view', name: 'applyFrame', args: {type: frameContext.view._type.key, name: frameContext.name}});
    frameContext.trace.end({args: {listeners: frameContext.listeners.length}});
    for (let listener of frameContext.listeners) {
      let version = frameContext.listenerVersions.get(listener);
      if (version < frameContext.view._version) {
        frameContext.listenerVersions.set(listener, frameContext.view._version);
        listener(frameContext.view, frameContext.details);
      }
    }
    trace.update(frameContext.view.traceInfo());
    frameContext.view.pendingCallbackCompleted();
    trace.end();
  }
}

module.exports = new Scheduler();