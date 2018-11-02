/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {mapStackTrace} from '../../platform/sourcemapped-stacktrace-web.js';

export class OuterPortAttachment {
  constructor(arc, devtoolsChannel) {
    this._devtoolsChannel = devtoolsChannel;
    this._arcIdString = arc.id.toString();
    this._speculative = arc.isSpeculative;
    this._callbackRegistry = {};
    this._particleRegistry = {};
  }

  handlePecMessage(name, pecMsgBody, stackString) {
    // Skip speculative and pipes arcs for now.
    if (this._arcIdString.endsWith('-pipes') || this._speculative) return;

    const stack = [];
    if (stackString) {
      // The slice discards the first two stack frames corresponding to this
      // function and the API channel function, which is already being displayed
      // in the log entry.
      mapStackTrace(stackString, mapped => mapped.slice(2).map(f => {
        // Each frame has the form '    at function (source:line:column)'.
        // Extract the function name and source:line:column text, then set up
        // a frame object with the following fields:
        //   location: text to display as the source in devtools Arcs panel
        //   target: URL to open in devtools Sources panel
        //   targetClass: CSS class specifier to attach to the location text
        const m = f.match(/^ {4}at (.*) \((.*)\)$/);
        if (m === null) return;

        const frame = {method: m[1]};
        const source = m[2].replace(/:[0-9]+$/, '');
        if (source.startsWith('http')) {
          // 'http://<url>/arcs.*/shell/file.js:150'
          // -> location: 'shell/file.js:150', target: same as source
          frame.location = source.replace(/^http.*\/arcs[^/]*\//, '');
          frame.target = source;
          frame.targetClass = 'link';
        } else if (source.startsWith('webpack')) {
          // 'webpack:///runtime/sub/file.js:18'
          // -> location: 'runtime/sub/file.js:18', target: 'webpack:///./runtime/sub/file.js:18'
          frame.location = source.slice(11);
          frame.target = `webpack:///./${frame.location}`;
          frame.targetClass = 'link';
        } else {
          // '<anonymous>' (or similar)
          frame.location = source;
          frame.target = null;
          frame.targetClass = 'noLink';
        }
        stack.push(frame);
      }), {sync: true});
    }

    this._devtoolsChannel.send({
      messageType: 'PecLog',
      messageBody: {name, pecMsgBody, timestamp: Date.now(), stack},
    });
  }

  InstantiateParticle(particle, {id, spec, handles}) {
    this._particleRegistry[id] = spec;
    this._devtoolsChannel.send({
      messageType: 'InstantiateParticle',
      messageBody: Object.assign(
        this._arcMetadata(),
        this._trimParticleSpec(id, spec, handles)
      )
    });
  }

  SimpleCallback({callback, data}) {
    const callbackDetails = this._callbackRegistry[callback];
    if (callbackDetails) {
      // Copying callback data, as the callback can be used multiple times.
      this._sendDataflowMessage(Object.assign({}, callbackDetails), data);
    }
  }

  onInitializeProxy({handle, callback}) {
    this._callbackRegistry[callback] = this._describeHandleCall(
      {operation: 'on-change', handle});
  }

  onSynchronizeProxy({handle, callback}) {
    this._callbackRegistry[callback] = this._describeHandleCall(
      {operation: 'sync-model', handle});
  }

  onHandleGet({handle, callback, particleId}) {
    this._callbackRegistry[callback] = this._describeHandleCall(
      {operation: 'get', handle, particleId});
  }

  onHandleToList({handle, callback, particleId}) {
    this._callbackRegistry[callback] = this._describeHandleCall(
      {operation: 'toList', handle, particleId});
  }

  onHandleSet({handle, data, particleId, barrier}) {
    this._logHandleCall({operation: 'set', handle, data, particleId});
  }

  onHandleStore({handle, data, particleId}) {
    this._logHandleCall({operation: 'store', handle, data, particleId});
  }

  onHandleClear({handle, particleId, barrier}) {
    this._logHandleCall({operation: 'clear', handle, particleId});
  }

  onHandleRemove({handle, data, particleId}) {
    this._logHandleCall({operation: 'remove', handle, data, particleId});
  }

  // TODO: add BigCollection stream APIs?

  _logHandleCall(args) {
    this._sendDataflowMessage(this._describeHandleCall(args), args.data);
  }

  _sendDataflowMessage(messageBody, data) {
    messageBody.data = JSON.stringify(data);
    messageBody.timestamp = Date.now();
    this._devtoolsChannel.send({messageType: 'dataflow', messageBody});
  }

  _describeHandleCall({operation, handle, particleId}) {
    const metadata = Object.assign(this._arcMetadata(), {
      operation,
      handle: this._describeHandle(handle)
    });
    if (particleId) metadata.particle = this._describeParticle(particleId);
    return metadata;
  }

  _arcMetadata() {
    return {
      arcId: this._arcIdString,
      speculative: this._speculative
    };
  }

  _trimParticleSpec(id, spec, handles) {
    const connections = {};
    spec.connectionMap.forEach((value, key) => {
      connections[key] = Object.assign({
        direction: value.direction
      }, this._describeHandle(handles.get(key)));
    });
    return {
      id,
      name: spec.name,
      connections,
      implFile: spec.implFile
    };
  }

  _describeParticle(id) {
    const particleSpec = this._particleRegistry[id];
    return {
      id,
      name: particleSpec && particleSpec.name
      // TODO: Send entire spec only once and refer to it by ID in the tool.
    };
  }

  _describeHandle(handle) {
    return {
      id: handle.id,
      storageKey: handle._storageKey,
      name: handle.name,
      description: handle.description,
      type: this._describeHandleType(handle._type)
    };
  }

  // TODO: This is fragile and incomplete. Change this into sending entire
  //       handle object once and refer back to it via its ID in the tool.
  _describeHandleType(handleType) {
    switch (handleType.constructor.name) {
      case 'Type':
        switch (handleType.tag) {
          case 'Collection': return `[${this._describeHandleType(handleType.data)}]`;
          case 'Entity': return this._describeHandleType(handleType.data);
          default: return `${handleType.tag} ${this._describeHandleType(handleType.data)}`;
        }
      case 'Schema':
        return handleType.name;
      case 'Shape':
        return 'Shape';
    }
    return '';
  }
}
