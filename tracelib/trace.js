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
    let t = performance.now();
    return t;
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
    wait: function(f) {
      if (f instanceof Function) {
        return f();
      }
      return f;
    },
    resume: function() {
      return this;
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
    endWrap: function(fn) {
      return fn;
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
  module.exports.dump = function() {
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
      end: function(endInfo) {
        if (endInfo && endInfo.args) {
          Object.assign(args, endInfo.args);
        }
        let end = now();
        events.push({
          ph: 'X',
          ts: begin,
          dur: end - begin,
          cat: info.cat,
          name: info.name,
          args: args,
        });
      },
    };
  };
  // TODO: perhaps this should just be the only API, it acts the same as
  //       start() when there is no call to wait/resume().
  module.exports.async = function(info) {
    let trace = module.exports.start(info);
    let flow;
    let baseInfo = {cat: info.cat, name: info.name + ' (async)'};
    let n = 0;
    return {
      async wait(v) {
        let result = await v;
        if (!flow) {
          flow = module.exports.flow(baseInfo).start();
        }
        trace.end();
        trace = null;
        return result;
      },
      resume(info) {
        if (info) {
          Object.assign(info, baseInfo);
        } else {
          info = baseInfo;
        }
        trace = module.exports.start(info);
        flow.step(baseInfo);
      },
      end(endInfo) {
        if (flow) {
          flow.end();
        }
        trace.end(endInfo);
      },
    };
  };
  module.exports.flow = function(info) {
    info = parseInfo(info);
    let id = flowId++;
    let started = false;
    return {
      start: function() {
        let begin = now();
        started = true;
        events.push({
          ph: 's',
          ts: begin,
          cat: info.cat,
          name: info.name,
          args: info.args,
          id: id,
        });
        return this;
      },
      end: function(endInfo) {
        if (!started) return;
        let end = now();
        endInfo = parseInfo(endInfo);
        events.push({
          ph: 'f',
          bp: 'e', // binding point is enclosing slice.
          ts: end,
          cat: info.cat,
          name: info.name,
          args: endInfo && endInfo.args,
          id: id,
        });
        return this;
      },
      step: function(stepInfo) {
        if (!started) return;
        let step = now();
        stepInfo = parseInfo(stepInfo);
        events.push({
          ph: 't',
          ts: step,
          cat: info.cat,
          name: info.name,
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
}

init();
