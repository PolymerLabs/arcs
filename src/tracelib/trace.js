/*
  Copyright 2015 Google Inc. All Rights Reserved.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

const events = [];
let pid;
let now;
if (typeof document == 'object') {
  pid = 42;
  now = function() {
    return performance.now() * 1000;
  };
} else {
  pid = process.pid;
  now = function() {
    const t = process.hrtime();
    return t[0] * 1000000 + t[1] / 1000;
  };
}

let flowId = 0;

function parseInfo(info) {
  if (!info) {
    return {};
  }
  if (typeof info == 'function') {
    return parseInfo(info());
  }
  if (info.toTraceInfo) {
    return parseInfo(info.toTraceInfo());
  }
  return info;
}

const streamingCallbacks = [];
function pushEvent(event) {
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
    Promise.resolve().then(() => {
      for (const {callback, predicate} of streamingCallbacks) {
          if (!predicate || predicate(event)) callback(event);
      }
    });
}

const module_ = {exports: {}};
export const Tracing = module_.exports;
module_.exports.enabled = false;
module_.exports.enable = function() {
  module_.exports.enabled = true;
  init();
};

// TODO: Add back support for options.
//module_.exports.options = options;
//var enabled = Boolean(options.traceFile);

function init() {
  const result = {
    wait: async function(v) {
      return v;
    },
    start: function() {
      return this;
    },
    end: function() {
      return this;
    },
    step: function() {
      return this;
    },
    addArgs: function() {
    },
    endWith: async function(v) {
      return v;
    },
  };
  module_.exports.wrap = function(info, fn) {
    return fn;
  };
  module_.exports.start = function(info, fn) {
    return result;
  };
  module_.exports.flow = function(info, fn) {
    return result;
  };

  if (!module_.exports.enabled) {
    return;
  }

  module_.exports.wrap = function(info, fn) {
    return function(...args) {
      const t = module_.exports.start(info);
      try {
        return fn(...args);
      } finally {
        t.end();
      }
    };
  };

  function startSyncTrace(info) {
    info = parseInfo(info);
    let args = info.args;
    const begin = now();
    return {
      addArgs: function(extraArgs) {
        args = Object.assign(args || {}, extraArgs);
      },
      end: function(endInfo = {}, flow) {
        endInfo = parseInfo(endInfo);
        if (endInfo.args) {
          args = Object.assign(args || {}, endInfo.args);
        }
        endInfo = Object.assign({}, info, endInfo);
        this.endTs = now();
        pushEvent({
          ph: 'X',
          ts: begin,
          dur: this.endTs - begin,
          cat: endInfo.cat,
          name: endInfo.name,
          ov: endInfo.overview,
          args: args,
          // Arcs Devtools Specific:
          flowId: flow && flow.id(),
          seq: endInfo.sequence
        });
      },
      beginTs: begin
    };
  }
  module_.exports.start = function(info) {
    let trace = startSyncTrace(info);
    let flow;
    const baseInfo = {cat: info.cat, name: info.name + ' (async)', overview: info.overview, sequence: info.sequence};
    return {
      async wait(v, info) {
        const flowExisted = !!flow;
        if (!flowExisted) {
          flow = module_.exports.flow(baseInfo);
        }
        trace.end(info, flow);
        if (flowExisted) {
          flow.step(Object.assign({ts: trace.beginTs}, baseInfo));
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
      end(endInfo) {
        trace.end(endInfo, flow);
        if (flow) {
          flow.end({ts: trace.beginTs});
        }
      },
      async endWith(v, endInfo) {
        if (Promise.resolve(v) === v) { // If v is a promise.
          v = this.wait(v);
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
  module_.exports.flow = function(info) {
    info = parseInfo(info);
    const id = flowId++;
    let started = false;
    return {
      start: function(startInfo) {
        const ts = (startInfo && startInfo.ts) || now();
        started = true;
        pushEvent({
          ph: 's',
          ts,
          cat: info.cat,
          name: info.name,
          ov: info.overview,
          args: info.args,
          id: id,
          seq: info.sequence
        });
        return this;
      },
      end: function(endInfo) {
        if (!started) return;
        const ts = (endInfo && endInfo.ts) || now();
        endInfo = parseInfo(endInfo);
        pushEvent({
          ph: 'f',
          bp: 'e', // binding point is enclosing slice.
          ts,
          cat: info.cat,
          name: info.name,
          ov: info.overview,
          args: endInfo && endInfo.args,
          id: id,
          seq: info.sequence
        });
        return this;
      },
      step: function(stepInfo) {
        if (!started) return;
        const ts = (stepInfo && stepInfo.ts) || now();
        stepInfo = parseInfo(stepInfo);
        pushEvent({
          ph: 't',
          ts,
          cat: info.cat,
          name: info.name,
          ov: info.overview,
          args: stepInfo && stepInfo.args,
          id: id,
          seq: info.sequence
        });
        return this;
      },
      id: () => id
    };
  };
  module_.exports.save = function() {
    return {traceEvents: events};
  };
  module_.exports.download = function() {
    const a = document.createElement('a');
    a.download = 'trace.json';
    a.href = 'data:text/plain;base64,' + btoa(JSON.stringify(module_.exports.save()));
    a.click();
  };
  module_.exports.now = now;
  module_.exports.stream = function(callback, predicate) {
    // Once we start streaming we no longer keep events in memory.
    events.length = 0;
    streamingCallbacks.push({callback, predicate});
  };
  module_.exports.__clearForTests = function() {
    events.length = 0;
    streamingCallbacks.length = 0;
  };
}

init();
