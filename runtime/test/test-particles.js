/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

var particle = require("../particle.js");
var runtime = require("../runtime.js");
var testEntities = require("./test-entities.js");

exports.TestParticle = particle.define('TestParticle(in Foo foo, out Bar bar)', (map) => {
  const Bar = loader.loadEntity("Bar");
  map.get('foo').get().then(result => {
    var bar = map.get('bar');
    bar.set(new bar.entityClass({value: result.value + 1}))
  });
  return 9;
});

exports.TwoInputTestParticle = particle.define('TwoInputTestParticle(in Foo foo, in Bar bar, out Far far)', map => {
  map.get('far').set(new testEntities.Far({value: map.get('foo').get().value + ' ' + map.get('bar').get().value}));
  return 3;
});

exports.register = function(scope) {
  scope.registerParticle(exports.TestParticle);
  scope.registerParticle(exports.TwoInputTestParticle);
};
