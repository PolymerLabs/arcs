/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Dictionary, Producer, Predicate} from '../utils/lib-utils.js';
import {now as nowMillis} from '../platform/date-web.js';
import {pid} from '../platform/process-web.js';
// tslint:disable: no-any

export type TraceInfo = {
  cat?: string;
  name?: string;
  overview?: boolean;
  sequence?: string;
  ts?: number;
  args?: Dictionary<any>;
};

export type TraceEvent = {
  pid?: number;
  tid?: number;
  ph: string;
  bp?: string;
  ts: number;
  dur?: number;
  cat: string;
  name: string;
  ov: boolean;
  args: Dictionary<any>;
  id?: number;
  flowId?: number;
  seq?: string;
};

export interface Trace {
  wait<T>(v: Promise<T>, info?: TraceInfo): T;
  start(info?: TraceInfo);
  addArgs(extraArgs: Dictionary<any>);
  step(info?: TraceInfo);
  end(info?: TraceInfo);
  endWith(v, info?: TraceInfo);
  id: Producer<number>;
}

export interface TracingInterface {
  enable(): void;
  now: Producer<number>;
  wrap(info: TraceInfo, fn: Function): Function;
  start(info: TraceInfo): Trace;
  flow(info: TraceInfo): Trace;
  save(): {traceEvents: TraceEvent[]};
  download(): void;
  stream(callback: (e: TraceEvent) => any, predicate?: Predicate<TraceEvent>): void;
  __clearForTests(): void;
}

const events: TraceEvent[] = [];
let flowId = 0;

function nowMicros() {
  return nowMillis() * 1000;
}

function parseInfo(info?: any) {
  if (!info) {
    return {};
  }
  if (typeof info === 'function') {
    return parseInfo(info());
  }
  if (info.toTraceInfo) {
    return parseInfo(info.toTraceInfo());
  }
  return info;
}

const streamingCallbacks: {callback: (e: TraceEvent) => any, predicate?: (e: TraceEvent) => boolean}[] = [];

function pushEvent(event: TraceEvent) {
    event.pid = pid;
    event.tid = 0;
    if (!event.args) {
      delete event.args;
    }
    if (!event.ov) {
      delete event.ov;
    }
    if (!event.cat) {
      event.cat = '';
    }
    // Only keep events in memory if we're not streaming them.
    if (streamingCallbacks.length === 0) events.push(event);
    void Promise.resolve().then(() => {
      for (const {callback, predicate} of streamingCallbacks) {
          if (!predicate || predicate(event)) callback(event);
      }
    });
}

const module_: any = {exports: {}};
// tslint:disable-next-line: variable-name
export const Tracing: TracingInterface = module_.exports;
module_.exports.enabled = false;
module_.exports.enable = () => {
  if (!module_.exports.enabled) {
    module_.exports.enabled = true;
    init();
  }
};

function init(): void {
  const result = {
    async wait<T>(v: Promise<T>) {
      return v;
    },
    start() {
      return this;
    },
    end() {
      return this;
    },
    step() {
      return this;
    },
    addArgs() {
    },
    async endWith(v) {
      return v;
    },
  };
  module_.exports.wrap = (info: TraceInfo, fn: Function) => {
    return fn;
  };
  module_.exports.start = (info: TraceInfo) => {
    return result;
  };
  module_.exports.flow = (info: TraceInfo) => {
    return result;
  };

  if (!module_.exports.enabled) {
    return;
  }

  module_.exports.wrap = (info: TraceInfo, fn: Function) => {
    return (...args) => {
      const t = module_.exports.start(info);
      try {
        return fn(...args);
      } finally {
        t.end();
      }
    };
  };

  function startSyncTrace(info: TraceInfo) {
    info = parseInfo(info);
    let args = info.args;
    const begin = nowMicros();
    return {
      addArgs(extraArgs: Dictionary<any>) {
        args = {...(args || {}), ...extraArgs};
      },
      end(endInfo: any = {}, flow) {
        endInfo = parseInfo(endInfo);
        if (endInfo.args) {
          args = {...(args || {}), ...endInfo.args};
        }
        endInfo = {...info, ...endInfo};
        this.endTs = nowMicros();
        pushEvent({
          ph: 'X',
          ts: begin,
          dur: this.endTs - begin,
          cat: endInfo.cat,
          name: endInfo.name,
          ov: endInfo.overview,
          args,
          // Arcs Devtools Specific:
          flowId: flow && flow.id(),
          seq: endInfo.sequence
        });
      },
      beginTs: begin
    } as any;
  }

  module_.exports.start = (info: TraceInfo) => {
    let trace = startSyncTrace(info);
    let flow;
    const baseInfo = {cat: info.cat, name: info.name + ' (async)', overview: info.overview, sequence: info.sequence};
    return {
      async wait<T>(v: Promise<T>, info?: TraceInfo): Promise<T> {
        const flowExisted = !!flow;
        if (!flowExisted) {
          flow = module_.exports.flow(baseInfo);
        }
        trace.end(info, flow);
        if (flowExisted) {
          flow.step({ts: trace.beginTs, ...baseInfo});
        } else {
          flow.start({ts: trace.endTs});
        }
        trace = null;
        try {
          return await v;
        } finally {
          trace = startSyncTrace(baseInfo);
        }
      },
      addArgs(extraArgs) {
        trace.addArgs(extraArgs);
      },
      end(endInfo?: TraceInfo) {
        trace.end(endInfo, flow);
        if (flow) {
          flow.end({ts: trace.beginTs});
        }
      },
      async endWith(v, endInfo: TraceInfo) {
        if (Promise.resolve(v) === v) { // If v is a promise.
          v = this.wait(v, null);
          try {
            return await v;
          } finally {
            this.end(endInfo);
          }
        } else { // If v is not a promise.
          this.end(endInfo);
          return v;
        }
      }
    };
  };
  module_.exports.flow = (info: TraceInfo) => {
    info = parseInfo(info);
    const id = flowId++;
    let started = false;
    return {
      start(startInfo?: TraceInfo) {
        const ts = (startInfo && startInfo.ts) || nowMicros();
        started = true;
        pushEvent({
          ph: 's',
          ts,
          cat: info.cat,
          name: info.name,
          ov: info.overview,
          args: info.args,
          id,
          seq: info.sequence
        });
        return this;
      },
      end(endInfo: TraceInfo) {
        if (!started) return this;
        const ts = (endInfo && endInfo.ts) || nowMicros();
        endInfo = parseInfo(endInfo);
        pushEvent({
          ph: 'f',
          bp: 'e', // binding point is enclosing slice.
          ts,
          cat: info.cat,
          name: info.name,
          ov: info.overview,
          args: endInfo && endInfo.args,
          id,
          seq: info.sequence
        });
        return this;
      },
      step(stepInfo?: TraceInfo) {
        if (!started) return this;
        const ts = (stepInfo && stepInfo.ts) || nowMicros();
        stepInfo = parseInfo(stepInfo);
        pushEvent({
          ph: 't',
          ts,
          cat: info.cat,
          name: info.name,
          ov: info.overview,
          args: stepInfo && stepInfo.args,
          id,
          seq: info.sequence
        });
        return this;
      },
      id: () => id
    };
  };
  module_.exports.save = () => {
    return {traceEvents: events};
  };
  module_.exports.download = () => {
    const a = document.createElement('a');
    a.download = 'trace.json';
    a.href = 'data:text/plain;base64,' + btoa(JSON.stringify(module_.exports.save()));
    a.click();
  };
  module_.exports.now = nowMicros;
  module_.exports.stream = (callback: (e: TraceEvent) => any, predicate: (e: TraceEvent) => boolean) => {
    // Once we start streaming we no longer keep events in memory.
    events.length = 0;
    streamingCallbacks.push({callback, predicate});
  };
  module_.exports.__clearForTests = () => {
    events.length = 0;
    streamingCallbacks.length = 0;
  };
}

init();
