/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Tracing} from '../../tracelib/trace.js';

let streamingToDevtools = false;

export function enableTracingAdapter(devtoolsChannel) {
  if (!streamingToDevtools) {
    if (!Tracing.enabled) Tracing.enable();

    devtoolsChannel.send({
      messageType: 'trace-time-sync',
      messageBody: {
        traceTime: Tracing.now(),
        localTime: Date.now()
      }
    });

    Tracing.stream(
      trace => devtoolsChannel.send({
        messageType: 'trace',
        messageBody: trace
      }),
      trace => trace.ov // Overview events only.
    );

    streamingToDevtools = true;
  }
}
