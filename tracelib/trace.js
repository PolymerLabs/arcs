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

var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var zlib = require('zlib');
var options = require('./options');

var events = [];
var now = function() {
  var t = process.hrtime();
  return t[0] * 1000000 + t[1] / 1000;
}

var asyncId = 0;
var flowId = 0;

function parseInfo(info) {
  if (!info)
    return {args: {}};
  if (typeof info == 'function')
    return parseInfo(info());
  if (info.toTraceInfo)
    return parseInfo(info.toTraceInfo());
  if (info.args == undefined)
    info.args = {};
  return info;
}

var enabled = Boolean(options.traceFile);

function init() {
  module.exports.enable = function() {
    enabled = true;
    init();
  };
  module.exports.enabled = enabled;

  var result = {
    start: function() {
      return this;
    },
    update: function() {
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

  if (!enabled) {
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
    var begin = now();
    return {
      update: function(args) {
        for (var k in args) {
          info.args[k] = args[k];
        }       
      },
      end: function(endInfo) {
        var end = now();
        if (endInfo && endInfo.args) {
          for (var k in endInfo.args) {
            info.args[k] = endInfo.args[k]
          }
        }
        events.push({
          ph: 'X',
          ts: begin,
          dur: end - begin,
          cat: info.cat,
          name: info.name,
          args: info.args,
        });
      },
    };
  };
  module.exports.async = function(info) {
    info = parseInfo(info);
    var id = asyncId++;
    var begin = now();
    events.push({
      ph: 'b',
      ts: begin,
      cat: info.cat,
      name: info.name,
      args: info.args,
      id: id,
    });
    return {
      end: function(endInfo) {
        var end = now();
        endInfo = parseInfo(endInfo);
        events.push({
          ph: 'e',
          ts: end,
          cat: info.cat,
          name: info.name,
          args: endInfo && endInfo.args,
          id: id,
        });
      },
      endWrap: function(fn) {
        var self = this;
        return function() {
          self.end();
          fn.apply(this, arguments);
        }
      }
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
  module.exports.dump = function() {
    events.forEach(function(event) {
      event.pid = process.pid;
      event.tid = 0;
      if (!event.args) {
        delete event.args;
      }
      if (!event.cat) {
        event.cat = '';
      }
    });
    mkdirp.sync(path.dirname(options.traceFile));
    fs.writeFileSync(options.traceFile, JSON.stringify({
        traceEvents: events,
    }));
  };
}

init();
