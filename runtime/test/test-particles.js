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

exports.TestParticle = particle.define(
  'TestParticle(in Foo foo, out Bar bar) \n' +
  'Description { \n' +
  '  pattern: test particle \n' +
  '}', (map) => {
  const Bar = map.get('bar').entityClass;
  map.get('foo').get().then(result => {
    var bar = map.get('bar');
    bar.set(new bar.entityClass({value: result.value + 1}))
  });
  return 9;
});

exports.TwoInputTestParticle = particle.define('TwoInputTestParticle(in Foo foo, in Bar bar, out Far far)', map => {
  let farView = map.get('far');
  let fooView = map.get('foo');
  let barView = map.get('bar');
  farView.set(new farView.entityClass({value: fooView.get().value + ' ' + barView.get().value}));
  return 3;
});

exports.ListTestParticle = particle.define('ListTestParticle(in Bar bar, out [Far] fars)', map => {
  let barView = map.get('bar');
  let farsView = map.get('fars');
  farsView.store(new farsView.entityClass({value: barView.get().value + 1}));
  farsView.store(new farsView.entityClass({value: barView.get().value + 2}));
  return 5;
});

exports.register = function(loader) {
  loader.registerParticle(exports.TestParticle);
  loader.registerParticle(exports.TwoInputTestParticle);
  loader.registerParticle(exports.ListTestParticle);
};
