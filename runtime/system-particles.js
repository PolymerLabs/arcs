// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

var particle = require("./particle.js");
var runtime = require("./runtime.js");
let assert = require('chai').assert;

exports.Demuxer = particle.define('Demuxer(in [~a] view, out ~a singleton)', ({view}) => {  
  var list = view.asList();
  return function* () {
    for (var i = 0; i < list.length; i++)
      yield {singleton: list[i], relevance: 5};
  };
});

exports.Demuxer2 = particle.define('Demuxer2(in [~a] view1, in [~b] view2, out ~a singleton1, out ~b singleton2)', ({view1, view2}) => {
  var list1 = view1.asList();
  var list2 = view2.asList();
  return function* () {
    for (var i = 0; i < list1.length; i++) 
      for (var j = 0; j < list2.length; j++)
        yield {singleton1: list1[i], singleton2: list2[j], relevance: 5};
  };
});

exports.Choose = particle.define('Choose(in [~a] view, out ~a singleton)', async views => {
  var list = await views.get("view").toList();
  let thisParticle = this._particles.filter(p => p.spec.name=="Choose")[0];
  thisParticle.logDebug("view", views.get("view"));
  if (list.length == 0)
    return 1;
  if (list.length == 1) {
    views.get("singleton").set(list[0]);
    thisParticle.logDebug("singleton", views.get("singleton"));
    return 10;
  }
  assert(false, "Cannot choose a single element from a list.");
});

exports.SaveList = particle.define('SaveList(ephemeral in [~a] inputs, out [~a] list)', async views => {
  var inputsView = views.get('inputs');
  let thisParticle = this._particles.filter(p => p.spec.name=="SaveList")[0];
  thisParticle.logDebug("inputs", inputsView);
  var inputList = await inputsView.toList();

  var list = views.get("list");
  if (!this._watermark) {
    this._watermark = 0;
  }
  inputList.slice(this._watermark).map(a => list.store(a));
  this._watermark = inputList.length;
  thisParticle.logDebug("list", list);
});

exports.register = function(arc) {
  arc.registerParticle(exports.Demuxer);
  arc.registerParticle(exports.Demuxer2);
  arc.registerParticle(exports.Choose);
  arc.registerParticle(exports.SaveList);
};
