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

//var fs = require('fs');
//var mkdirp = require('mkdirp');
//var path = require('path');
//var options = require('./options');

var events = [];
if (typeof document == 'object') {
  var pid = 42;
  var now = function() {
    var t = performance.now();
    return t;
  }
} else {
  var pid = process.pid;
  var now = function() {
    var t = process.hrtime();
    return t[0] * 1000000 + t[1] / 1000;
  }
}

var flowId = 0;

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
//module.exports.options = options;
//var enabled = Boolean(options.traceFile);

function init() {
  var result = {
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
    return function() {
      var t = module.exports.start(info);
      try {
        return fn.apply(this, arguments);
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
        var end = now();
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
        let result;
        if (v instanceof Promise) {
          result = f;
        } else {
          result = v();
        }
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
    var id = flowId++;
    var started = false;
    return {
      start: function() {
        var begin = now();
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
        var end = now();
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
        var step = now();
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
  module.exports.dump = function() {
    mkdirp.sync(path.dirname(options.traceFile));
    fs.writeFileSync(options.traceFile, module.exports.save());
  };
  module.exports.download = function() {
    let a = document.createElement('a');
    a.download = 'trace.json';
    a.href = 'data:text/plain;base64,' + btoa(JSON.stringify(module.exports.save()));
    a.click();
  };
}

init();
