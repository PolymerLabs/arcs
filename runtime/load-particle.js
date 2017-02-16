/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

var parser = require("./parser.js");
var fs = require("fs");

function loadParticle(name, arc) {

  // TODO: don't assume that the particle will be in the top-level directory
  let definition = `../${name}/${name}.ptcl`
  let data = fs.readFileSync(definition, "utf-8");
  definition = parser.parse(data);

  let clazz = `../${name}/${name}.js`
  clazz = require(clazz)[name];

  var particle = new clazz(arc);
  particle.setDefinition(definition);
  return particle;
}

exports.loadParticle = loadParticle;
