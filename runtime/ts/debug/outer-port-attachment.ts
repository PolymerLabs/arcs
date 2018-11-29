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

import {mapStackTrace} from '../../../platform/sourcemapped-stacktrace-web.js';

export class OuterPortAttachment {
  _devtoolsChannel;
  _arcIdString: string;
  _speculative: boolean;
  
  constructor(arc, devtoolsChannel) {
    this._devtoolsChannel = devtoolsChannel;
    this._arcIdString = arc.id.toString();
    this._speculative = arc.isSpeculative;
  }

  handlePecMessage(name, pecMsgBody, pecMsgCount, stackString) {
    // Skip speculative and pipes arcs for now.
    if (this._arcIdString.endsWith('-pipes') || this._speculative) return;

    const stack = this._extractStackFrames(stackString);
    this._devtoolsChannel.send({
      messageType: 'PecLog',
      messageBody: {name, pecMsgBody, pecMsgCount, timestamp: Date.now(), stack},
    });
  }

  _extractStackFrames(stackString) {
    const stack = [];
    if (!stackString) return stack;

    // File refs should appear only in stack traces generated by tests run with
    // --explore set.
    if (stackString.includes('(file:///')) {
      // The slice discards the 'Error' text and the the stack frame
      // corresponding to the API channel function, which is already being
      // displayed in the log entry.
      for (const frameString of stackString.split('\n    at ').slice(2)) {
        let match = frameString.match(/^(.*) \((.*)\)$/);
        if (match === null) {
          match = {1: '<unknown>', 2: frameString};
        }

        let location = match[2].replace(/:[0-9]+$/, '');
        if (location.startsWith('file')) {
          // 'file:///<path>/arcs.*/runtime/file.js:84'
          // -> location: 'runtime/file.js:150'
          location = location.replace(/^.*\/arcs[^/]*\//, '');
        }
        stack.push({method: match[1], location, target: null, targetClass: 'noLink'});
      }
      return stack;
    }

    // The slice discards the stack frame corresponding to the API channel
    // function, which is already being displayed in the log entry.
    mapStackTrace(stackString, mapped => mapped.slice(1).map(frameString => {
      // Each frame has the form '    at function (source:line:column)'.
      // Extract the function name and source:line:column text, then set up
      // a frame object with the following fields:
      //   location: text to display as the source in devtools Arcs panel
      //   target: URL to open in devtools Sources panel
      //   targetClass: CSS class specifier to attach to the location text
      let match = frameString.match(/^ {4}at (.*) \((.*)\)$/);
      if (match === null) {
        match = {1: '<unknown>', 2: frameString.replace(/^ *at */, '')};
      }

      const frame: {method, location?, target?, targetClass?} = {method: match[1]};
      const source = match[2].replace(/:[0-9]+$/, '');
      if (source.startsWith('http')) {
        // 'http://<url>/arcs.*/shell/file.js:150'
        // -> location: 'shell/file.js:150', target: same as source
        frame.location = source.replace(/^.*\/arcs[^/]*\//, '');
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
    }), {sync: true, cacheGlobally: true});
    return stack;
  }
}
