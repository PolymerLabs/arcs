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

import fs from '../platform/fs-web.js';

let events = [];
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
    let t = process.hrtime();
    return t[0] * 1000000 + t[1] / 1000;
  };
}

let flowId = 0;

function parseInfo(info) {
  if (!info)
    return {};
  if (typeof info == 'function')
    return parseInfo(info());
  if (info.toTraceInfo)
    return parseInfo(info.toTraceInfo());
  return info;
}

let streamingCallbacks = [];
function pushEvent(e) {
  events.push(e);
  for (let {callback, predicate} of streamingCallbacks) {
    Promise.resolve().then(() => {
      if (!predicate || predicate(e)) callback(e);
    });
  }
}

let module = {exports: {}};
export default module.exports;
module.exports.enabled = false;
module.exports.enable = function() {
  module.exports.enabled = true;
  init();
};

// TODO: Add back support for options.
//module.exports.options = options;
//var enabled = Boolean(options.traceFile);

function init() {
  let result = {
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
  module.exports.wrap = function(info, fn) {
    return fn;
  };
  module.exports.start = function(info, fn) {
    return result;
  };
  module.exports.async = function(info, fn) {
    return result;
  };
  module.exports.flow = function(info, fn) {
    return result;
  };

  if (!module.exports.enabled) {
    return;
  }

  module.exports.wrap = function(info, fn) {
    return function(...args) {
      let t = module.exports.start(info);
      try {
        return fn(...args);
      } finally {
        t.end();
      }
    };
  };
  module.exports.start = function(info) {
    info = parseInfo(info);
    let args = info.args || {};
    let begin = now();
    return {
      addArgs: function(extraInfo) {
        Object.assign(args, extraInfo);
      },
      end: function(endInfo) {
        if (endInfo && endInfo.args) {
          Object.assign(args, endInfo.args);
        }
        let end = now();
        pushEvent({
          ph: 'X',
          ts: begin,
          dur: end - begin,
          cat: info.cat,
          name: info.name,
          ov: info.overview,
          args: args,
        });
      },
      // TODO(piotrs): Clean up on when merging async() and start() APIs.
      ts: begin
    };
  };
  // TODO: perhaps this should just be the only API, it acts the same as
  //       start() when there is no call to wait().
  module.exports.async = function(info) {
    let trace = module.exports.start(info);
    let flow;
    let baseInfo = {cat: info.cat, name: info.name + ' (async)', overview: info.overview};
    return {
      async wait(v, info) {
        if (!flow) {
          // Use start time of the first trace as timestamp to for flow start,
          // to display a range encompassing all duration events in devtools.
          flow = module.exports.flow(Object.assign({ts: trace.ts}, baseInfo)).start();
        }
        trace.end(info);
        trace = null;
        try {
          return await v;
        } finally {
          trace = module.exports.start(baseInfo);
          flow.step(baseInfo);
        }
      },
      addArgs(info) {
        trace.addArgs(info);
      },
      end(endInfo) {
        if (flow) {
          flow.end();
        }
        trace.end(endInfo);
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
  module.exports.flow = function(info) {
    info = parseInfo(info);
    let id = flowId++;
    let started = false;
    return {
      start: function() {
        let begin = info.ts || now();
        started = true;
        pushEvent({
          ph: 's',
          ts: begin,
          cat: info.cat,
          name: info.name,
          ov: info.overview,
          args: info.args,
          id: id,
        });
        return this;
      },
      end: function(endInfo) {
        if (!started) return;
        let end = now();
        endInfo = parseInfo(endInfo);
        pushEvent({
          ph: 'f',
          bp: 'e', // binding point is enclosing slice.
          ts: end,
          cat: info.cat,
          name: info.name,
          ov: info.overview,
          args: endInfo && endInfo.args,
          id: id,
        });
        return this;
      },
      step: function(stepInfo) {
        if (!started) return;
        let step = now();
        stepInfo = parseInfo(stepInfo);
        pushEvent({
          ph: 't',
          ts: step,
          cat: info.cat,
          name: info.name,
          ov: info.overview,
          args: stepInfo && stepInfo.args,
          id: id,
        });
        return this;
      },
    };
  };
  module.exports.save = function() {
    events.forEach(function(event) {
      event.pid = pid;
      event.tid = 0;
      if (!event.args) {
        delete event.args;
      }
      if (!event.cat) {
        event.cat = '';
      }
    });
    return {traceEvents: events};
  };
  module.exports.download = function() {
    let a = document.createElement('a');
    a.download = 'trace.json';
    a.href = 'data:text/plain;base64,' + btoa(JSON.stringify(module.exports.save()));
    a.click();
  };
  module.exports.now = now;
  module.exports.stream = function(callback, predicate) {
    streamingCallbacks.push({callback, predicate});
  };
}

init();
